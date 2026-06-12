import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { join } from 'path';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

interface ResetPasswordDto {
  email: string;
  code: string;
  password: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient = new OAuth2Client();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email.trim().toLowerCase());

    if (user) {
      const isMatch = await bcrypt.compare(pass, user.password);
      if (isMatch) {
        const { password, ...result } = user;
        return result;
      }
    }

    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, id: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(dto: any) {
    const email = String(dto.email || '').trim().toLowerCase();
    const username = String(dto.username || '').trim().replace(/^@/, '').toLowerCase();
    const displayName = String(dto.name || dto.displayName || '').trim();
    const password = String(dto.password || '');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Formato de email invalido.');
    }

    if (!displayName || !username || !password) {
      throw new BadRequestException('Nome, username, email e senha sao obrigatorios.');
    }

    if (password.length < 6) {
      throw new BadRequestException('Senha deve ter no minimo 6 caracteres.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return this.usersService.create({
      username,
      name: displayName,
      email,
      passwordHash,
    });
  }

  private getGoogleClientIds() {
    const rawIds = [
      process.env.GOOGLE_WEB_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_CLIENT_IDS,
    ]
      .filter(Boolean)
      .join(',');

    return rawIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  private sanitizeGoogleUsername(value: string) {
    const clean = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/[^a-z0-9._]/g, '')
      .replace(/[.]{2,}/g, '.')
      .slice(0, 22);

    return clean || 'musionuser';
  }

  private async buildUniqueGoogleUsername(baseValue: string) {
    const base = this.sanitizeGoogleUsername(baseValue);

    for (let index = 0; index < 40; index++) {
      const suffix = index === 0 ? '' : String(index);
      const username = `${base}${suffix}`.slice(0, 28);
      const exists = await this.prisma.user.findUnique({ where: { username } });

      if (!exists) return username;
    }

    return `${base.slice(0, 18)}${Date.now().toString().slice(-6)}`;
  }

  private withoutPassword(user: any) {
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async googleLogin(idToken: string) {
    const cleanToken = String(idToken || '').trim();
    const audiences = this.getGoogleClientIds();

    if (!cleanToken) {
      throw new BadRequestException('Token do Google e obrigatorio.');
    }

    if (!audiences.length) {
      throw new BadRequestException(
        'Login com Google nao configurado. Configure GOOGLE_WEB_CLIENT_ID no backend.',
      );
    }

    let ticket;

    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken: cleanToken,
        audience: audiences,
      });
    } catch (error) {
      const verifyMessage = error instanceof Error ? error.message : String(error);
      console.error('Falha ao validar token do Google:', verifyMessage);

      if (process.env.NODE_ENV !== 'production') {
        throw new UnauthorizedException(`Token do Google invalido: ${verifyMessage}`);
      }

      throw new UnauthorizedException('Token do Google invalido.');
    }

    const payload = ticket.getPayload();
    const email = String(payload?.email || '').trim().toLowerCase();
    const emailVerified = payload?.email_verified === true || payload?.email_verified === 'true';

    if (!email || !emailVerified) {
      throw new UnauthorizedException('Email do Google nao verificado.');
    }

    const displayName = String(payload?.name || email.split('@')[0] || 'Usuario').trim();
    const avatarUrl = String(payload?.picture || '').trim();

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      const username = await this.buildUniqueGoogleUsername(email.split('@')[0]);
      const passwordHash = await bcrypt.hash(`google:${payload?.sub}:${randomBytes(16).toString('hex')}`, 10);

      user = await this.prisma.user.create({
        data: {
          email,
          username,
          displayName,
          avatarUrl: avatarUrl || null,
          password: passwordHash,
        },
      });
    } else if (!user.avatarUrl && avatarUrl) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl },
      });
    }

    return this.login(this.withoutPassword(user));
  }

  private isSmtpConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  private async sendPasswordResetEmail(email: string, code: string) {
    if (!this.isSmtpConfigured()) return false;

    const logoPath = join(process.cwd(), '..', 'musion-mobile', 'assets', 'musionlogo.png');
    const hasLogo = existsSync(logoPath);
    const logoHtml = hasLogo
      ? '<img src="cid:musion-logo" width="168" alt="Musion" style="display:block;width:168px;max-width:168px;height:auto;border:0;outline:none;text-decoration:none;" />'
      : '<div style="font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:38px;font-weight:400;color:#DEE0E8;letter-spacing:1px;">Musion</div>';

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Seu codigo de redefinicao - Musion',
        text: [
          'Musion',
          '',
          `Seu codigo de redefinicao de senha e ${code}.`,
          'Ele expira em 15 minutos.',
          'Se voce nao solicitou isso, ignore este email.',
        ].join('\n'),
        attachments: hasLogo
          ? [
              {
                filename: 'musionlogo.png',
                path: logoPath,
                cid: 'musion-logo',
              },
            ]
          : [],
        html: `
          <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">
            Use este codigo para redefinir sua senha no Musion: ${code}
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0;padding:0;background:#18191D;">
            <tr>
              <td align="center" style="padding:34px 14px;background:#18191D;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#15161A;border:1px solid #DEE0E8;border-radius:18px;overflow:hidden;box-shadow:0 0 34px rgba(222,224,232,0.22);">
                  <tr>
                    <td style="padding:28px 28px 12px 28px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="left">
                            ${logoHtml}
                          </td>
                          <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:rgba(222,224,232,0.56);font-weight:700;">
                            Seguranca
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 28px 6px 28px;font-family:Arial,Helvetica,sans-serif;">
                      <h1 style="margin:0;color:#DEE0E8;font-size:28px;line-height:34px;font-weight:800;letter-spacing:0;">
                        Redefinicao de senha
                      </h1>
                      <p style="margin:14px 0 0 0;color:rgba(222,224,232,0.72);font-size:16px;line-height:24px;">
                        Use o codigo abaixo no app para criar uma nova senha. Ele expira em 15 minutos.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:24px 28px 24px 28px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:360px;background:#18191D;border:1.5px solid rgba(222,224,232,0.46);border-radius:14px;box-shadow:0 0 30px rgba(222,224,232,0.20);">
                        <tr>
                          <td align="center" style="padding:24px 18px 22px 18px;">
                            <div style="font-family:Arial,Helvetica,sans-serif;color:rgba(222,224,232,0.54);font-size:12px;line-height:16px;text-transform:uppercase;font-weight:800;letter-spacing:2px;margin-bottom:10px;">
                          Codigo
                            </div>
                            <div style="font-family:Arial,Helvetica,sans-serif;color:#DEE0E8;font-size:42px;line-height:48px;font-weight:800;letter-spacing:9px;text-align:center;">
                              ${code}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 28px 30px 28px;font-family:Arial,Helvetica,sans-serif;">
                      <p style="margin:0;color:rgba(222,224,232,0.62);font-size:14px;line-height:22px;">
                        Se voce nao solicitou essa redefinicao, pode ignorar este email com seguranca.
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="max-width:560px;margin:18px auto 0 auto;font-family:Arial,Helvetica,sans-serif;color:rgba(222,224,232,0.42);font-size:12px;line-height:18px;text-align:center;">
                  Este email foi enviado automaticamente pelo Musion.
                </p>
              </td>
            </tr>
          </table>
        `,
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao enviar email de redefinicao para ${email}: ${message}`);
      return false;
    }
  }

  async forgotPassword(emailInput: string) {
    const email = String(emailInput || '').trim().toLowerCase();
    const message = 'Se esse email estiver cadastrado, enviaremos as instrucoes.';

    if (!email) {
      throw new BadRequestException('Email e obrigatorio.');
    }

    const user = await this.usersService.findOne(email);
    if (!user) {
      return { message };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.usersService.savePasswordReset(user.id, codeHash, expiresAt);
    const emailSent = await this.sendPasswordResetEmail(email, code);

    return {
      message: emailSent ? 'Enviamos um codigo de redefinicao para seu email.' : message,
      resetCode: emailSent || process.env.NODE_ENV === 'production' ? undefined : code,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = String(dto.email || '').trim().toLowerCase();
    const code = String(dto.code || '').trim();
    const password = String(dto.password || '');

    if (!email || !code || !password) {
      throw new BadRequestException('Email, codigo e nova senha sao obrigatorios.');
    }

    if (password.length < 6) {
      throw new BadRequestException('Senha deve ter no minimo 6 caracteres.');
    }

    const resetData = await this.usersService.findPasswordReset(email);

    if (!resetData?.passwordResetToken || !resetData?.passwordResetExpires) {
      throw new BadRequestException('Codigo invalido ou expirado.');
    }

    if (new Date(resetData.passwordResetExpires).getTime() < Date.now()) {
      throw new BadRequestException('Codigo expirado. Solicite um novo.');
    }

    const codeMatches = await bcrypt.compare(code, resetData.passwordResetToken);
    if (!codeMatches) {
      throw new UnauthorizedException('Codigo invalido.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.usersService.updatePassword(resetData.id, passwordHash);

    return { message: 'Senha redefinida com sucesso.' };
  }
}

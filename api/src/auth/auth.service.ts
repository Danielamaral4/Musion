import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';

interface ResetPasswordDto {
  email: string;
  code: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
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
    const payload = { username: user.username, sub: user.id, id: user.id };

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

    return {
      message,
      resetCode: process.env.NODE_ENV === 'production' ? undefined : code,
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

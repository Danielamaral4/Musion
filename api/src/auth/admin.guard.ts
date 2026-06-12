import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const userId = Number(request.user?.id || request.user?.sub);

    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Acesso restrito a administradores.');
    }

    if (this.isEnvAdmin(userId) || request.user?.role === 'ADMIN') {
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'ADMIN') {
      return true;
    }

    throw new UnauthorizedException('Acesso restrito a administradores.');
  }

  private isEnvAdmin(userId: number) {
    return String(process.env.MODERATION_ADMIN_USER_IDS || '')
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id))
      .includes(userId);
  }
}

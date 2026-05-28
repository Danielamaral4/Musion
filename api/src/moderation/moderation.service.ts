import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from '../dto/create-report.dto';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async getBlockedConnectionIds(userId: number) {
    const rows = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedId: userId },
        ],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });

    return Array.from(
      new Set(
        rows.map((row) =>
          row.blockerId === userId ? row.blockedId : row.blockerId
        )
      )
    );
  }

  async isBlockedBetween(firstUserId: number, secondUserId: number) {
    if (!firstUserId || !secondUserId || firstUserId === secondUserId) {
      return false;
    }

    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: firstUserId, blockedId: secondUserId },
          { blockerId: secondUserId, blockedId: firstUserId },
        ],
      },
      select: { id: true },
    });

    return !!block;
  }

  async getBlockStatus(currentUserId: number, targetUserId: number) {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      return { isBlocked: false, blockedMe: false };
    }

    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: currentUserId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: currentUserId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });

    return {
      isBlocked: blocks.some(
        (block) => block.blockerId === currentUserId && block.blockedId === targetUserId
      ),
      blockedMe: blocks.some(
        (block) => block.blockerId === targetUserId && block.blockedId === currentUserId
      ),
    };
  }

  async blockUser(blockerId: number, blockedId: number) {
    if (blockerId === blockedId) {
      throw new BadRequestException('Voce nao pode bloquear a si mesmo.');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });

    if (!target) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    await this.prisma.$transaction([
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      }),
      this.prisma.userBlock.upsert({
        where: {
          blockerId_blockedId: { blockerId, blockedId },
        },
        update: {},
        create: { blockerId, blockedId },
      }),
    ]);

    return { blocked: true, user: target };
  }

  async unblockUser(blockerId: number, blockedId: number) {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });

    return { blocked: false };
  }

  async listBlockedUsers(userId: number) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return blocks.map((block) => ({
      id: block.id,
      createdAt: block.createdAt,
      user: block.blocked,
    }));
  }

  async createReport(reporterId: number, dto: CreateReportDto) {
    const normalizedReason = dto.reason.trim().slice(0, 50);
    const details = dto.details?.trim() || null;
    const targetUserId = await this.resolveTargetUserId(dto.targetType, dto.targetId);

    if (targetUserId === reporterId && dto.targetType === 'USER') {
      throw new BadRequestException('Voce nao pode denunciar a si mesmo.');
    }

    const report = await this.prisma.report.upsert({
      where: {
        reporterId_targetType_targetId: {
          reporterId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
      update: {
        reason: normalizedReason,
        details,
        status: 'PENDING',
        reviewedAt: null,
      },
      create: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        targetUserId,
        reason: normalizedReason,
        details,
      },
    });

    return {
      id: report.id,
      status: report.status,
      message: 'Denuncia registrada. Obrigado por ajudar a manter o Musion seguro.',
    };
  }

  async listReports(status = 'PENDING') {
    return this.prisma.report.findMany({
      where: status === 'ALL' ? undefined : { status },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, username: true, displayName: true },
        },
        targetUser: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      take: 100,
    });
  }

  async updateReportStatus(reportId: number, status: string) {
    if (!['PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED'].includes(status)) {
      throw new BadRequestException('Status invalido.');
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        reviewedAt: status === 'PENDING' ? null : new Date(),
      },
    });
  }

  private async resolveTargetUserId(targetType: string, targetId: number) {
    if (targetType === 'USER') {
      const user = await this.prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true },
      });

      if (!user) throw new NotFoundException('Usuario denunciado nao encontrado.');
      return user.id;
    }

    if (targetType === 'REVIEW') {
      const review = await this.prisma.review.findUnique({
        where: { id: targetId },
        select: { userId: true },
      });

      if (!review) throw new NotFoundException('Review denunciada nao encontrada.');
      return review.userId;
    }

    if (targetType === 'COMMENT') {
      const comment = await this.prisma.comment.findUnique({
        where: { id: targetId },
        select: { userId: true },
      });

      if (!comment) throw new NotFoundException('Comentario denunciado nao encontrado.');
      return comment.userId;
    }

    throw new BadRequestException('Tipo de denuncia invalido.');
  }
}

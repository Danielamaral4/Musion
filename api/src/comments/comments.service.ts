import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private moderationService: ModerationService,
  ) {}

  // 1. Criar comentário
  async create(reviewId: number, userId: number, dto: CreateCommentDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review não encontrada.');
    }

    const isBlocked = await this.moderationService.isBlockedBetween(userId, review.userId);
    if (isBlocked) {
      throw new BadRequestException('Nao e possivel comentar nesta review.');
    }

    const comment = await this.prisma.comment.create({
      data: {
        text: dto.text,
        userId: userId,
        reviewId: reviewId,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Dispara a notificação se o dono da review for diferente de quem comentou
    if (review.userId !== userId) {
      await this.notificationsService.createNotification(
        review.userId,     
        userId,            
        'COMMENT',         
        reviewId,          
        review.albumName,  
        comment.id         
      );
    }

    return { ...comment, isMine: true };
  }

  // 2. Buscar todos os comentários de uma review
  async findAllByReview(reviewId: number, currentUserId: number) {
    const blockedConnectionIds = await this.moderationService.getBlockedConnectionIds(currentUserId);

    return this.prisma.comment.findMany({
      where: {
        reviewId,
        userId: { notIn: blockedConnectionIds },
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' }, 
    });
  }

  // 3. Deletar um comentário
  async remove(id: number, userId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        review: {
          select: { userId: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado.');
    }

    if (comment.userId !== userId && comment.review.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para deletar este comentário.');
    }

    return this.prisma.comment.delete({
      where: { id },
    });
  }
}

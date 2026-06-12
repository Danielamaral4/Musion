import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { ModerationService } from '../moderation/moderation.service';


@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private moderationService: ModerationService
  ) {}

  // Cria o review salvando todos os dados do álbum
  async create(userId: number, createReviewDto: CreateReviewDto) {
    return this.prisma.review.create({
      data: {
        ...createReviewDto,
        userId: userId,
      },
    });
  }

  // --- CORRIGIDO: Agora traz likeCount + isLiked ---
  async findAllByUserId(userId: number) {
    const reviews = await this.prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { likes: true, comments: true } },
        likes: {
          where: { userId }, // <-- se o PRÓPRIO usuário curtiu
          select: { userId: true },
        },
      },
    });

    return reviews.map(review => ({
      ...review,

      // Número de curtidas
      likeCount: review._count.likes,
      commentCount: review._count.comments,

      // true/false se o usuário curtiu
      isLiked: review.likes.length > 0,
    }));
  }

  // Atualiza review (apenas se o usuário for dono)
  async findOneById(id: number, currentUserId: number) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: currentUserId }, select: { userId: true } },
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    if (!review) throw new NotFoundException('Review nao encontrada');

    const isBlocked = await this.moderationService.isBlockedBetween(
      currentUserId,
      review.userId,
    );

    if (isBlocked) {
      throw new NotFoundException('Review nao encontrada');
    }

    return {
      reviewId: review.id,
      id: review.id,
      spotifyId: review.spotifyId,
      albumId: review.albumId,
      albumName: review.albumName,
      albumCover: review.albumCover,
      albumArtist: review.albumArtist,
      releaseYear: review.releaseYear,
      rating: review.rating,
      text: review.text,
      createdAt: review.createdAt,
      userId: review.userId,
      user: {
        id: review.user.id,
        username: review.user.username,
        displayName: review.user.displayName,
        avatar: review.user.avatarUrl,
        avatarUrl: review.user.avatarUrl,
      },
      likeCount: review._count.likes,
      commentCount: review._count.comments,
      isLiked: review.likes.length > 0,
      isMine: review.userId === currentUserId,
    };
  }

  async update(id: number, userId: number, updateReviewDto: UpdateReviewDto) {
    return this.prisma.review.updateMany({
      where: {
        id,
        userId,
      },
      data: updateReviewDto,
    });
  }

  async remove(id: number, userId: number) {
  // Verifica se a review existe e pertence ao usuário
  const review = await this.prisma.review.findUnique({ where: { id } });
  if (!review) throw new NotFoundException('Review não encontrada');
  if (review.userId !== userId) throw new NotFoundException('Você não pode deletar esta review');

  // Deleta dependências (likes, comentários, etc.)
  await this.prisma.like.deleteMany({ where: { reviewId: id } });
  // Se tiver mais tabelas que dependem de reviewId, deletar aqui também
  // ex: await this.prisma.comment.deleteMany({ where: { reviewId: id } });

  // Agora deleta a review
  return this.prisma.review.delete({ where: { id } });
}

async findAllByAlbumId(albumId: string, currentUserId?: number | null) {
  const blockedConnectionIds = currentUserId
    ? await this.moderationService.getBlockedConnectionIds(currentUserId)
    : [];

  const reviews = await this.prisma.review.findMany({
    where: {
      OR: [{ albumId }, { spotifyId: albumId }],
      userId: { notIn: blockedConnectionIds },
    },
    include: {
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: currentUserId || -1 }, select: { userId: true } },
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const formattedReviews = reviews
    .map(r => ({
      ...r,
      likeCount: r._count.likes,
      commentCount: r._count.comments,
      isLiked: r.likes.length > 0,
      isMine: currentUserId ? r.userId === currentUserId : false,
    }))
    .sort((a, b) => b.likeCount - a.likeCount);

  const averageRating =
    formattedReviews.length > 0
      ? formattedReviews.reduce((sum, r) => sum + r.rating, 0) / formattedReviews.length
      : null;

  return { reviews: formattedReviews, averageRating };
}

// --- NOVAS FUNÇÕES DE COMENTÁRIO ---

  // 1. Busca todos os comentários de uma review
  async getComments(reviewId: number, currentUserId: number) {
    const blockedConnectionIds = await this.moderationService.getBlockedConnectionIds(currentUserId);

    return this.prisma.comment.findMany({
      where: {
        reviewId,
        userId: { notIn: blockedConnectionIds },
      },
      orderBy: { createdAt: 'desc' }, // Traz os mais recentes primeiro
      include: {
        user: { 
          select: { id: true, username: true, displayName: true, avatarUrl: true } 
        },
      },
    });
  }

  // 2. Adiciona um novo comentário
  async addComment(reviewId: number, userId: number, text: string) {
    // Primeiro, checa se a review existe
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review não encontrada');

    const isBlocked = await this.moderationService.isBlockedBetween(userId, review.userId);
    if (isBlocked) {
      throw new BadRequestException('Nao e possivel comentar nesta review.');
    }

    return this.prisma.comment.create({
      data: {
        text,
        reviewId,
        userId,
      },
      include: {
        user: { 
          select: { id: true, username: true, displayName: true, avatarUrl: true } 
        },
      },
    });
  }


}

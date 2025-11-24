import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';


@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

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
        _count: { select: { likes: true } },
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

      // true/false se o usuário curtiu
      isLiked: review.likes.length > 0,
    }));
  }

  // Atualiza review (apenas se o usuário for dono)
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

}

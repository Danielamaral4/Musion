import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(
    userId: number, 
    senderId: number, 
    type: string, 
    reviewId?: number, 
    albumName?: string,
    commentId?: number
  ) {
    if (userId === senderId) return; // Não notifica a si mesmo
    
    return this.prisma.notification.create({
      data: { userId, senderId, type, reviewId, albumName, commentId },
    });
  }

  async getUserNotifications(userId: number) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        review: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            _count: { select: { likes: true, comments: true } },
            likes: {
              where: { userId },
              select: { userId: true },
            },
          },
        },
      }
    });

    return notifications.map((notification) => ({
      ...notification,
      review: notification.review
        ? {
            reviewId: notification.review.id,
            albumId: notification.review.albumId,
            albumName: notification.review.albumName,
            albumCover: notification.review.albumCover,
            albumArtist: notification.review.albumArtist,
            rating: notification.review.rating,
            text: notification.review.text,
            createdAt: notification.review.createdAt,
            userId: notification.review.userId,
            user: {
              id: notification.review.user.id,
              username: notification.review.user.username,
              displayName: notification.review.user.displayName,
              avatar: notification.review.user.avatarUrl,
              avatarUrl: notification.review.user.avatarUrl,
            },
            likeCount: notification.review._count.likes,
            commentCount: notification.review._count.comments,
            isLiked: notification.review.likes.length > 0,
            isMine: notification.review.userId === userId,
          }
        : null,
    }));
  }

  async markAsRead(id: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }
}

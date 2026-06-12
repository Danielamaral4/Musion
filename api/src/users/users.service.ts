// src/users/users.service.ts
import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';
import { UpdateUserDto } from '../dto/update-user.dto';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private moderationService: ModerationService
  ) {} // Injeta o Prisma e o serviço de notificações

  private normalizeFollowCounts<T extends { _count?: any }>(user: T): T {
    if (!user?._count) return user;

    const followers = user._count.following ?? 0;
    const following = user._count.followers ?? 0;

    return {
      ...user,
      _count: {
        ...user._count,
        followers,
        following,
      },
    };
  }

  // Função para o Auth (login)
async findOne(email: string): Promise<User | undefined> {
        const user = await this.prisma.user.findUnique({
          where: {
            email: email, // <-- CORRIGIDO: Agora procura o email na coluna 'email'
          },
        });
        
        return user || undefined; 
      }

  // Função para o Auth (registro)
  // Recebe os dados do auth.service
  // src/users/users.service.ts
async create(data: { username: string; name: string; email: string; passwordHash: string }): Promise<User> {
  // 1. Checa se já existe username
  const existingUsername = await this.prisma.user.findUnique({
    where: { username: data.username },
  });
  if (existingUsername) throw new BadRequestException('Username já existe.');

  // 2. Checa se já existe email
  const existingEmail = await this.prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingEmail) throw new BadRequestException('Email já cadastrado.');

  // 3. Cria usuário
  return this.prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      password: data.passwordHash,
      displayName: data.name,
    },
  });
}


  // Função para o UsersController (buscar perfil)
async savePasswordReset(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
  await this.prisma.$executeRaw`
    UPDATE \`User\`
    SET passwordResetToken = ${tokenHash}, passwordResetExpires = ${expiresAt}
    WHERE id = ${userId}
  `;
}

async findPasswordReset(email: string): Promise<{
  id: number;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
} | null> {
  const users = await this.prisma.$queryRaw<Array<{
    id: number;
    passwordResetToken: string | null;
    passwordResetExpires: Date | null;
  }>>`
    SELECT id, passwordResetToken, passwordResetExpires
    FROM \`User\`
    WHERE email = ${email}
    LIMIT 1
  `;

  return users[0] || null;
}

async updatePassword(userId: number, passwordHash: string): Promise<void> {
  await this.prisma.$executeRaw`
    UPDATE \`User\`
    SET password = ${passwordHash}, passwordResetToken = NULL, passwordResetExpires = NULL
    WHERE id = ${userId}
  `;
}

async changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundException('Usuario nao encontrado.');
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatches) {
    throw new UnauthorizedException('Senha atual incorreta.');
  }

  if (newPassword.length < 6) {
    throw new BadRequestException('A nova senha deve ter no minimo 6 caracteres.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await this.updatePassword(userId, passwordHash);

  return { message: 'Senha alterada com sucesso.' };
}

async deleteAccount(userId: number, password: string) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundException('Usuario nao encontrado.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new UnauthorizedException('Senha incorreta.');
  }

  const userReviews = await this.prisma.review.findMany({
    where: { userId },
    select: { id: true },
  });
  const reviewIds = userReviews.map((review) => review.id);

  const userComments = await this.prisma.comment.findMany({
    where: {
      OR: [
        { userId },
        reviewIds.length ? { reviewId: { in: reviewIds } } : undefined,
      ].filter(Boolean) as any,
    },
    select: { id: true },
  });
  const commentIds = userComments.map((comment) => comment.id);

  await this.prisma.$transaction([
    this.prisma.notification.deleteMany({
      where: {
        OR: [
          { userId },
          { senderId: userId },
          reviewIds.length ? { reviewId: { in: reviewIds } } : undefined,
          commentIds.length ? { commentId: { in: commentIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
    this.prisma.like.deleteMany({
      where: {
        OR: [
          { userId },
          reviewIds.length ? { reviewId: { in: reviewIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
    this.prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId },
          { followingId: userId },
        ],
      },
    }),
    this.prisma.comment.deleteMany({
      where: {
        OR: [
          { userId },
          reviewIds.length ? { reviewId: { in: reviewIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
    this.prisma.review.deleteMany({ where: { userId } }),
    this.prisma.user.delete({ where: { id: userId } }),
  ]);

  return { message: 'Conta excluida com sucesso.' };
}

async findById(id: number): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: id,
      },
      include: { // <--- 1. ADICIONE O 'include'
        _count: { // <--- 2. Peça o '_count'
          select: {
            followers: true, // <--- 3. Da relação 'followers'
            following: true, // <--- 4. E da relação 'following'
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Remove a senha antes de retornar
    const { password, ...result } = user;
    return this.normalizeFollowCounts(result);
  }

  // --- NOVA FUNÇÃO DE UPDATE ---
  async update(
    id: number,
    dto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          username: dto.username,
          displayName: dto.displayName,
          bio: dto.bio,
        },
        // Precisamos incluir o _count de novo!
        include: {
          _count: {
            select: { followers: true, following: true },
          },
        },
      });

      // Remove a senha antes de retornar
      const { password, ...result } = user;
      return this.normalizeFollowCounts(result);
    } catch (error: any) {
      // Pega erros do Prisma (ex: username duplicado)
      if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        throw new BadRequestException('Esse username já está em uso.');
      }
      throw error;
    }
  }

  // --- NOVA FUNÇÃO DE UPDATE AVATAR ---
  async updateAvatar(id: number, avatarUrl: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl }, // Salva a URL no banco
      include: { // Retorna os contadores
        _count: {
          select: { followers: true, following: true },
        },
      },
    });
    
    const { password, ...result } = user;
    return this.normalizeFollowCounts(result);
  }

// --- SEGUIR USUÁRIO (CORRIGIDO) ---
  async followUser(followerId: number, targetUserId: number) {
    if (followerId === targetUserId) {
      throw new BadRequestException('Você não pode seguir a si mesmo.');
    }

    const isBlocked = await this.moderationService.isBlockedBetween(followerId, targetUserId);
    if (isBlocked) {
      throw new BadRequestException('Nao e possivel seguir este usuario.');
    }

    // Verifica se já segue para não dar erro duplicado
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followerId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) return existingFollow; // Já segue, só retorna

    // 1. Primeiro salvamos o follow na variável newFollow
    const newFollow = await this.prisma.follow.create({
      data: {
        followerId: followerId,
        followingId: targetUserId,
      },
    });

    // 2. Depois executamos o bloco da notificação
    try {
      await this.notificationsService.createNotification(
        targetUserId,  // Quem recebe a notificação (a pessoa sendo seguida)
        followerId,    // Quem gerou a ação (quem clicou em seguir)
        'FOLLOW'       // Tipo de notificação
      );
    } catch (error) {
      console.error('Erro silencioso ao criar notificação de FOLLOW:', error);
    }

    // 3. E só agora no final retornamos o resultado
    return newFollow;
  }

  // --- DEIXAR DE SEGUIR ---
  async unfollowUser(followerId: number, targetUserId: number) {
    return this.prisma.follow.deleteMany({
      where: {
        followerId: followerId,
        followingId: targetUserId,
      },
    });
  }

  async getFollowers(userId: number) {
    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: { follower: { username: 'asc' } },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return followers.map((follow) => follow.follower);
  }

  async getFollowing(userId: number) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: { following: { username: 'asc' } },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return following.map((follow) => follow.following);
  }
  
async findProfile(targetUserId: number, currentUserId?: number | null) {
  // 1. Buscar dados do usuário + contadores
  const user = await this.prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      _count: {
        select: { followers: true, following: true, reviews: true }
      }
    }
  });

  if (!user) return null;

  const blockStatus = currentUserId
    ? await this.moderationService.getBlockStatus(currentUserId, targetUserId)
    : { isBlocked: false, blockedMe: false };
  const shouldHideContent =
    Boolean(currentUserId) && currentUserId !== targetUserId && (blockStatus.isBlocked || blockStatus.blockedMe);

  // 2. Verificar se EU sigo esse usuário
  const isFollowing = currentUserId ? await this.prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUserId,
        followingId: targetUserId,
      }
    }
  }) : null;

  // 3. Buscar reviews do usuário visitado (COM LIKECOUNT + ISLIKED)
  const reviews = shouldHideContent ? [] : await this.prisma.review.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { likes: true, comments: true } },
      likes: {
        where: { userId: currentUserId || -1 }, // verifica se eu curti
        select: { userId: true }
      }
    }
  });

  const formattedReviews = reviews.map(r => ({
    ...r,
    likeCount: r._count.likes,
    commentCount: r._count.comments,
    isLiked: r.likes.length > 0,
  }));

  // 4. Remover a senha e retornar o perfil completo
  const { password, ...rawUserData } = user;
  const userData = this.normalizeFollowCounts(rawUserData);

  return {
    ...userData,
    ...blockStatus,
    isFollowing: !!isFollowing,
    reviews: formattedReviews
  };
}
  // Busca usuários por nome ou username
  async searchUsers(query: string, currentUserId?: number | null) {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) {
      return [];
    }

    const blockedConnectionIds = currentUserId
      ? await this.moderationService.getBlockedConnectionIds(currentUserId)
      : [];

    const where: any = {
      OR: [
        { username: { contains: cleanQuery } },
        { displayName: { contains: cleanQuery } },
      ],
    };

    if (blockedConnectionIds.length > 0) {
      where.id = { notIn: blockedConnectionIds };
    }

    return this.prisma.user.findMany({
      where,
      take: 8,
      select: { 
        id: true, 
        username: true, 
        displayName: true, 
        avatarUrl: true 
      },
    });
  }

  async listUsersForAdmin(query = '', role = 'ALL') {
    const cleanQuery = String(query || '').trim();
    const normalizedRole = String(role || 'ALL').trim().toUpperCase();
    const where: any = {};

    if (['USER', 'ADMIN'].includes(normalizedRole)) {
      where.role = normalizedRole;
    }

    if (cleanQuery) {
      where.OR = [
        { username: { contains: cleanQuery } },
        { displayName: { contains: cleanQuery } },
        { email: { contains: cleanQuery } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateUserRole(targetUserId: number, role: string) {
    const normalizedRole = String(role || '').trim().toUpperCase();

    if (!['USER', 'ADMIN'].includes(normalizedRole)) {
      throw new BadRequestException('Role invalida.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: normalizedRole },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });
  }

}

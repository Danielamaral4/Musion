// src/users/users.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {} // Injeta o Prisma

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
    return result;
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
      return result;
    } catch (error) {
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
    return result;
  }

  // --- SEGUIR USUÁRIO ---
  async followUser(followerId: number, targetUserId: number) {
    if (followerId === targetUserId) {
      throw new BadRequestException('Você não pode seguir a si mesmo.');
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

    return this.prisma.follow.create({
      data: {
        followerId: followerId,
        followingId: targetUserId,
      },
    });
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

  // --- BUSCAR PERFIL (COM STATUS "SEGUINDO") ---
  // Essa função busca o perfil de ALGUÉM e diz se EU sigo ela
  // --- BUSCAR PERFIL COMPLETO DE QUALQUER USUÁRIO ---
async findProfile(targetUserId: number, currentUserId: number) {
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

  // 2. Verificar se EU sigo esse usuário
  const isFollowing = await this.prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUserId,
        followingId: targetUserId,
      }
    }
  });

  // 3. Buscar reviews do usuário visitado (COM LIKECOUNT + ISLIKED)
  const reviews = await this.prisma.review.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { likes: true } },
      likes: {
        where: { userId: currentUserId }, // verifica se eu curti
        select: { userId: true }
      }
    }
  });

  const formattedReviews = reviews.map(r => ({
    ...r,
    likeCount: r._count.likes,
    isLiked: r.likes.length > 0,
  }));

  // 4. Remover a senha e retornar o perfil completo
  const { password, ...userData } = user;

  return {
    ...userData,
    isFollowing: !!isFollowing,
    reviews: formattedReviews
  };
}
  // Busca usuários por nome ou username
  async searchUsers(query: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query } }, 
          { displayName: { contains: query } },
        ],
      },
      take: 5, // Limita a 5 resultados
      select: { 
        id: true, 
        username: true, 
        displayName: true, 
        avatarUrl: true 
      },
    });
  }

}
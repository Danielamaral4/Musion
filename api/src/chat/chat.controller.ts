import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

const makeSessionId = (firstUserId: number, secondUserId: number) => {
  const [a, b] = [firstUserId, secondUserId].sort((x, y) => x - y);
  return `dm:${a}:${b}`;
};

const parseSessionId = (sessionId?: string | null) => {
  const match = String(sessionId || '').match(/^dm:(\d+):(\d+)$/);
  if (!match) return null;

  return {
    firstUserId: Number(match[1]),
    secondUserId: Number(match[2]),
  };
};

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly prisma: PrismaService) {}

  private getCurrentUserId(req: any) {
    return Number(req.user?.id || req.user?.sub);
  }

  private async getBlockedUserIds(userId: number) {
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });

    return blocks.map((block) =>
      block.blockerId === userId ? block.blockedId : block.blockerId,
    );
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }

  private formatMessage(message: any, currentUserId: number) {
    const senderId = Number(String(message.role || '').replace('user:', ''));

    return {
      id: message.id,
      senderId,
      text: message.content,
      createdAt: message.createdAt,
      isMine: senderId === currentUserId,
    };
  }

  @Get('users')
  async searchUsers(@Request() req, @Query('q') query = '') {
    const currentUserId = this.getCurrentUserId(req);
    const cleanQuery = String(query || '').trim();
    const blockedUserIds = await this.getBlockedUserIds(currentUserId);

    if (!cleanQuery) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          notIn: [currentUserId, ...blockedUserIds],
        },
        OR: [
          { username: { contains: cleanQuery } },
          { displayName: { contains: cleanQuery } },
          { email: { contains: cleanQuery } },
        ],
      },
      orderBy: { username: 'asc' },
      take: 12,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    return users.map((user) => this.formatUser(user));
  }

  @Get('conversations')
  async getConversations(@Request() req) {
    const currentUserId = this.getCurrentUserId(req);
    const blockedUserIds = await this.getBlockedUserIds(currentUserId);

    const recentMessages = await this.prisma.chat.findMany({
      where: {
        OR: [
          { sessionId: { startsWith: `dm:${currentUserId}:` } },
          { sessionId: { endsWith: `:${currentUserId}` } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const latestBySession = new Map<string, any>();
    recentMessages.forEach((message) => {
      if (!message.sessionId || latestBySession.has(message.sessionId)) return;
      latestBySession.set(message.sessionId, message);
    });

    const rows = Array.from(latestBySession.values());
    const otherUserIds = rows
      .map((message) => {
        const ids = parseSessionId(message.sessionId);
        if (!ids) return null;
        return ids.firstUserId === currentUserId ? ids.secondUserId : ids.firstUserId;
      })
      .filter((id): id is number => Boolean(id && !blockedUserIds.includes(id)));

    if (!otherUserIds.length) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    const usersById = new Map(users.map((user) => [user.id, user]));

    return rows
      .map((message) => {
        const ids = parseSessionId(message.sessionId);
        if (!ids) return null;

        const otherUserId =
          ids.firstUserId === currentUserId ? ids.secondUserId : ids.firstUserId;

        if (blockedUserIds.includes(otherUserId)) return null;

        const user = usersById.get(otherUserId);
        if (!user) return null;

        return {
          user: this.formatUser(user),
          lastMessage: this.formatMessage(message, currentUserId),
          updatedAt: message.createdAt,
        };
      })
      .filter(Boolean);
  }

  @Get('messages/:userId')
  async getMessages(@Request() req, @Param('userId') userIdParam: string) {
    const currentUserId = this.getCurrentUserId(req);
    const otherUserId = Number(userIdParam);

    await this.ensureCanChat(currentUserId, otherUserId);

    const sessionId = makeSessionId(currentUserId, otherUserId);
    const messages = await this.prisma.chat.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 80,
    });

    return messages.map((message) => this.formatMessage(message, currentUserId));
  }

  @Delete('conversations/:userId')
  async deleteConversation(@Request() req, @Param('userId') userIdParam: string) {
    const currentUserId = this.getCurrentUserId(req);
    const otherUserId = Number(userIdParam);

    if (!currentUserId || !otherUserId || currentUserId === otherUserId) {
      throw new BadRequestException('Usuario invalido.');
    }

    await this.prisma.chat.deleteMany({
      where: { sessionId: makeSessionId(currentUserId, otherUserId) },
    });

    return { deleted: true };
  }

  @Post('messages/:userId')
  async sendMessage(
    @Request() req,
    @Param('userId') userIdParam: string,
    @Body() body: { text?: string },
  ) {
    const currentUserId = this.getCurrentUserId(req);
    const otherUserId = Number(userIdParam);
    const text = String(body?.text || '').trim();

    if (!text) {
      throw new BadRequestException('Mensagem vazia.');
    }

    if (text.length > 1000) {
      throw new BadRequestException('Mensagem muito longa.');
    }

    await this.ensureCanChat(currentUserId, otherUserId);

    const message = await this.prisma.chat.create({
      data: {
        sessionId: makeSessionId(currentUserId, otherUserId),
        role: `user:${currentUserId}`,
        content: text,
      },
    });

    return this.formatMessage(message, currentUserId);
  }

  private async ensureCanChat(currentUserId: number, otherUserId: number) {
    if (!currentUserId || !otherUserId || currentUserId === otherUserId) {
      throw new BadRequestException('Usuario invalido.');
    }

    const [user, block] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true },
      }),
      this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: currentUserId, blockedId: otherUserId },
            { blockerId: otherUserId, blockedId: currentUserId },
          ],
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    if (block) {
      throw new BadRequestException('Nao e possivel conversar com este usuario.');
    }
  }
}

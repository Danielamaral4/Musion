import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private prisma: PrismaService,
  ) {}

  @Post()
  async send(@Body() body: { message: string, sessionId?: string }) {
    const { message, sessionId } = body;

    let history: any[] = [];

    if (sessionId) {
      const saved = await this.prisma.chat.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 20
      });

      history = saved.map(h => ({
        role: h.role as "user" | "assistant",
        content: h.content
      }));
    }

    history.push({ role: "user", content: message });

    const reply = await this.chatService.sendChat(history);

    if (sessionId) {
      await this.prisma.chat.createMany({
        data: [
          { role: "user", content: message, sessionId },
          { role: "assistant", content: reply, sessionId },
        ]
      });
    }

    return { reply };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class ChatService {
  private client: OpenAI;
  private logger = new Logger(ChatService.name);

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

async sendChat(messages: any[]) {
  try {
    const resp = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 700,
    });

    return resp.choices[0].message.content ?? "[Sem resposta]";
  } catch (err) {
    this.logger.error(err);
    return "[Erro ao gerar resposta]";
  }
}

}

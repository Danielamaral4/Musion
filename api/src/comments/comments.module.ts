import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [PrismaModule, NotificationsModule, ModerationModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}

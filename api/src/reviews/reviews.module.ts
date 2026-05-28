// src/reviews/reviews.module.ts
import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [PrismaModule, SpotifyModule, ModerationModule], // <-- Usa Prisma e Spotify
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}

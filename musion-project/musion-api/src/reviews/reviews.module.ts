// src/reviews/reviews.module.ts
import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SpotifyModule } from 'src/spotify/spotify.module';

@Module({
  imports: [PrismaModule, SpotifyModule], // <-- Usa Prisma e Spotify
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
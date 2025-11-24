// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SpotifyModule } from './spotify/spotify.module';
import { ReviewsModule } from './reviews/reviews.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AlbumController } from './album/album.controller';
import { AlbumModule } from './album/album.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Faz o .env funcionar globalmente
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    SpotifyModule,
    ReviewsModule,
    DashboardModule,
    AlbumModule,
    ChatModule,
  ],

  controllers: [
    AlbumController, // <-- AQUI! Agora está devidamente registrado
  ],

  providers: [],
})
export class AppModule {}

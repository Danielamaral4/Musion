import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
// IMPORTANTE: Importe os módulos das dependências
import { PrismaModule } from '../prisma/prisma.module';
import { SpotifyModule } from '../spotify/spotify.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LastfmModule } from '../lastfm/lastfm.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    PrismaModule,  // <--- Adicione aqui para resolver o erro do PrismaService
    SpotifyModule,  // <--- Adicione aqui para resolver o erro do SpotifyService
    NotificationsModule,  // <--- Adicione aqui para resolver o erro do NotificationsService
    LastfmModule,
    ModerationModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

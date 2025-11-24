// src/spotify/spotify.module.ts
import { Module, forwardRef } from '@nestjs/common'; // <-- 1. IMPORTAR forwardRef
import { SpotifyService } from './spotify.service';
import { SpotifyController } from './spotify.controller';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => AuthModule), // <-- 2. USAR forwardRef AQUI
  ], 
  controllers: [SpotifyController],
  providers: [SpotifyService],
  exports: [SpotifyService],
})
export class SpotifyModule {}
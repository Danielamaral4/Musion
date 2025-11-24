import { Module } from '@nestjs/common';
import { AlbumController } from './album.controller';
import { SpotifyModule } from '../spotify/spotify.module';

@Module({
  imports: [SpotifyModule],
  controllers: [AlbumController],
})
export class AlbumModule {}

import { Controller, Get, Param } from '@nestjs/common';
import { SpotifyService } from '../spotify/spotify.service';

@Controller('album')
export class AlbumController {
  constructor(private spotify: SpotifyService) {}

  @Get(':id')
  async getAlbum(@Param('id') id: string) {
    return this.spotify.getAlbumDetails(id);
  }
}

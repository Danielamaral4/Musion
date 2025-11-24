// src/spotify/spotify.controller.ts
import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common'; 
import { AuthGuard } from '@nestjs/passport'; 
import { SpotifyService } from './spotify.service';

@Controller('spotify')
@UseGuards(AuthGuard('jwt')) 
export class SpotifyController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @Get('search')
  search(@Query('q') query: string) {
    return this.spotifyService.searchAlbums(query);
  }

  @Get('album/:id') 
  getAlbum(@Param('id') albumId: string) {
    return this.spotifyService.getAlbumDetails(albumId);
  }

}
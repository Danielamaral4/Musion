import { Controller, Get, Param, UseGuards, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AlbumService } from './album.service';

@Controller('albums')
@UseGuards(AuthGuard('jwt'))  // 🔐 protege todas as rotas com JWT
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @Get(':id')
  async getAlbum(
    @Param('id') id: string,
    @Headers('authorization') auth: string
  ) {
    const accessToken = auth?.replace('Bearer ', '');
    return this.albumService.getAlbumById(id, accessToken);
  }

  @Get(':id/tracks')
  async getTracks(
    @Param('id') id: string,
    @Headers('authorization') auth: string
  ) {
    const accessToken = auth?.replace('Bearer ', '');
    return this.albumService.getTracksFromAlbum(id, accessToken);
  }
}

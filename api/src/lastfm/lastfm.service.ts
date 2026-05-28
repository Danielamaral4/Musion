import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

@Injectable()
export class LastfmService {
  private readonly logger = new Logger(LastfmService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get apiKey() {
    return this.configService.get<string>('LASTFM_API_KEY') || '';
  }

  private async request(method: string, params: Record<string, string | number>) {
    if (!this.apiKey) return null;

    try {
      const response = await firstValueFrom(
        this.httpService.get(LASTFM_API_URL, {
          params: {
            method,
            api_key: this.apiKey,
            format: 'json',
            autocorrect: 1,
            ...params,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.warn(`Last.fm ${method} falhou: ${error.message}`);
      return null;
    }
  }

  async getSimilarArtists(artist: string, limit = 12) {
    if (!artist) return [];

    const data = await this.request('artist.getsimilar', { artist, limit });
    const artists = data?.similarartists?.artist;

    if (!Array.isArray(artists)) return [];

    return artists
      .map((item) => ({
        name: item?.name || '',
        match: Number(item?.match || 0),
      }))
      .filter((item) => item.name);
  }

  async getArtistTags(artist: string, limit = 8) {
    if (!artist) return [];

    const data = await this.request('artist.gettoptags', { artist });
    const tags = data?.toptags?.tag;

    if (!Array.isArray(tags)) return [];

    return tags
      .map((item) => ({
        name: item?.name || '',
        count: Number(item?.count || 0),
      }))
      .filter((item) => item.name)
      .slice(0, limit);
  }

  async getAlbumTags(artist: string, album: string, limit = 8) {
    if (!artist || !album) return [];

    const data = await this.request('album.gettoptags', { artist, album });
    const tags = data?.toptags?.tag;

    if (!Array.isArray(tags)) return [];

    return tags
      .map((item) => ({
        name: item?.name || '',
        count: Number(item?.count || 0),
      }))
      .filter((item) => item.name)
      .slice(0, limit);
  }
}

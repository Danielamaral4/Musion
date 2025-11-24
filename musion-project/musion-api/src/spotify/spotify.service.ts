import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

@Injectable()
export class SpotifyService {
  private spotifyToken: string;
  private tokenExpiresAt: number;
  private logger = new Logger(SpotifyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.tokenExpiresAt = 0;
  }

  // ============================================================
  // 1. AUTENTICAÇÃO (Client Credentials Flow)
  // ============================================================
  private async getSpotifyToken(): Promise<string> {
    if (this.spotifyToken && Date.now() < this.tokenExpiresAt) {
      return this.spotifyToken;
    }

    const clientId = this.configService.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SPOTIFY_CLIENT_SECRET');

    const authBuffer = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          SPOTIFY_AUTH_URL,
          new URLSearchParams({ grant_type: 'client_credentials' }),
          {
            headers: {
              Authorization: `Basic ${authBuffer}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.spotifyToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

      return this.spotifyToken;
    } catch (error) {
      this.logger.error(`Erro ao autenticar no Spotify: ${error.message}`);
      throw new Error('Falha na autenticação com Spotify');
    }
  }

  // ============================================================
  // 2. BUSCAR ÁLBUNS
  // ============================================================
  async searchAlbums(query: string) {
    const token = await this.getSpotifyToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${SPOTIFY_API_URL}/search`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: query, type: 'album', limit: 10 },
        }),
      );
      return response.data.albums.items;
    } catch (error) {
      this.logger.error(`Erro ao buscar álbuns: ${error.message}`);
      return [];
    }
  }

  // ============================================================
  // 3. DETALHES DO ÁLBUM
  // ============================================================
  async getAlbumDetails(albumId: string) {
    const token = await this.getSpotifyToken();
    const cleanId = albumId.replace('spotify:album:', '');

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${SPOTIFY_API_URL}/albums/${cleanId}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { market: 'BR' },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Erro ao buscar detalhes do álbum ${cleanId}: ${error.message}`);
      return null;
    }
  }

  // ============================================================
  // 4. PEGAR GÊNEROS DE UM ARTISTA
  // ============================================================
  async getArtistGenres(artistId: string): Promise<string[]> {
    const token = await this.getSpotifyToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${SPOTIFY_API_URL}/artists/${artistId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return response.data.genres || [];
    } catch (error) {
      this.logger.error(`Erro ao buscar gêneros do artista ${artistId}: ${error.message}`);
      return [];
    }
  }

  // ============================================================
  // 5. BUSCAR ÁLBUNS POR GÊNERO
  // ============================================================
  async searchAlbumsByGenre(genre: string) {
    const token = await this.getSpotifyToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${SPOTIFY_API_URL}/search`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            q: `genre:"${genre}"`,
            type: 'album',
            limit: 10,
            market: 'BR',
          },
        }),
      );

      return response.data.albums?.items || [];
    } catch (error) {
      this.logger.error(`Erro ao buscar álbuns por gênero "${genre}": ${error.message}`);
      return [];
    }
  }

  // ============================================================
  // 6. NOVO — PEGAR ÁLBUNS DE UM ARTISTA
  // ============================================================
  async getArtistAlbums(artistId: string) {
    const token = await this.getSpotifyToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${SPOTIFY_API_URL}/artists/${artistId}/albums`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            include_groups: 'album',
            market: 'BR',
            limit: 10,
          },
        }),
      );

      return response.data.items || [];
    } catch (error) {
      this.logger.error(`Erro ao buscar álbuns do artista ${artistId}: ${error.message}`);
      return [];
    }
  }

  // ============================================================
  // 7. NOVO — PEGAR ARTISTAS RELACIONADOS
  // ============================================================
  async getRelatedArtists(artistId: string) {
  const token = await this.getSpotifyToken();

  try {
    const response = await firstValueFrom(
      this.httpService.get(`${SPOTIFY_API_URL}/artists/${artistId}/related-artists`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    return response.data.artists || [];
  } catch (error) {

    // 🔥 Spotify retorna 404 para alguns artistas — isso é normal
    if (error.response?.status === 404) {
      this.logger.warn(`Nenhum artista relacionado encontrado para ${artistId}`);
      return [];
    }

    this.logger.error(
      `Erro ao buscar artistas relacionados para ${artistId}: ${error.message}`
    );

    return [];
  }
}
}

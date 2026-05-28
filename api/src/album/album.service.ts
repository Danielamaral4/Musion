import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AlbumService {
  private readonly SPOTIFY_BASE_URL = 'https://api.spotify.com/v1';

  constructor() {}

  async getAlbumById(id: string, token: string) {
    const url = `${this.SPOTIFY_BASE_URL}/albums/${id}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  }

  async getTracksFromAlbum(id: string, token: string) {
    const url = `${this.SPOTIFY_BASE_URL}/albums/${id}/tracks`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.items;
  }
}

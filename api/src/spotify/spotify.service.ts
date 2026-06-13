import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import OpenAI from 'openai';
import { recognize } from 'tesseract.js';
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
const DEEZER_API_URL = 'https://api.deezer.com';

@Injectable()
export class SpotifyService {
  private spotifyToken: string;
  private tokenExpiresAt: number;
  private logger = new Logger(SpotifyService.name);
  private openai?: OpenAI;
  private gemini?: GoogleGenAI;
  private lensUsage = new Map<number, { date: string; count: number }>();
  private spotifyCooldownUntil = 0;
  private albumDetailsCache = new Map<string, { expiresAt: number; data: any }>();
  private searchCache = new Map<string, { expiresAt: number; data: any[] }>();
  private artistProfileCache = new Map<string, { expiresAt: number; data: any }>();
  private artistGenresCache = new Map<string, { expiresAt: number; data: string[] }>();
  private artistAlbumsCache = new Map<string, { expiresAt: number; data: any[] }>();
  private relatedArtistsCache = new Map<string, { expiresAt: number; data: any[] }>();
  private newReleasesCache = new Map<string, { expiresAt: number; data: any[] }>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.tokenExpiresAt = 0;
  }

  private getOpenAIClient() {
    if (this.openai) return this.openai;

    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('OPENAI_API_KEY nao configurada no backend.');
    }

    this.openai = new OpenAI({ apiKey });
    return this.openai;
  }

  private getGeminiClient() {
    if (this.gemini) return this.gemini;

    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new BadRequestException('GEMINI_API_KEY nao configurada no backend.');
    }

    this.gemini = new GoogleGenAI({ apiKey });
    return this.gemini;
  }

  private hasGeminiApiKey() {
    return Boolean(
      this.configService.get<string>('GEMINI_API_KEY') ||
        this.configService.get<string>('GOOGLE_API_KEY') ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY
    );
  }

  private getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  private getLensDailyLimit() {
    const limit = Number(this.configService.get<string>('MUSION_LENS_DAILY_LIMIT') || 20);
    return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
  }

  private getLensUsage(userId?: number) {
    const limit = this.getLensDailyLimit();
    if (!userId) return { limit, used: 0, remaining: limit };

    const today = this.getTodayKey();
    const current = this.lensUsage.get(userId);
    const used = current?.date === today ? current.count : 0;

    return {
      limit,
      used,
      remaining: Math.max(limit - used, 0),
    };
  }

  private reserveLensUse(userId?: number) {
    if (!userId) return { allowed: true, usage: this.getLensUsage(userId) };

    const today = this.getTodayKey();
    const limit = this.getLensDailyLimit();
    const current = this.lensUsage.get(userId);
    const count = current?.date === today ? current.count : 0;

    if (count >= limit) {
      return {
        allowed: false,
        usage: { limit, used: count, remaining: 0 },
      };
    }

    const nextCount = count + 1;
    this.lensUsage.set(userId, { date: today, count: nextCount });

    return {
      allowed: true,
      usage: { limit, used: nextCount, remaining: Math.max(limit - nextCount, 0) },
    };
  }

  private normalizeText(value = '') {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getCache<T>(cache: Map<string, { expiresAt: number; data: T }>, key: string): T | null {
    const current = cache.get(key);
    if (!current) return null;

    if (Date.now() > current.expiresAt) {
      cache.delete(key);
      return null;
    }

    return current.data;
  }

  private setCache<T>(
    cache: Map<string, { expiresAt: number; data: T }>,
    key: string,
    data: T,
    ttlMs = 15 * 60 * 1000,
  ) {
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  private getRetryAfterMs(error: any) {
    const header = error?.response?.headers?.['retry-after'];
    const seconds = Number(Array.isArray(header) ? header[0] : header);
    return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 5000) : 1200;
  }

  private async spotifyGet(url: string, token: string, config: any = {}): Promise<any> {
    const cooldown = this.spotifyCooldownUntil - Date.now();
    if (cooldown > 0) {
      await this.sleep(Math.min(cooldown, 2000));
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(url, {
            ...config,
            headers: {
              ...(config.headers || {}),
              Authorization: `Bearer ${token}`,
            },
          }),
        );

        return response.data;
      } catch (error) {
        if (error?.response?.status === 429 && attempt === 0) {
          const retryAfter = this.getRetryAfterMs(error);
          this.spotifyCooldownUntil = Date.now() + retryAfter;
          this.logger.warn(`Spotify 429. Aguardando ${retryAfter}ms antes de tentar novamente.`);
          await this.sleep(retryAfter);
          continue;
        }

        throw error;
      }
    }
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    mapper: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let index = 0; index < items.length; index += limit) {
      const chunk = items.slice(index, index + limit);
      const mapped = await Promise.all(chunk.map((item, chunkIndex) => mapper(item, index + chunkIndex)));
      results.push(...mapped);
    }

    return results;
  }

  private parseSpotifyReleaseDate(album: any) {
    const rawDate = String(album?.release_date || '').trim();
    if (!rawDate) return null;

    const precision =
      album?.release_date_precision ||
      (rawDate.length === 4 ? 'year' : rawDate.length === 7 ? 'month' : 'day');

    if (precision === 'year') return null;

    const [yearText, monthText = '1', dayText = '1'] = rawDate.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = precision === 'month' ? 1 : Number(dayText);

    if (!year || !month || !day) return null;

    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getReleaseAgeInDays(album: any) {
    const releaseDate = this.parseSpotifyReleaseDate(album);
    if (!releaseDate) return null;

    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const release = Date.UTC(
      releaseDate.getUTCFullYear(),
      releaseDate.getUTCMonth(),
      releaseDate.getUTCDate(),
    );

    return Math.floor((today - release) / (24 * 60 * 60 * 1000));
  }

  private isRecentRelease(album: any, maxAgeDays = 28) {
    const age = this.getReleaseAgeInDays(album);
    return age !== null && age >= -1 && age <= maxAgeDays;
  }

  private dedupeAlbumsById(albums: any[]) {
    const seen = new Set<string>();

    return albums.filter((album) => {
      if (!album?.id || seen.has(album.id)) return false;
      seen.add(album.id);
      return true;
    });
  }

  private scoreAlbumCandidate(album: any, albumTitle: string, artistName: string) {
    const expectedAlbum = this.normalizeText(albumTitle);
    const expectedArtist = this.normalizeText(artistName);
    const candidateAlbum = this.normalizeText(album?.name || '');
    const candidateArtists = this.normalizeText(
      album?.artists?.map((artist) => artist.name).join(' ') || ''
    );

    let score = 0;

    if (candidateAlbum === expectedAlbum) score += 6;
    else if (candidateAlbum.includes(expectedAlbum) || expectedAlbum.includes(candidateAlbum)) score += 3;

    if (candidateArtists.includes(expectedArtist) || expectedArtist.includes(candidateArtists)) score += 5;

    if (album?.album_type === 'album') score += 1;
    if ((album?.total_tracks || 0) >= 5) score += 1;

    return score;
  }

  private parseVisionJSON(content: string) {
    const clean = content
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  private tokenize(value = '') {
    const ignored = new Set([
      'the',
      'and',
      'of',
      'a',
      'an',
      'to',
      'in',
      'on',
      'deluxe',
      'edition',
      'remastered',
      'remaster',
      'album',
      'music',
    ]);

    return this.normalizeText(value)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !ignored.has(token));
  }

  private cleanOcrLines(text = '') {
    return text
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(/[^\p{L}\p{N}\s&'.:-]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter((line) => line.length >= 3)
      .slice(0, 10);
  }

  private buildOcrQueries(lines: string[]) {
    const queries = new Set<string>();
    const joined = lines.join(' ').trim();

    if (joined) queries.add(joined.slice(0, 90));
    if (lines.length >= 2) queries.add(`${lines[0]} ${lines[1]}`);
    if (lines.length >= 3) queries.add(`${lines[0]} ${lines[1]} ${lines[2]}`);

    lines.slice(0, 6).forEach((line) => queries.add(line));

    for (let index = 0; index < Math.min(lines.length - 1, 5); index++) {
      queries.add(`${lines[index]} ${lines[index + 1]}`);
    }

    return Array.from(queries)
      .map((query) => query.trim())
      .filter((query) => query.length >= 3)
      .slice(0, 8);
  }

  private scoreAlbumByOcr(album: any, ocrText: string, queryIndexScore = 0) {
    const ocrTokens = new Set(this.tokenize(ocrText));
    const albumText = `${album?.name || ''} ${album?.artists?.map((artist) => artist.name).join(' ') || ''}`;
    const albumTokens = this.tokenize(albumText);
    const normalizedOcr = this.normalizeText(ocrText);
    const normalizedAlbum = this.normalizeText(album?.name || '');
    const normalizedArtists = this.normalizeText(
      album?.artists?.map((artist) => artist.name).join(' ') || ''
    );

    let score = queryIndexScore;

    albumTokens.forEach((token) => {
      if (ocrTokens.has(token)) score += 2;
    });

    if (normalizedAlbum && normalizedOcr.includes(normalizedAlbum)) score += 5;
    if (normalizedArtists && normalizedOcr.includes(normalizedArtists)) score += 4;
    if (album?.album_type === 'album') score += 1;
    if ((album?.total_tracks || 0) >= 5) score += 1;
    if (album?.images?.length) score += 0.5;

    return score;
  }

  private async buildOcrImageVariants(file: Express.Multer.File) {
    const variants: Buffer[] = [file.buffer];

    try {
      const image = sharp(file.buffer).rotate();
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      variants.push(
        await sharp(file.buffer)
          .rotate()
          .resize({ width: 1400, withoutEnlargement: true })
          .grayscale()
          .normalize()
          .sharpen()
          .png()
          .toBuffer()
      );

      variants.push(
        await sharp(file.buffer)
          .rotate()
          .resize({ width: 1600, withoutEnlargement: true })
          .grayscale()
          .normalize()
          .threshold(150)
          .png()
          .toBuffer()
      );

      if (width > 300 && height > 300) {
        const topHeight = Math.max(Math.round(height * 0.42), 1);
        const bottomTop = Math.max(height - topHeight, 0);

        variants.push(
          await sharp(file.buffer)
            .rotate()
            .extract({ left: 0, top: 0, width, height: topHeight })
            .resize({ width: 1400, withoutEnlargement: true })
            .grayscale()
            .normalize()
            .sharpen()
            .png()
            .toBuffer()
        );

        variants.push(
          await sharp(file.buffer)
            .rotate()
            .extract({ left: 0, top: bottomTop, width, height: topHeight })
            .resize({ width: 1400, withoutEnlargement: true })
            .grayscale()
            .normalize()
            .sharpen()
            .png()
            .toBuffer()
        );
      }
    } catch (error) {
      this.logger.warn(`Pre-processamento OCR ignorado: ${error.message}`);
    }

    return variants;
  }

  private async extractOcrLines(file: Express.Multer.File) {
    const lang = this.configService.get<string>('MUSION_LENS_OCR_LANGS') || 'eng+por';
    const variants = await this.buildOcrImageVariants(file);
    const lines = new Map<string, string>();

    for (const variant of variants.slice(0, 5)) {
      try {
        const result = await recognize(variant, lang);
        this.cleanOcrLines(result?.data?.text || '').forEach((line) => {
          const key = this.normalizeText(line);
          if (key && !lines.has(key)) {
            lines.set(key, line);
          }
        });
      } catch (error) {
        this.logger.warn(`Variante OCR falhou: ${error.message}`);
      }
    }

    return Array.from(lines.values()).slice(0, 14);
  }

  private async identifyAlbumCoverWithOcr(file: Express.Multer.File, fallbackMessage?: string) {
    try {
      const lines = await this.extractOcrLines(file);
      const ocrText = lines.join(' ');

      if (!lines.length) {
        return {
          found: false,
          provider: 'ocr',
          message:
            fallbackMessage ||
            'Nao consegui ler texto suficiente na capa. Tente uma foto mais frontal e iluminada.',
          identified: {
            albumTitle: '',
            artistName: '',
            confidence: 0,
            reasoning: 'OCR nao encontrou texto util.',
          },
          album: null,
          candidates: [],
        };
      }

      const queries = this.buildOcrQueries(lines);
      const candidatesById = new Map<string, any>();

      for (let index = 0; index < queries.length; index++) {
        const albums = await this.searchAlbums(queries[index]);
        const queryScore = Math.max(8 - index, 1);

        albums.slice(0, 10).forEach((album) => {
          if (!album?.id) return;

          const scoredAlbum = {
            ...album,
            lensScore: this.scoreAlbumByOcr(album, ocrText, queryScore),
          };

          const current = candidatesById.get(album.id);
          if (!current || scoredAlbum.lensScore > current.lensScore) {
            candidatesById.set(album.id, scoredAlbum);
          }
        });
      }

      const ranked = Array.from(candidatesById.values()).sort(
        (a, b) => (b.lensScore || 0) - (a.lensScore || 0)
      );
      const best = ranked[0] || null;
      const confidence = best ? Math.min(Number(best.lensScore || 0) / 18, 0.92) : 0;

      return {
        found: Boolean(best && (best.lensScore || 0) >= 5),
        provider: 'ocr',
        message:
          fallbackMessage ||
          'Resultado gerado pelo modo gratuito OCR. Funciona melhor com capas que tenham texto legivel.',
        identified: {
          albumTitle: lines[0] || '',
          artistName: lines[1] || '',
          confidence,
          reasoning: `Texto lido: ${lines.slice(0, 4).join(' / ')}`,
        },
        album: best,
        candidates: ranked.slice(0, 5),
      };
    } catch (error) {
      this.logger.error(`Erro no OCR do Musion Lens: ${error.message}`);

      return {
        found: false,
        provider: 'ocr',
        message:
          fallbackMessage ||
          'Nao foi possivel ler a capa com OCR. Tente uma imagem mais nitida.',
        identified: {
          albumTitle: '',
          artistName: '',
          confidence: 0,
          reasoning: 'Falha interna no OCR.',
        },
        album: null,
        candidates: [],
      };
    }
  }

  private async buildSpotifyLensResult({
    albumTitle,
    artistName,
    confidence,
    reasoning,
    provider,
  }: {
    albumTitle: string;
    artistName: string;
    confidence: number;
    reasoning: string;
    provider: string;
  }) {
    if (!albumTitle || !artistName || confidence < 0.25) {
      return {
        found: false,
        provider,
        identified: {
          albumTitle,
          artistName,
          confidence,
          reasoning: reasoning || 'A imagem nao teve confianca suficiente.',
        },
        album: null,
        candidates: [],
      };
    }

    const exactQuery = `album:"${albumTitle}" artist:"${artistName}"`;
    let candidates = await this.searchAlbums(exactQuery);

    if (!candidates.length) {
      candidates = await this.searchAlbums(`${albumTitle} ${artistName}`);
    }

    const ranked = candidates
      .map((album) => ({
        album,
        score: this.scoreAlbumCandidate(album, albumTitle, artistName),
      }))
      .sort((a, b) => b.score - a.score);

    const bestRow = ranked[0] || null;
    const best = bestRow?.album || null;
    const bestScore = Number(bestRow?.score || 0);

    return {
      found: Boolean(best && (bestScore >= 5 || (confidence >= 0.82 && bestScore >= 3))),
      provider,
      lensScore: bestScore,
      identified: {
        albumTitle,
        artistName,
        confidence: Number.isFinite(confidence) ? confidence : 0,
        reasoning: reasoning || '',
      },
      album: best,
      candidates: ranked.slice(0, 5).map((item) => item.album),
    };
  }

  private async identifyAlbumCoverWithGemini(file: Express.Multer.File) {
    try {
      const response = await this.getGeminiClient().models.generateContent({
        model: this.configService.get<string>('GEMINI_VISION_MODEL') || 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: file.mimetype,
              data: file.buffer.toString('base64'),
            },
          },
          {
            text:
              'Analise esta imagem como uma capa de album musical comercial. Identifique somente se houver evidencias visuais fortes como texto, logo, fotografia conhecida ou composicao claramente reconhecivel. Nao chute por estilo. Responda somente JSON valido, sem markdown, neste formato: {"albumTitle":"", "artistName":"", "confidence":0.0, "reasoning":"", "alternatives":[{"albumTitle":"", "artistName":"", "confidence":0.0}]}. Use confidence abaixo de 0.35 se estiver incerto. Traga ate 3 alternativas plausiveis.',
          },
        ],
        config: {
          temperature: 0,
        },
      });

      const content = response.text || '';
      const identified = this.parseVisionJSON(content);
      const albumTitle = String(identified?.albumTitle || '').trim();
      const artistName = String(identified?.artistName || '').trim();
      const confidence = Number(identified?.confidence || 0);
      const alternatives = Array.isArray(identified?.alternatives)
        ? identified.alternatives
        : [];
      const guesses = [
        { albumTitle, artistName, confidence, reasoning: identified?.reasoning || '' },
        ...alternatives.map((item) => ({
          albumTitle: String(item?.albumTitle || '').trim(),
          artistName: String(item?.artistName || '').trim(),
          confidence: Number(item?.confidence || 0),
          reasoning: 'Alternativa do Gemini.',
        })),
      ].filter((item) => item.albumTitle && item.artistName && item.confidence >= 0.25);

      const candidateMap = new Map<string, any>();
      let bestMiss: any = null;

      for (const guess of guesses.slice(0, 4)) {
        const result = await this.buildSpotifyLensResult({
          ...guess,
          provider: 'gemini',
        });

        if (result.found) {
          return result;
        }

        bestMiss = bestMiss || result;
        (result.candidates || []).forEach((album) => {
          if (album?.id && !candidateMap.has(album.id)) {
            candidateMap.set(album.id, album);
          }
        });
      }

      return {
        found: false,
        provider: 'gemini',
        message:
          'O Gemini nao teve confianca suficiente para cravar a capa. Confira os candidatos abaixo ou tente uma foto mais reta.',
        identified: {
          albumTitle,
          artistName,
          confidence: Number.isFinite(confidence) ? confidence : 0,
          reasoning: identified?.reasoning || bestMiss?.identified?.reasoning || '',
        },
        album: null,
        candidates: Array.from(candidateMap.values()).slice(0, 5),
      };
    } catch (error) {
      const status = error?.status || error?.response?.status;
      const message = String(error?.message || '');

      this.logger.error(`Erro no Gemini Lens: ${message}`);

      const fallbackMessage =
        status === 429
          ? 'Gemini atingiu o limite gratuito agora. Usei o OCR local como fallback.'
          : message.includes('GEMINI_API_KEY') || message.includes('GOOGLE_API_KEY')
            ? 'Gemini nao configurado. Usei o OCR local como fallback.'
            : 'Nao consegui usar o Gemini agora. Usei o OCR local como fallback.';

      return this.identifyAlbumCoverWithOcr(file, fallbackMessage);
    }
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

      this.logger.log(`Token Spotify gerado: ${this.spotifyToken}`);

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
    const cleanQuery = String(query || '').trim();
    const cacheKey = `search:${cleanQuery.toLowerCase()}`;
    const cached = this.getCache(this.searchCache, cacheKey);
    if (cached) return cached;

    const token = await this.getSpotifyToken();

    try {
      const data = await this.spotifyGet(`${SPOTIFY_API_URL}/search`, token, {
        params: { q: cleanQuery, type: 'album', limit: 30, market: 'BR' },
      });
      const albums = data.albums?.items || [];
      this.setCache(this.searchCache, cacheKey, albums);
      return albums;
    } catch (error) {
      this.logger.error(`Erro ao buscar álbuns: ${error.message}`);
      return [];
    }
  }

  // ============================================================
  // 3. DETALHES DO ÁLBUM
  // ============================================================
  private scorePreviewCandidate(track: any, trackName: string, artistName: string) {
    const expectedTrack = this.normalizeText(trackName);
    const expectedArtist = this.normalizeText(artistName);
    const candidateTrack = this.normalizeText(track?.title_short || track?.title || '');
    const candidateArtist = this.normalizeText(track?.artist?.name || '');

    let score = 0;

    if (candidateTrack === expectedTrack) score += 8;
    else if (candidateTrack.includes(expectedTrack) || expectedTrack.includes(candidateTrack)) score += 4;

    if (candidateArtist === expectedArtist) score += 6;
    else if (candidateArtist.includes(expectedArtist) || expectedArtist.includes(candidateArtist)) score += 3;

    if (track?.preview) score += 4;
    if (track?.readable !== false) score += 1;

    return score;
  }

  async findTrackPreview(trackName: string, artistName: string) {
    const cleanTrackName = String(trackName || '').trim();
    const cleanArtistName = String(artistName || '').trim();

    if (!cleanTrackName || !cleanArtistName) {
      throw new BadRequestException('Nome da faixa e artista sao obrigatorios.');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${DEEZER_API_URL}/search/track`, {
          params: {
            q: `${cleanTrackName} ${cleanArtistName}`,
            limit: 10,
          },
        }),
      );

      const tracks = Array.isArray(response.data?.data) ? response.data.data : [];
      const ranked = tracks
        .map((track) => ({
          track,
          score: this.scorePreviewCandidate(track, cleanTrackName, cleanArtistName),
        }))
        .sort((a, b) => b.score - a.score);

      const best = ranked.find((item) => item.track?.preview && item.score >= 10)?.track;

      if (!best) {
        return {
          found: false,
          provider: 'deezer',
          previewUrl: null,
          link: null,
        };
      }

      return {
        found: true,
        provider: 'deezer',
        previewUrl: best.preview,
        link: best.link,
        title: best.title_short || best.title,
        artist: best.artist?.name,
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar preview no Deezer: ${error.message}`);

      return {
        found: false,
        provider: 'deezer',
        previewUrl: null,
        link: null,
      };
    }
  }

  async searchAlbumsByArtistName(artistName: string, limit = 12) {
    const cacheKey = `artist-search:${artistName.toLowerCase()}:${limit}`;
    const cached = this.getCache(this.searchCache, cacheKey);
    if (cached) return cached;

    const token = await this.getSpotifyToken();

    try {
      const data = await this.spotifyGet(`${SPOTIFY_API_URL}/search`, token, {
        params: {
          q: `artist:"${artistName}"`,
          type: 'album',
          limit,
          market: 'BR',
        },
      });

      const albums = data.albums?.items || [];
      this.setCache(this.searchCache, cacheKey, albums);
      return albums;
    } catch (error) {
      this.logger.error(`Erro ao buscar albuns do artista "${artistName}": ${error.message}`);
      return [];
    }
  }

  private async getArtistProfile(artistId: string, token: string) {
    const cached = this.getCache(this.artistProfileCache, artistId);
    if (cached) return cached;

    try {
      const artist = await this.spotifyGet(`${SPOTIFY_API_URL}/artists/${artistId}`, token);
      this.setCache(this.artistProfileCache, artistId, artist);
      return artist;
    } catch {
      return null;
    }
  }

  async getNewReleases(limit = 20) {
    const cacheKey = `new-releases:${limit}`;
    const cached = this.getCache(this.newReleasesCache, cacheKey);
    if (cached) return cached;

    const token = await this.getSpotifyToken();

    try {
      const currentYear = new Date().getUTCFullYear();
      const response = await this.spotifyGet(`${SPOTIFY_API_URL}/browse/new-releases`, token, {
        params: {
          country: 'BR',
          limit: 50,
        },
      });

      const searchQueries = [`tag:new`, `year:${currentYear}`];
      const searchResponses = await this.mapWithConcurrency(searchQueries, 1, async (query) => {
        try {
          return await this.spotifyGet(`${SPOTIFY_API_URL}/search`, token, {
            params: {
              q: query,
              type: 'album',
              market: 'BR',
              limit: 50,
            },
          });
        } catch {
          return null;
        }
      });

      const releases: any[] = [
        ...(response.albums?.items || []),
        ...searchResponses.flatMap((searchResponse) => searchResponse?.albums?.items || []),
      ];

      const albumsOnly: any[] = this.dedupeAlbumsById(releases)
        .filter((album) => album?.album_type === 'album')
        .filter((album) => Number(album?.total_tracks || 0) >= 5)
        .filter((album) => this.isRecentRelease(album))
        .slice(0, 24);

      const detailedAlbums = await this.mapWithConcurrency(
        albumsOnly,
        3,
        async (album) => {
          try {
            const detail = await this.getAlbumDetails(album.id);
            const mainArtistId = detail?.artists?.[0]?.id || album.artists?.[0]?.id;
            const artist = mainArtistId ? await this.getArtistProfile(mainArtistId, token) : null;

            return {
              ...album,
              popularity: detail?.popularity || 0,
              artistPopularity: artist?.popularity || 0,
              artistFollowers: artist?.followers?.total || 0,
              total_tracks: detail?.total_tracks || album.total_tracks,
              images: detail?.images || album.images,
              artists: detail?.artists || album.artists,
            };
          } catch {
            return { ...album, popularity: 0, artistPopularity: 0, artistFollowers: 0 };
          }
        },
      );

      const recentDetailedAlbums = detailedAlbums.filter((album) => this.isRecentRelease(album));

      const knownReleases = recentDetailedAlbums.filter((album) => {
        const artistName = album.artists?.[0]?.name?.toLowerCase?.() || '';
        const isCompilation = artistName.includes('various artists') || artistName.includes('vários artistas');

        return !isCompilation && (
          (album.artistPopularity || 0) >= 55 ||
          (album.artistFollowers || 0) >= 250000 ||
          (album.popularity || 0) >= 45
        );
      });

      const rankedPool = knownReleases.length >= Math.min(limit, 5)
        ? knownReleases
        : recentDetailedAlbums;

      const ranked = rankedPool
        .sort((a, b) => {
          const score = (album: any) => {
            const artistFollowersScore = Math.min(Math.log10((album.artistFollowers || 0) + 1) * 9, 70);
            const trackBonus = Math.min(Number(album.total_tracks || 0), 14);
            const releaseAge = this.getReleaseAgeInDays(album) ?? 28;
            const recencyBonus = Math.max(28 - releaseAge, 0) * 2;

            return (
              (album.artistPopularity || 0) * 3 +
              (album.popularity || 0) * 2 +
              artistFollowersScore +
              trackBonus +
              recencyBonus
            );
          };

          const scoreDiff = score(b) - score(a);
          if (scoreDiff !== 0) return scoreDiff;
          return String(b.release_date || '').localeCompare(String(a.release_date || ''));
        })
        .slice(0, limit);

      this.setCache(this.newReleasesCache, cacheKey, ranked, 10 * 60 * 1000);
      return ranked;
    } catch (error) {
      this.logger.error(`Erro ao buscar lancamentos da semana: ${error.message}`);
      return [];
    }
  }

  async identifyAlbumCover(file: Express.Multer.File, userId?: number) {
    if (!file) {
      throw new BadRequestException('Nenhuma imagem enviada.');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Envie uma imagem da capa do album.');
    }

    const reservation = this.reserveLensUse(userId);
    if (!reservation.allowed) {
      return {
        found: false,
        provider: 'limit',
        reason: 'LENS_DAILY_LIMIT',
        message: `Voce atingiu o limite diario de ${reservation.usage.limit} buscas por foto no Musion Lens.`,
        identified: {
          albumTitle: '',
          artistName: '',
          confidence: 0,
          reasoning: 'Limite diario atingido.',
        },
        album: null,
        candidates: [],
        usage: reservation.usage,
      };
    }

    const provider = (this.configService.get<string>('MUSION_LENS_PROVIDER') || 'smart-free').toLowerCase();
    let result;

    if (['smart-free', 'smart', 'hybrid', 'ocr-plus'].includes(provider)) {
      const ocrResult = await this.identifyAlbumCoverWithOcr(file);

      if (ocrResult.found || !this.hasGeminiApiKey()) {
        return { ...ocrResult, provider: 'smart-free', usage: reservation.usage };
      }

      const geminiResult = await this.identifyAlbumCoverWithGemini(file);

      if (geminiResult.found) {
        return { ...geminiResult, provider: 'smart-free', usage: reservation.usage };
      }

      const candidateMap = new Map<string, any>();
      [...(ocrResult.candidates || []), ...(geminiResult.candidates || [])].forEach((album) => {
        if (album?.id && !candidateMap.has(album.id)) {
          candidateMap.set(album.id, album);
        }
      });

      return {
        ...ocrResult,
        provider: 'smart-free',
        message:
          'Nao consegui cravar a capa com seguranca. O Lens combinou OCR melhorado e Gemini, entao confira os candidatos abaixo.',
        candidates: Array.from(candidateMap.values()).slice(0, 5),
        usage: reservation.usage,
      };
    }

    if (provider === 'gemini') {
      result = await this.identifyAlbumCoverWithGemini(file);
      return { ...result, usage: reservation.usage };
    }

    if (provider === 'ocr') {
      result = await this.identifyAlbumCoverWithOcr(file);
      return { ...result, usage: reservation.usage };
    }

    if (provider !== 'openai') {
      result = await this.identifyAlbumCoverWithOcr(file);
      return { ...result, usage: reservation.usage };
    }

    const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    try {
      const response = await this.getOpenAIClient().chat.completions.create({
        model: this.configService.get<string>('OPENAI_VISION_MODEL') || 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 260,
        messages: [
          {
            role: 'system',
            content:
              'Voce identifica capas de albuns musicais. Responda somente JSON valido, sem markdown.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Analise esta imagem e tente reconhecer a capa do album. Retorne JSON com: albumTitle, artistName, confidence de 0 a 1, reasoning curto. Se nao souber, deixe albumTitle e artistName vazios e confidence baixo.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  detail: 'low',
                },
              },
            ],
          },
        ],
      });

      const content = response.choices?.[0]?.message?.content || '';
      const identified = this.parseVisionJSON(content);

      const albumTitle = String(identified?.albumTitle || '').trim();
      const artistName = String(identified?.artistName || '').trim();
      const confidence = Number(identified?.confidence || 0);

      result = await this.buildSpotifyLensResult({
        albumTitle,
        artistName,
        confidence,
        reasoning: identified?.reasoning || '',
        provider: 'openai',
      });
      return { ...result, usage: reservation.usage };
    } catch (error) {
      const status = error?.status || error?.response?.status;
      const message = String(error?.message || '');

      this.logger.error(`Erro no Musion Lens: ${message}`);

      if (status === 429 || message.toLowerCase().includes('quota')) {
        result = await this.identifyAlbumCoverWithOcr(
          file,
          'OpenAI sem cota. Usei o modo gratuito OCR para tentar reconhecer a capa.'
        );
        return { ...result, usage: reservation.usage };
      }

      if (message.includes('OPENAI_API_KEY')) {
        result = await this.identifyAlbumCoverWithOcr(
          file,
          'OpenAI nao configurada. Usei o modo gratuito OCR para tentar reconhecer a capa.'
        );
        return { ...result, usage: reservation.usage };
      }

      result = await this.identifyAlbumCoverWithOcr(
        file,
        'Nao consegui usar a visao por IA. Usei o modo gratuito OCR para tentar reconhecer a capa.'
      );
      return { ...result, usage: reservation.usage };
    }
  }

  async getAlbumDetails(albumId: string) {
    const cleanId = albumId.replace('spotify:album:', '');
    const cached = this.getCache(this.albumDetailsCache, cleanId);
    if (cached) return cached;

    const token = await this.getSpotifyToken();

    try {
      const album = await this.spotifyGet(`${SPOTIFY_API_URL}/albums/${cleanId}`, token, {
        params: { market: 'BR' },
      });

      this.setCache(this.albumDetailsCache, cleanId, album);
      return album;
    } catch (error) {
      this.logger.error(`Erro ao buscar detalhes do álbum ${cleanId}: ${error.message}`);
      return null;
    }
  }

  // ============================================================
  // 4. PEGAR GÊNEROS DE UM ARTISTA
  // ============================================================
  async getArtistGenres(artistId: string): Promise<string[]> {
    const cached = this.getCache(this.artistGenresCache, artistId);
    if (cached) return cached;

    const token = await this.getSpotifyToken();

    try {
      const artist = await this.spotifyGet(`${SPOTIFY_API_URL}/artists/${artistId}`, token);
      const genres = artist.genres || [];
      this.setCache(this.artistGenresCache, artistId, genres);
      return genres;
    } catch (error) {
      this.logger.error(`Erro ao buscar gêneros do artista ${artistId}: ${error.message}`);
      return [];
    }
  }

  // ============================================================
  // 5. BUSCAR ÁLBUNS POR GÊNERO
  // ============================================================
  async searchAlbumsByGenre(genre: string) {
    const cacheKey = `genre:${genre.toLowerCase()}`;
    const cached = this.getCache(this.searchCache, cacheKey);
    if (cached) return cached;

    const token = await this.getSpotifyToken();

    try {
      const data = await this.spotifyGet(`${SPOTIFY_API_URL}/search`, token, {
        params: {
          q: `genre:"${genre}"`,
          type: 'album',
          limit: 30,
          market: 'BR',
        },
      });

      const albums = data.albums?.items || [];
      this.setCache(this.searchCache, cacheKey, albums);
      return albums;
    } catch (error) {
      this.logger.error(`Erro ao buscar álbuns por gênero "${genre}": ${error.message}`);
      return [];
    }
  }

  // ============================================================
  // 6. NOVO — PEGAR ÁLBUNS DE UM ARTISTA
  // ============================================================
  async getArtistAlbums(artistId: string) {
    const cached = this.getCache(this.artistAlbumsCache, artistId);
    if (cached) return cached;

    const token = await this.getSpotifyToken();

    try {
      const data = await this.spotifyGet(`${SPOTIFY_API_URL}/artists/${artistId}/albums`, token, {
        params: {
          include_groups: 'album',
          market: 'BR',
          limit: 20,
        },
      });

      const albums = data.items || [];
      this.setCache(this.artistAlbumsCache, artistId, albums);
      return albums;
    } catch (error) {
      this.logger.error(`Erro ao buscar álbuns do artista ${artistId}: ${error.message}`);
      return [];
    }
  }

  // ============================================================
  // 7. NOVO — PEGAR ARTISTAS RELACIONADOS
  // ============================================================
  async getRelatedArtists(artistId: string) {
  const cached = this.getCache(this.relatedArtistsCache, artistId);
  if (cached) return cached;

  const token = await this.getSpotifyToken();

  try {
    const data = await this.spotifyGet(`${SPOTIFY_API_URL}/artists/${artistId}/related-artists`, token);

    const artists = data.artists || [];
    this.setCache(this.relatedArtistsCache, artistId, artists);
    return artists;
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

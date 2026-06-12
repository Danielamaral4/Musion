import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpotifyService } from '../spotify/spotify.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LastfmService } from '../lastfm/lastfm.service';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private spotifyService: SpotifyService,
    private notificationsService: NotificationsService,
    private lastfmService: LastfmService,
    private moderationService: ModerationService
  ) {}

  // ============================================================
  // 1. DADOS DO DASHBOARD (AGORA COM 3 BLOCOs DE RECOMENDAÇÃO)
  // ============================================================
  async getDashboardData(userId: number | null) {
    const popularRaw = await this.prisma.review.groupBy({
      by: ['albumId', 'albumName', 'albumCover', 'albumArtist'],
      _count: { albumId: true },
      _avg: { rating: true },
      orderBy: { _count: { albumId: 'desc' } },
      take: 10,
    });

    const topRatedRaw = await this.prisma.review.groupBy({
      by: ['albumId', 'albumName', 'albumCover', 'albumArtist'],
      _avg: { rating: true },
      having: { albumId: { _count: { gt: 0 } } },
      orderBy: { _avg: { rating: 'desc' } },
      take: 10,
    });

    // Recomendações baseadas nos 3 últimos reviews
    const becauseLast = { baseAlbumName: null, recommendations: [] };
    const becauseSecond = { baseAlbumName: null, recommendations: [] };
    const becauseThird = { baseAlbumName: null, recommendations: [] };

    return {
      popular: popularRaw.map(p => ({
        albumId: p.albumId,
        albumName: p.albumName,
        albumCover: p.albumCover,
        albumArtist: p.albumArtist,
        rating: p._avg.rating,
      })),

      topRated: topRatedRaw.map(p => ({
        albumId: p.albumId,
        albumName: p.albumName,
        albumCover: p.albumCover,
        albumArtist: p.albumArtist,
        rating: p._avg.rating,
      })),

      becauseLast,
      becauseSecond,
      becauseThird,
    };
  }

  // ============================================================
  // 2. FEED
  // ============================================================
  async getFeed(userId: number) {
    const blockedConnectionIds = await this.moderationService.getBlockedConnectionIds(userId);
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followingIds = following
      .map(f => f.followingId)
      .filter((id) => !blockedConnectionIds.includes(id));
    followingIds.push(userId);

    const feedReviews = await this.prisma.review.findMany({
      where: {
        userId: {
          in: followingIds,
          notIn: blockedConnectionIds,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        _count: { select: { likes: true, comments: true } },
        likes: {
          where: { userId },
          select: { userId: true }
        }
      }
    });

    return feedReviews.map(r => ({
      reviewId: r.id,
      albumId: r.albumId,
      albumName: r.albumName,
      albumCover: r.albumCover,
      albumArtist: r.albumArtist,
      rating: r.rating,
      text: r.text,
      createdAt: r.createdAt,

      userId: r.user.id,
      user: {
        username: r.user.username,
        displayName: r.user.displayName,
        avatar: r.user.avatarUrl,
      },

      likeCount: r._count.likes,
      commentCount: r._count.comments,
      isLiked: r.likes.length > 0,
      isMine: r.userId === userId
    }));
  }

  // ============================================================
  // 3. LIKE / UNLIKE
  // ============================================================
  async toggleLike(userId: number, reviewId: number) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review não encontrada');

    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_reviewId: { userId, reviewId },
      },
    });

    if (existingLike) {
      // UNLIKE: Remove a curtida
      await this.prisma.like.delete({
        where: {
          userId_reviewId: { userId, reviewId },
        },
      });
      return { status: 'unliked' };
    }

    // LIKE: Adiciona a curtida
    await this.prisma.like.create({
      data: { userId, reviewId },
    });

    // --- GATILHO DA NOTIFICAÇÃO ---
    // Avisa o dono da review que alguém curtiu (se não for o próprio dono curtindo)
    if (review.userId !== userId) {
      try {
        await this.notificationsService.createNotification(
          review.userId,    // Quem recebe (o dono da review)
          userId,           // Quem enviou (quem clicou no coração)
          'LIKE',           // Tipo de notificação
          reviewId,         // Qual review foi curtida
          review.albumName  // Nome do álbum
        );
      } catch (error) {
        console.error('Erro silencioso ao criar notificação de LIKE:', error);
      }
    }
    // --- FIM DO GATILHO ---

    return { status: 'liked' };
  }

  // ============================================================
  // 4. RECOMENDAÇÃO POR GÊNERO (mantive para compatibilidade)
  // ============================================================
  async recommendByGenre(userId: number) {
    const lastReview = await this.prisma.review.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastReview?.spotifyId) return [];

    const detail = await this.spotifyService.getAlbumDetails(lastReview.spotifyId);
    const mainArtist = detail?.artists?.[0];
    if (!mainArtist) return [];

    const genres = await this.spotifyService.getArtistGenres(mainArtist.id);
    if (!genres.length) return [];

    const primaryGenre = genres[0];
    const albums = await this.spotifyService.searchAlbumsByGenre(primaryGenre);

    const reviewed = await this.prisma.review.findMany({
      where: { userId },
      select: { spotifyId: true }
    });

    const setReviewed = new Set(
      reviewed.map(r => r.spotifyId).filter((id): id is string => typeof id === 'string')
    );

    return albums.filter(a => !setReviewed.has(a.id));
  }

  // ============================================================
  // 5. RECOMENDAÇÃO POR LIKES / NOTAS (mantive como está)
  // ============================================================
  async recommendByLikes(userId: number) {
    const favorites = await this.prisma.review.findMany({
      where: { userId, rating: { gte: 7 } },
      take: 5
    });

    type AlbumWithAvg = {
      albumId: string;
      albumName: string;
      albumArtist: string;
      albumCover: string | null;
      spotifyId: string | null;
      _avg: { rating: number | null };
    };

    const recommended: AlbumWithAvg[] = [];

    for (const fav of favorites) {
      if (!fav.spotifyId) continue;

      const detail = await this.spotifyService.getAlbumDetails(fav.spotifyId);
      const artist = detail?.artists?.[0]?.name;
      if (!artist) continue;

      // Busca outros álbuns do mesmo artista
      const similar = await this.prisma.review.groupBy({
        by: ['albumId', 'albumName', 'albumArtist', 'albumCover', 'spotifyId'],
        where: { albumArtist: artist },
        _avg: { rating: true },
        orderBy: { _avg: { rating: 'desc' } },
        take: 5
      });

      recommended.push(...similar);
    }
    const reviewed = await this.prisma.review.findMany({
      where: { userId },
      select: { albumId: true }
    });

    const reviewedSet = new Set(reviewed.map(r => r.albumId));

    return recommended.filter(r => !reviewedSet.has(r.albumId));
  }

  // ============================================================
  // 6. RECOMENDAÇÕES BASEADAS NO N-ÉSIMO REVIEW (GENÉRICA)
  //    - n = 1 -> último
  //    - n = 2 -> penúltimo
  //    - n = 3 -> antepenúltimo
  // ============================================================
  private emptyRecommendations(baseAlbumName: string | null = null) {
    return { baseAlbumName, recommendations: [] };
  }

  private normalizeAlbumTitle(name = '') {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\([^)]*\)|\[[^\]]*\]/g, '')
      .replace(/\b(expanded|remaster(ed)?|anniversary|edition|version|acoustic|acustico|instrumental|karaoke|commentary|live|ao vivo|remix|single|ep)\b/g, '')
      .replace(/[-_:].*$/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private normalizeArtistName(name = '') {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private primaryArtistName(album: any) {
    return album?.artists?.[0]?.name || album?.albumArtist || album?.artistName || '';
  }

  private albumKey(album: any) {
    return `${this.normalizeArtistName(this.primaryArtistName(album))}:${this.normalizeAlbumTitle(album?.name || album?.albumName || '')}`;
  }

  private albumYear(album: any) {
    const year = Number((album?.release_date || '').slice(0, 4));
    return Number.isFinite(year) ? year : 0;
  }

  private async getReviewedAlbumKeys(userId: number) {
    const reviewed = await this.prisma.review.findMany({
      where: { userId },
      select: { spotifyId: true, albumName: true, albumArtist: true },
    });

    return {
      ids: new Set(
        reviewed
          .map((r) => r.spotifyId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      ),
      keys: new Set(
        reviewed
          .map((r) => this.albumKey({ name: r.albumName, albumArtist: r.albumArtist }))
          .filter((key) => !key.endsWith(':'))
      ),
    };
  }

  private buildTagQueries(tags: any[], genres: string[]) {
    const blockedTags = new Set([
      'seen live',
      'favorites',
      'favourite',
      'favorite',
      'albums i own',
      'spotify',
      'lastfm',
      'all',
    ]);

    const normalizedTags = tags
      .map((tag) => String(tag?.name || '').toLowerCase().trim())
      .filter((tag) => tag && tag.length <= 32 && !blockedTags.has(tag));

    return Array.from(new Set([...genres.slice(0, 4), ...normalizedTags])).slice(0, 7);
  }

  private addAlbumCandidates(bucket: Map<string, any>, albums: any[], relevance: number) {
    for (const album of albums) {
      if (!album?.id || !album?.name) continue;

      const key = this.albumKey(album);
      if (!key || key.endsWith(':')) continue;

      const candidate = {
        ...album,
        relevance: Math.max(Number(album.relevance || 0), relevance),
      };

      const current = bucket.get(key);
      if (
        !current ||
        candidate.relevance > current.relevance ||
        (candidate.relevance === current.relevance && this.albumYear(candidate) > this.albumYear(current))
      ) {
        bucket.set(key, candidate);
      }
    }
  }

  private blockRecommendations(result: any, blockedIds: Set<string>, blockedKeys: Set<string>) {
    for (const album of result?.recommendations || []) {
      if (album?.id) blockedIds.add(album.id);
      const key = this.albumKey(album);
      if (key && !key.endsWith(':')) blockedKeys.add(key);
    }
  }

  private async getRecommendationBaseReviews(userId: number, limit = 3) {
    const positiveReviews = await this.prisma.review.findMany({
      where: {
        userId,
        rating: { gte: 7 },
        spotifyId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    if (positiveReviews.length >= limit) {
      return positiveReviews;
    }

    const usedIds = positiveReviews.map((review) => review.id);
    const fallbackReviews = await this.prisma.review.findMany({
      where: {
        userId,
        spotifyId: { not: null },
        id: usedIds.length ? { notIn: usedIds } : undefined,
      },
      orderBy: [
        { rating: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit - positiveReviews.length,
    });

    return [...positiveReviews, ...fallbackReviews].slice(0, limit);
  }

  private async getCommunityRecommendationAlbums(
    userId: number,
    targetReview: any,
    baseArtistName: string,
    similarArtistNames: string[] = []
  ) {
    const reviewed = await this.getReviewedAlbumKeys(userId);
    const baseArtist = this.normalizeArtistName(baseArtistName);
    const similarArtistSet = new Set(
      similarArtistNames.map((artist) => this.normalizeArtistName(artist))
    );

    const similarUserRows = await this.prisma.review.findMany({
      where: {
        albumId: targetReview.albumId,
        userId: { not: userId },
        rating: { gte: 7 },
      },
      select: { userId: true },
      take: 80,
    });

    const similarUserIds = Array.from(new Set(similarUserRows.map((row) => row.userId)));
    const collaborativeAlbums = similarUserIds.length
      ? await this.prisma.review.groupBy({
          by: ['albumId', 'albumName', 'albumArtist', 'albumCover', 'spotifyId'],
          where: {
            userId: { in: similarUserIds },
            rating: { gte: 7 },
            albumId: { not: targetReview.albumId },
          },
          _avg: { rating: true },
          _count: { albumId: true },
          orderBy: [
            { _count: { albumId: 'desc' } },
            { _avg: { rating: 'desc' } },
          ],
          take: 80,
        })
      : [];

    const fallbackAlbums = collaborativeAlbums.length >= 12
      ? []
      : await this.prisma.review.groupBy({
          by: ['albumId', 'albumName', 'albumArtist', 'albumCover', 'spotifyId'],
          where: {
            rating: { gte: 7 },
            albumId: { not: targetReview.albumId },
          },
          _avg: { rating: true },
          _count: { albumId: true },
          orderBy: [
            { _avg: { rating: 'desc' } },
            { _count: { albumId: 'desc' } },
          ],
          take: 60,
        });

    const albums = [...collaborativeAlbums, ...fallbackAlbums];

    return albums
      .filter((album) => {
        const artist = this.normalizeArtistName(album.albumArtist);
        const key = this.albumKey({
          name: album.albumName,
          albumArtist: album.albumArtist,
        });

        return (
          artist !== baseArtist &&
          !reviewed.keys.has(key) &&
          (!album.spotifyId || !reviewed.ids.has(album.spotifyId))
        );
      })
      .map((album) => {
        const artist = this.normalizeArtistName(album.albumArtist);
        const similarArtistBonus = similarArtistSet.has(artist) ? 1.2 : 0;
        const communityCount = album._count.albumId || 0;
        const avgRating = album._avg.rating || 0;

        return {
          id: album.spotifyId || album.albumId,
          name: album.albumName,
          artists: [{ name: album.albumArtist }],
          images: album.albumCover ? [{ url: album.albumCover }] : [],
          release_date: null,
          relevance: 3.2 + similarArtistBonus + Math.min(communityCount * 0.18, 1.2) + Math.max(avgRating - 7, 0) * 0.2,
          rating: avgRating || null,
        };
      });
  }

  private pickDiverseAlbums(albums: any[], blockedIds: Set<string>, blockedKeys: Set<string>, baseArtistName: string, limit: number) {
    const uniqueByAlbum = new Map<string, any>();
    const baseArtist = this.normalizeArtistName(baseArtistName);

    for (const album of albums) {
      if (!album?.id || !album?.name) continue;
      if (album.album_type && album.album_type !== 'album') continue;
      if (album.total_tracks && album.total_tracks < 5) continue;
      if (blockedIds.has(album.id)) continue;

      const artist = this.normalizeArtistName(this.primaryArtistName(album));
      if (!artist || artist === baseArtist) continue;

      const key = this.albumKey(album);
      if (!key || blockedKeys.has(key)) continue;

      const current = uniqueByAlbum.get(key);
      if (!current || album.relevance > current.relevance || (album.relevance === current.relevance && this.albumYear(album) > this.albumYear(current))) {
        uniqueByAlbum.set(key, album);
      }
    }

    const artistCounts = new Map<string, number>();

    const sorted = Array.from(uniqueByAlbum.values())
      .sort((a, b) => (b.relevance - a.relevance) || (this.albumYear(b) - this.albumYear(a)))
      .filter((album) => {
        const artist = this.normalizeArtistName(this.primaryArtistName(album));
        const currentCount = artistCounts.get(artist) || 0;
        const maxPerArtist = 1;

        if (currentCount >= maxPerArtist) return false;

        artistCounts.set(artist, currentCount + 1);
        return true;
      });

    if (sorted.length >= limit) return sorted.slice(0, limit);

    const selectedKeys = new Set(sorted.map((album) => this.albumKey(album)));
    const relaxedArtistCounts = new Map<string, number>();

    for (const album of sorted) {
      const artist = this.normalizeArtistName(this.primaryArtistName(album));
      relaxedArtistCounts.set(artist, (relaxedArtistCounts.get(artist) || 0) + 1);
    }

    for (const album of Array.from(uniqueByAlbum.values()).sort((a, b) => (b.relevance - a.relevance) || (this.albumYear(b) - this.albumYear(a)))) {
      if (sorted.length >= limit) break;

      const key = this.albumKey(album);
      if (selectedKeys.has(key)) continue;

      const artist = this.normalizeArtistName(this.primaryArtistName(album));
      const currentCount = relaxedArtistCounts.get(artist) || 0;
      const maxPerArtist = 2;

      if (currentCount >= maxPerArtist) continue;

      sorted.push(album);
      selectedKeys.add(key);
      relaxedArtistCounts.set(artist, currentCount + 1);
    }

    return sorted.slice(0, limit);
  }

  private async recommendFromReview(
    userId: number,
    targetReview: any,
    limit = 5,
    extraBlockedIds: Set<string> = new Set(),
    extraBlockedKeys: Set<string> = new Set()
  ) {
    if (!targetReview?.spotifyId) {
      return this.emptyRecommendations(targetReview?.albumName || null);
    }

    const albumDetail: any = await this.spotifyService.getAlbumDetails(targetReview.spotifyId);
    if (!albumDetail) return this.emptyRecommendations(targetReview.albumName || null);

    const mainArtist = albumDetail.artists?.[0];
    if (!mainArtist) return this.emptyRecommendations(albumDetail.name || targetReview.albumName || null);

    const artistId: string = mainArtist.id;
    const artistName: string = mainArtist.name;
    const albumName: string = albumDetail.name || targetReview.albumName || '';

    const [relatedArtists, genres, reviewed, lastfmArtists, artistTags, albumTags] = await Promise.all([
      this.spotifyService.getRelatedArtists(artistId),
      this.spotifyService.getArtistGenres(artistId),
      this.getReviewedAlbumKeys(userId),
      this.lastfmService.getSimilarArtists(artistName, 12),
      this.lastfmService.getArtistTags(artistName, 8),
      this.lastfmService.getAlbumTags(artistName, albumName, 8),
    ]);

    const tagQueries = this.buildTagQueries([...albumTags, ...artistTags], genres);
    const lastfmArtistNames = lastfmArtists.map((artist) => artist.name);

    const [
      relatedAlbumsRaw,
      lastfmArtistAlbumsRaw,
      genreAlbumsRaw,
      tagSearchRaw,
      communityAlbums,
      sameArtistRaw,
    ] = await Promise.all([
      Promise.all(
        relatedArtists
          .slice(0, 5)
          .map((artist) => this.spotifyService.getArtistAlbums(artist.id))
      ),
      Promise.all(
        lastfmArtists
          .slice(0, 6)
          .map(async (artist) => {
            const albums = await this.spotifyService.searchAlbumsByArtistName(artist.name, 10);
            return albums.map((album) => ({
              ...album,
              relevance: 4.8 + Math.min(Number(artist.match || 0) * 2, 1.4),
            }));
          })
      ),
      Promise.all(
        genres
          .slice(0, 3)
          .map((genre) => this.spotifyService.searchAlbumsByGenre(genre))
      ),
      Promise.all(
        tagQueries
          .slice(0, 3)
          .map((tag) => this.spotifyService.searchAlbums(tag))
      ),
      this.getCommunityRecommendationAlbums(userId, targetReview, artistName, lastfmArtistNames),
      this.spotifyService.getArtistAlbums(artistId),
    ]);

    const candidateBucket = new Map<string, any>();

    this.addAlbumCandidates(candidateBucket, lastfmArtistAlbumsRaw.flat(), 4.8);
    this.addAlbumCandidates(
      candidateBucket,
      relatedAlbumsRaw.flat().map((album) => ({ ...album, relevance: 4.2 })),
      4.2
    );
    this.addAlbumCandidates(candidateBucket, communityAlbums, 3.4);
    this.addAlbumCandidates(
      candidateBucket,
      genreAlbumsRaw.flat().map((album) => ({ ...album, relevance: 2.7 })),
      2.7
    );
    this.addAlbumCandidates(
      candidateBucket,
      tagSearchRaw.flat().map((album) => ({ ...album, relevance: 2.4 })),
      2.4
    );
    this.addAlbumCandidates(
      candidateBucket,
      sameArtistRaw.map((album) => ({ ...album, relevance: 1.2 })),
      1.2
    );

    const blockedIds = new Set([...reviewed.ids, ...extraBlockedIds]);
    const blockedKeys = new Set([...reviewed.keys, ...extraBlockedKeys]);
    blockedIds.add(albumDetail.id);
    blockedKeys.add(this.albumKey(albumDetail));

    const sliced = this.pickDiverseAlbums(
      Array.from(candidateBucket.values()),
      blockedIds,
      blockedKeys,
      artistName,
      limit
    );

    return {
      baseAlbumName: albumDetail.name || targetReview.albumName || null,
      recommendations: sliced.map((album) => ({
        id: album.id,
        name: album.name,
        artists: album.artists,
        images: album.images,
        release_date: album.release_date,
        rating: album.rating ?? null,
      })),
    };
  }

  private async recommendFromNth(userId: number, n: number, limit = 5) {
    const selectedReviews = await this.getRecommendationBaseReviews(userId, n);

    if (!selectedReviews || selectedReviews.length < n) {
      return this.emptyRecommendations();
    }

    return this.recommendFromReview(userId, selectedReviews[n - 1], limit);
    /*
    // Pega os n reviews mais recentes
    const reviews = await this.prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: n,
    });

    if (!reviews || reviews.length < n) {
      // Não há review suficiente para a posição n
      return { baseAlbumName: null, recommendations: [] };
    }

    const targetReview = reviews[n - 1];
    if (!targetReview?.spotifyId) {
      // se não houver spotifyId, não conseguimos usar Spotify como fonte
      return { baseAlbumName: targetReview.albumName || null, recommendations: [] };
    }

    // Detalhes do álbum base
    const albumDetail: any = await this.spotifyService.getAlbumDetails(targetReview.spotifyId);
    if (!albumDetail) return { baseAlbumName: targetReview.albumName || null, recommendations: [] };

    const mainArtist = albumDetail.artists?.[0];
    if (!mainArtist) return { baseAlbumName: albumDetail.name || targetReview.albumName || null, recommendations: [] };

    const artistId: string = mainArtist.id;
    const artistName: string = mainArtist.name;

    // 1) Álbuns do mesmo artista
    const sameArtistRaw: any[] = await this.spotifyService.getArtistAlbums(artistId);
    const sameArtistAlbums: any[] = sameArtistRaw.map(a => ({ ...a, relevance: 3 }));

    // 2) Artistas relacionados (pode ser empty)
    const relatedArtists: any[] = await this.spotifyService.getRelatedArtists(artistId);
    let relatedAlbums: any[] = [];
    if (relatedArtists.length > 0) {
      const relatedRaw: any[][] = await Promise.all(
        relatedArtists.slice(0, 5).map(a => this.spotifyService.getArtistAlbums(a.id))
      );
      relatedAlbums = relatedRaw.flat().map(a => ({ ...a, relevance: 2 }));
    }

    // 3) Fallback prático quando relatedArtists vazio
    let fallbackAlbums: any[] = [];
    if (relatedArtists.length === 0) {
      const genres: string[] = await this.spotifyService.getArtistGenres(artistId);
      const primaryGenre: string | null = genres[0] || null;

      const similarName: any[] = await this.spotifyService.searchAlbums(artistName);
      const genreFallback: any[] = primaryGenre ? await this.spotifyService.searchAlbumsByGenre(primaryGenre) : [];

      fallbackAlbums = [
        ...similarName.map(a => ({ ...a, relevance: 2 })),
        ...genreFallback.map(a => ({ ...a, relevance: 1 })),
      ];
    }

    // Combina tudo
    const combined: any[] = [...sameArtistAlbums, ...relatedAlbums, ...fallbackAlbums];

    // Unifica por id mantendo maior relevance
    const unique = new Map<string, any>();
    for (const album of combined) {
      const id = album.id;
      if (!unique.has(id)) unique.set(id, album);
      else if (album.relevance > unique.get(id).relevance) unique.set(id, album);
    }

    let finalList: any[] = Array.from(unique.values());

    // Remove álbuns já avaliados pelo usuário
    const reviewed = await this.prisma.review.findMany({
      where: { userId },
      select: { spotifyId: true },
    });

    const reviewedSet = new Set<string>(
      reviewed.map(r => r.spotifyId).filter((id): id is string => typeof id === 'string')
    );

    finalList = finalList.filter(a => !reviewedSet.has(a.id));

    // Ordena por relevance e corta no limite (default 5)
    finalList.sort((a, b) => b.relevance - a.relevance);

    const sliced = finalList.slice(0, limit);

    // RETORNA no formato que o frontend espera
    return {
      baseAlbumName: albumDetail.name || targetReview.albumName || null,
      recommendations: sliced.map(a => ({
        id: a.id,
        name: a.name,
        artists: a.artists,
        images: a.images,
        release_date: a.release_date,
        rating: null,
      }))
    };
    */
  }

  // Wrappers convenientes
  async recommendRecent(userId: number) {
    const reviews = await this.getRecommendationBaseReviews(userId, 3);
    const blockedIds = new Set<string>();
    const blockedKeys = new Set<string>();

    const last = reviews[0]
      ? await this.recommendFromReview(userId, reviews[0], 7, blockedIds, blockedKeys)
      : this.emptyRecommendations();
    this.blockRecommendations(last, blockedIds, blockedKeys);

    const second = reviews[1]
      ? await this.recommendFromReview(userId, reviews[1], 7, blockedIds, blockedKeys)
      : this.emptyRecommendations();
    this.blockRecommendations(second, blockedIds, blockedKeys);

    const third = reviews[2]
      ? await this.recommendFromReview(userId, reviews[2], 7, blockedIds, blockedKeys)
      : this.emptyRecommendations();
    this.blockRecommendations(third, blockedIds, blockedKeys);

    return { last, second, third };
  }

  async recommendLast(userId: number) {
    return this.recommendFromNth(userId, 1, 7);
  }

  async recommendSecond(userId: number) {
    return this.recommendFromNth(userId, 2, 7);
  }

  async recommendThird(userId: number) {
    return this.recommendFromNth(userId, 3, 7);
  }

}

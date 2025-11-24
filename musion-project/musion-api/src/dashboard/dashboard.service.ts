import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpotifyService } from '../spotify/spotify.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private spotifyService: SpotifyService
  ) {}

  // ============================================================
  // 1. DADOS DO DASHBOARD (AGORA COM 3 BLOCOs DE RECOMENDAÇÃO)
  // ============================================================
  async getDashboardData(userId: number) {
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
    const becauseLast = await this.recommendLast(userId);
    const becauseSecond = await this.recommendSecond(userId);
    const becauseThird = await this.recommendThird(userId);

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
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);
    followingIds.push(userId);

    const feedReviews = await this.prisma.review.findMany({
      where: { userId: { in: followingIds } },
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
        _count: { select: { likes: true } },
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
      await this.prisma.like.delete({
        where: {
          userId_reviewId: { userId, reviewId },
        },
      });
      return { status: 'unliked' };
    }

    await this.prisma.like.create({
      data: { userId, reviewId },
    });

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
  private async recommendFromNth(userId: number, n: number, limit = 5) {
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
  }

  // Wrappers convenientes
  async recommendLast(userId: number) {
    return this.recommendFromNth(userId, 1, 5);
  }

  async recommendSecond(userId: number) {
    return this.recommendFromNth(userId, 2, 5);
  }

  async recommendThird(userId: number) {
    return this.recommendFromNth(userId, 3, 5);
  }

}

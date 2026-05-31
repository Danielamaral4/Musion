import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReviewShare } from '../components/ReviewShareCard';
import api from '../services/api';
import { confirmBlockUser, openReportPrompt } from '../services/moderation';

export function AlbumDetailsScreen({ route, navigation }) {
  const { id } = route.params;
  const { shareReviewCard, ShareReviewHost } = useReviewShare();

  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [loadingTrackId, setLoadingTrackId] = useState(null);
  const soundRef = useRef(null);

  const msToMinutes = (ms) => {
    if (!ms) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const getRatingColor = (r) => {
    const n = parseFloat(r);
    if (isNaN(n)) return '#333333';
    if (n <= 3.9) return '#F20505';
    if (n <= 6.9) return '#F2CB05';
    return '#37A603';
  };

  const formatRating = (r) => {
    const n = parseFloat(r);
    return isNaN(n) ? '-' : n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
  };

  const formatTime = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const nw = new Date();
    const diff = Math.floor((nw - dt) / 1000);

    if (diff < 60) return 'Agora';
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)} h`;

    return dt.toLocaleDateString('pt-BR');
  };

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const token = await AsyncStorage.getItem('musion_token');
        const headers = { Authorization: `Bearer ${token}` };

        const albumRes = await api.get(`/spotify/album/${id}`, { headers });
        const albumData = albumRes.data;

        setAlbum(albumData);

        if (albumData.tracks?.items) {
          setTracks(albumData.tracks.items);
        }

        const reviewsRes = await api.get(`/reviews/album/${id}`, { headers });
        let reviewsList = [];

        if (Array.isArray(reviewsRes.data)) {
          reviewsList = reviewsRes.data;
          setAverageRating(null);
        } else if (reviewsRes.data && Array.isArray(reviewsRes.data.reviews)) {
          reviewsList = reviewsRes.data.reviews;
          setAverageRating(reviewsRes.data.averageRating);
        }

        setReviews(reviewsList);
        setMyReview(reviewsList.find((review) => review.isMine) || null);
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar os dados do álbum.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerAll]}>
        <ActivityIndicator size="large" color="#1DB954" />
      </SafeAreaView>
    );
  }

  if (error || !album) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerAll]}>
        <Text style={{ color: 'white' }}>{error || 'Álbum não encontrado.'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#1DB954' }}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalDurationMs = tracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0);
  const artistNames = album.artists?.map((a) => a.name).join(', ');

  const getCommentCount = (item) => {
    const count =
      item.commentCount ??
      item.commentsCount ??
      item.comments_count ??
      item.totalComments ??
      item.comments?.length ??
      item._count?.comments;

    const parsedCount = Number(count);
    return Number.isFinite(parsedCount) ? parsedCount : 0;
  };

  const getAlbumPayload = () => ({
    id: album.id || id,
    name: album.name,
    artistName: artistNames || album.artists?.[0]?.name || 'Artista',
    imageUrl: album.images?.[0]?.url || 'https://i.stack.imgur.com/l60Hf.png',
    releaseDate: album.release_date,
    totalTracks: album.total_tracks || tracks.length || 0,
    totalDurationMin: Math.floor(totalDurationMs / 60000),
  });

  const getReviewData = (review) => {
    const userObj = review.user || {};

    return {
      ...review,
      reviewId: review.id || review.reviewId,
      albumId: review.albumId || album.id || id,
      spotifyId: review.spotifyId || review.albumId || album.id || id,
      albumName: review.albumName || album.name,
      albumCover: review.albumCover || album.images?.[0]?.url,
      albumArtist: review.albumArtist || artistNames,
      userId: review.userId || userObj.id,
      user: {
        id: userObj.id || review.userId,
        username: userObj.username,
        displayName: userObj.displayName,
        avatar: userObj.avatarUrl || userObj.avatar,
        avatarUrl: userObj.avatarUrl || userObj.avatar,
      },
    };
  };

  const openReviewForm = () => {
    if (myReview) {
      navigation.navigate('AddReview', {
        reviewToEdit: {
          ...getReviewData(myReview),
          id: myReview.id || myReview.reviewId,
        },
        returnToAlbum: true,
      });
      return;
    }

    navigation.navigate('AddReview', {
      albumToReview: getAlbumPayload(),
      returnToAlbum: true,
    });
  };

  const goToPost = (review) => {
    const reviewId = review.id || review.reviewId;

    if (reviewId) {
      navigation.navigate('PostScreen', {
        reviewId,
        reviewData: getReviewData(review),
      });
    }
  };

  const toggleLike = async (review) => {
    const reviewId = review.id || review.reviewId;

    setReviews((prev) =>
      prev.map((item) =>
        (item.id || item.reviewId) === reviewId
          ? {
              ...item,
              isLiked: !item.isLiked,
              likeCount: item.isLiked
                ? Math.max((item.likeCount || 0) - 1, 0)
                : (item.likeCount || 0) + 1,
            }
          : item
      )
    );

    try {
      await api.post(`/dashboard/review/${reviewId}/like`, {});
    } catch (err) {
      console.error(err);
      setReviews((prev) =>
        prev.map((item) =>
          (item.id || item.reviewId) === reviewId
            ? {
                ...item,
                isLiked: !item.isLiked,
                likeCount: item.isLiked
                  ? Math.max((item.likeCount || 0) - 1, 0)
                  : (item.likeCount || 0) + 1,
              }
            : item
        )
      );
    }
  };

  const handleReviewOptions = (review) => {
    const reviewId = review.id || review.reviewId;
    const userObj = review.user || {};
    const userIdToBlock = userObj.id || review.userId;

    if (review.isMine) {
      navigation.navigate('AddReview', {
        reviewToEdit: {
          ...getReviewData(review),
          id: reviewId,
        },
        returnToAlbum: true,
      });
      return;
    }

    Alert.alert('Opções do Review', 'O que você deseja fazer?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Compartilhar como Story',
        onPress: () => shareReviewCard(getReviewData(review)),
      },
      {
        text: 'Denunciar Review',
        onPress: () =>
          openReportPrompt({
            targetType: 'REVIEW',
            targetId: reviewId,
          }),
      },
      {
        text: 'Bloquear usuário',
        style: 'destructive',
        onPress: () =>
          confirmBlockUser({
            userId: userIdToBlock,
            username: userObj.username,
            onSuccess: () => {
              setReviews((prev) =>
                prev.filter((item) => {
                  const itemUser = item.user || {};
                  return (itemUser.id || item.userId) !== userIdToBlock;
                })
              );
            },
          }),
      },
    ]);
  };

  const openSpotifyUrl = async (url) => {
    if (!url) {
      Alert.alert('Spotify', 'Link do Spotify indisponível para este item.');
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Spotify', 'Não foi possível abrir o Spotify agora.');
    }
  };

  const stopCurrentPreview = async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
    } catch (err) {
      console.log('Erro ao parar preview:', err?.message);
    } finally {
      soundRef.current = null;
      setPlayingTrackId(null);
    }
  };

  const getTrackPreviewUrl = async (track) => {
    if (track.preview_url) {
      return track.preview_url;
    }

    const response = await api.get('/spotify/track-preview', {
      params: {
        track: track.name,
        artist: track.artists?.[0]?.name || artistNames,
      },
    });

    return response.data?.previewUrl || null;
  };

  const handleTrackAction = async (track) => {
    const trackId = track.id || track.uri || track.name;

    if (playingTrackId === trackId) {
      await stopCurrentPreview();
      return;
    }

    setLoadingTrackId(trackId);

    try {
      await stopCurrentPreview();
      const previewUrl = await getTrackPreviewUrl(track);

      if (!previewUrl) {
        openSpotifyUrl(track.external_urls?.spotify);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setPlayingTrackId(trackId);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status?.didJustFinish) {
          stopCurrentPreview();
        }
      });
    } catch (err) {
      Alert.alert('Prévia indisponível', 'Não foi possível tocar a prévia dessa faixa.');
    } finally {
      setLoadingTrackId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['rgba(222, 224, 232, 0.11)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.38 }}
        style={styles.backgroundGlow}
        pointerEvents="none"
      />

      <TouchableOpacity style={styles.floatingBackButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color="#DEE0E8" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.albumSummaryCard}>
          <View style={styles.heroSection}>
            <Image
              source={{ uri: album.images?.[0]?.url || 'https://i.stack.imgur.com/l60Hf.png' }}
              style={styles.cardImageDetails}
            />

            <View style={styles.infoRow}>
              <View style={styles.textCol}>
                <Text style={styles.dashTitleDetails} numberOfLines={2}>
                  {album.name}
                </Text>
                <Text style={styles.dashArtistDetails} numberOfLines={1}>
                  {artistNames}
                </Text>
              </View>

              {averageRating !== null && averageRating !== undefined && (
                <View style={[styles.ratingSquare, { backgroundColor: getRatingColor(averageRating) }]}>
                  <Text style={styles.ratingSquareText}>{formatRating(averageRating)}</Text>
                </View>
              )}
            </View>

            <View style={styles.albumMetaInfo}>
              <Text style={styles.metaText}>{album.release_date?.substring(0, 4)}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{album.total_tracks} Músicas</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{msToMinutes(totalDurationMs)}</Text>
            </View>

            <View style={styles.albumActions}>
              <TouchableOpacity style={styles.reviewButton} onPress={openReviewForm} activeOpacity={0.82}>
              <Ionicons name="pencil" size={18} color="#18191D" />
              <Text style={styles.reviewButtonText}>
                {myReview ? 'Editar Avaliação' : 'Avaliar Álbum'}
              </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.spotifyButton}
                onPress={() => openSpotifyUrl(album.external_urls?.spotify)}
                activeOpacity={0.82}
              >
                <FontAwesome name="spotify" size={24} color="#1DB954" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Faixas</Text>
          {tracks.map((track, idx) => (
            <View key={track.id || `${track.name}-${idx}`} style={styles.trackItem}>
              <View style={styles.trackTextBlock}>
                <Text style={styles.trackName} numberOfLines={1}>
                  {idx + 1}. {track.name}
                </Text>
              </View>

              <View style={styles.trackRight}>
                <Text style={styles.trackDuration}>{msToMinutes(track.duration_ms)}</Text>

                {(track.preview_url || track.external_urls?.spotify || track.name) && (
                  <TouchableOpacity
                    style={styles.trackActionButton}
                    onPress={() => handleTrackAction(track)}
                    activeOpacity={0.78}
                    disabled={loadingTrackId === (track.id || track.uri || track.name)}
                  >
                    {loadingTrackId === (track.id || track.uri || track.name) ? (
                      <ActivityIndicator size="small" color="#DEE0E8" />
                    ) : (
                      <Ionicons
                        name={
                          playingTrackId === (track.id || track.uri || track.name)
                            ? 'pause'
                            : 'play'
                        }
                        size={16}
                        color="#DEE0E8"
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.sectionContainer, styles.communityReviewsSection, { paddingHorizontal: 0 }]}>
          <Text style={[styles.sectionTitle, { marginLeft: 16 }]}>Reviews da Comunidade</Text>

          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>Seja o primeiro a avaliar este álbum!</Text>
          ) : (
            reviews.map((review, index) => {
              const reviewId = review.id || review.reviewId || index;
              const userObj = review.user || {};
              const userAvatar =
                userObj.avatarUrl || userObj.avatar || 'https://i.stack.imgur.com/l60Hf.png';
              const realName =
                userObj.name || userObj.nome || userObj.displayName || userObj.username || 'Usuário';
              const username = userObj.username || 'user';
              const userIdToNav = userObj.id || review.userId;
              const commentCount = getCommentCount(review);

              return (
                <View key={reviewId} style={styles.cardWrapper}>
                  <View style={StyleSheet.absoluteFill}>
                    <LinearGradient
                      colors={['transparent', 'rgba(222, 224, 232, 0.1)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      colors={['transparent', '#18191D']}
                      start={{ x: 0.5, y: 0.02 }}
                      end={{ x: 0.5, y: 0.9 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>

                  <View style={styles.topFilament} />

                  <View style={styles.reviewCard}>
                    <View style={styles.cardHeader}>
                      <TouchableOpacity
                        style={styles.userInfoClickable}
                        onPress={() => navigation.navigate('Profile', { id: userIdToNav })}
                        activeOpacity={0.75}
                      >
                        <Image source={{ uri: userAvatar }} style={styles.avatar} />
                        <View style={styles.userInfo}>
                          <Text style={styles.displayName} numberOfLines={1}>
                            {realName}
                          </Text>
                          {username && (
                            <Text style={styles.username} numberOfLines={1}>
                              @{username}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>

                      <View style={styles.headerRight}>
                        <Text style={styles.timestamp}>{formatTime(review.createdAt)}</Text>
                        <TouchableOpacity
                          onPress={() => handleReviewOptions(review)}
                          style={styles.optionsIconArea}
                        >
                          <Ionicons name="ellipsis-vertical" size={16} color="#55565C" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.cardBody}
                      activeOpacity={0.8}
                      onPress={() => goToPost(review)}
                    >
                      <Image
                        source={{
                          uri: review.albumCover || album.images?.[0]?.url || 'https://i.stack.imgur.com/l60Hf.png',
                        }}
                        style={styles.albumCover}
                      />

                      <View style={styles.contentWrapper}>
                        <View style={styles.titleRow}>
                          <Text style={styles.albumName} numberOfLines={2}>
                            {review.albumName || album.name}
                          </Text>
                          <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(review.rating) }]}>
                            <Text style={styles.ratingTextFeed}>{formatRating(review.rating)}</Text>
                          </View>
                        </View>
                        <Text style={styles.reviewText}>{review.text}</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.cardFooter}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => goToPost(review)}>
                        <Ionicons name="chatbubble-outline" size={20} color="#55565C" />
                        <Text style={[styles.actionText, styles.commentActionText]}>{commentCount}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => shareReviewCard(getReviewData(review))}
                      >
                        <Ionicons name="share-social-outline" size={20} color="#55565C" />
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.actionButton} onPress={() => toggleLike(review)}>
                        <Ionicons
                          name={review.isLiked ? 'heart' : 'heart-outline'}
                          size={22}
                          color={review.isLiked ? '#FFF' : '#55565C'}
                        />
                        {review.likeCount > 0 && (
                          <Text style={styles.actionText}>{review.likeCount}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
      <ShareReviewHost />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#18191D',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  centerAll: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 60,
  },
  albumSummaryCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: '#18191D',
    borderWidth: 1.5,
    borderColor: '#dee0e831',
    borderRadius: 8,
    shadowColor: '#DEE0E8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
  heroSection: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  cardImageDetails: {
    width: '80%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#282828',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '80%',
    marginBottom: 12,
  },
  textCol: {
    flex: 1,
    overflow: 'hidden',
    paddingRight: 12,
  },
  dashTitleDetails: {
    fontWeight: 'bold',
    fontSize: 24,
    color: '#DEE0E8',
    marginBottom: 4,
  },
  dashArtistDetails: {
    fontSize: 16,
    color: 'rgba(222, 224, 232, 0.7)',
  },
  ratingSquare: {
    width: 44,
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingSquareText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 22,
  },
  albumMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  metaText: {
    color: '#aaa',
    fontSize: 14,
  },
  metaDot: {
    color: '#aaa',
    fontSize: 14,
    marginHorizontal: 6,
  },
  albumActions: {
    width: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DEE0E8',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
    gap: 8,
  },
  reviewButtonText: {
    color: '#18191D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  spotifyButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.45)',
    backgroundColor: 'rgba(29, 185, 84, 0.08)',
  },
  sectionContainer: {
    paddingHorizontal: 16,
  },
  communityReviewsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#DEE0E8',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  trackTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  trackName: {
    color: '#eee',
    fontSize: 15,
  },
  trackRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trackDuration: {
    color: '#888',
    fontSize: 14,
  },
  trackActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 232, 0.14)',
    backgroundColor: 'rgba(222, 224, 232, 0.06)',
  },
  emptyText: {
    color: 'rgba(222, 224, 232, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  cardWrapper: {
    marginBottom: 10,
    width: '100%',
    position: 'relative',
  },
  topFilament: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: '90%',
    height: 1.5,
    backgroundColor: 'rgba(222, 224, 232, 0.05)',
    borderRadius: 2,
  },
  reviewCard: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  userInfoClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  displayName: {
    color: '#DEE0E8',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 6,
    flexShrink: 1,
  },
  username: {
    color: 'rgba(222, 224, 232, 0.6)',
    fontSize: 13,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    color: 'rgba(222, 224, 232, 0.6)',
    fontSize: 12,
    marginRight: 8,
  },
  optionsIconArea: {
    padding: 4,
  },
  cardBody: {
    flexDirection: 'row',
  },
  albumCover: {
    width: 88,
    height: 88,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: '#282828',
  },
  contentWrapper: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  albumName: {
    flex: 1,
    color: '#DEE0E8',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  ratingBadge: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingTextFeed: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 22,
  },
  reviewText: {
    color: '#DEE0E8',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    marginRight: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingRight: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  actionText: {
    color: '#DEE0E8',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: 'bold',
  },
  commentActionText: {
    color: '#55565C',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useReviewShare } from '../components/ReviewShareCard';
import api from '../services/api';
import { confirmBlockUser, openReportPrompt } from '../services/moderation';

const keyboardStickyOffset = { closed: 0, opened: 0 };

export default function PostScreen({ route, navigation }) {
  const { reviewId, reviewData } = route.params;
  const insets = useSafeAreaInsets();
  const { shareReviewCard, ShareReviewHost } = useReviewShare();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(reviewData.isLiked || false);
  const [likeCount, setLikeCount] = useState(reviewData.likeCount || 0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);

  const bottomPadding = keyboardVisible ? 12 : Math.max(insets.bottom, 12);
  const reviewOwnerId =
    reviewData.userId || reviewData.user?.id || reviewData.user?._id;
  const isMyReview =
    reviewData.isMine ||
    (reviewOwnerId &&
      currentUserId &&
      reviewOwnerId.toString() === currentUserId.toString());

  const getCurrentReviewShareData = () => ({
    ...reviewData,
    id: reviewId,
    reviewId,
  });

  const handleShareReview = () => {
    shareReviewCard(getCurrentReviewShareData());
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchComments();

    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('musion_token');
      const res = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCurrentUserId(res.data.id || res.data._id || res.data.userId);
    } catch (e) {}
  };

  const fetchComments = async () => {
    try {
      const token = await AsyncStorage.getItem('musion_token');
      const response = await api.get(`/reviews/${reviewId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setComments(response.data);
    } catch (error) {
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    Keyboard.dismiss();

    try {
      const token = await AsyncStorage.getItem('musion_token');
      const response = await api.post(
        `/reviews/${reviewId}/comments`,
        { text: newComment },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setComments((prev) => [response.data, ...prev]);
      setNewComment('');
    } catch (error) {
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteComment = (commentId) => {
    Alert.alert(
      'Excluir Comentário',
      'Tem certeza que deseja excluir este comentário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => handleDeleteComment(commentId),
        },
      ]
    );
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const token = await AsyncStorage.getItem('musion_token');
      const headers = { Authorization: `Bearer ${token}` };

      await api.delete(`/reviews/${reviewId}/comments/${commentId}`, {
        headers,
      });

      setComments((prev) =>
        prev.filter((c) => {
          const id = c._id || c.id;
          return id?.toString() !== commentId?.toString();
        })
      );
    } catch (error) {
      Alert.alert('Ops', 'Não foi possível excluir o comentário.');
    }
  };

  const confirmDeleteReview = () => {
    Alert.alert(
      'Excluir Review',
      'Tem certeza que deseja excluir esta review? Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: handleDeleteReview,
        },
      ]
    );
  };

  const handleReviewOptions = () => {
    if (isMyReview) {
      Alert.alert('Opções do Review', 'O que você deseja fazer?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Compartilhar como Story',
          onPress: handleShareReview,
        },
        {
          text: 'Excluir Review',
          style: 'destructive',
          onPress: confirmDeleteReview,
        },
      ]);
      return;
    }

    Alert.alert('Opções do Review', 'O que você deseja fazer?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Compartilhar como Story',
        onPress: handleShareReview,
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
        text: 'Bloquear Usuário',
        style: 'destructive',
        onPress: () =>
          confirmBlockUser({
            userId: reviewOwnerId,
            username: reviewData.user?.username,
            onSuccess: () => navigation.goBack(),
          }),
      },
    ]);
  };

  const handleCommentOptions = (item, commenterId, commentId) => {
    const username = item.user?.username;

    Alert.alert('Opções do Comentário', 'O que você deseja fazer?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Denunciar Comentário',
        onPress: () =>
          openReportPrompt({
            targetType: 'COMMENT',
            targetId: commentId,
          }),
      },
      {
        text: 'Bloquear Usuário',
        style: 'destructive',
        onPress: () =>
          confirmBlockUser({
            userId: commenterId,
            username,
            onSuccess: () =>
              setComments((prev) =>
                prev.filter((comment) => {
                  const id = comment.userId || comment.user?.id || comment.user?._id;
                  return id?.toString() !== commenterId?.toString();
                })
              ),
          }),
      },
    ]);
  };

  const handleDeleteReview = async () => {
    if (deletingReview) return;

    setDeletingReview(true);

    try {
      const token = await AsyncStorage.getItem('musion_token');

      await api.delete(`/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Erro ao excluir.');
      setDeletingReview(false);
    }
  };

  const handleLike = async () => {
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      const token = await AsyncStorage.getItem('musion_token');

      await api.post(
        `/dashboard/review/${reviewId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      setIsLiked(isLiked);
      setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const formatRating = (r) => {
    const n = parseFloat(r);
    return isNaN(n) ? '-' : n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
  };

  const getRatingColor = (r) => {
    const n = parseFloat(r);

    if (n <= 3.9) return '#F20505';
    if (n <= 6.0) return '#F2CB05';

    return '#37A603';
  };

  const goToProfile = (userId) => {
    if (userId) {
      navigation.navigate('Profile', { id: userId });
    }
  };

  const goToAlbum = () => {
    const albumId = reviewData.spotifyId || reviewData.albumId;

    if (albumId) {
      navigation.navigate('AlbumDetails', { id: albumId });
    }
  };

  const renderHeader = () => (
    <View style={{ paddingBottom: 10 }}>
      <View style={styles.cardWrapper}>
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
              onPress={() =>
                goToProfile(
                  reviewData.userId ||
                    reviewData.user?.id ||
                    reviewData.user?._id
                )
              }
            >
              <Image
                source={{
                  uri:
                    reviewData.user?.avatar ||
                    reviewData.user?.avatarUrl ||
                    'https://i.stack.imgur.com/l60Hf.png',
                }}
                style={styles.avatar}
              />

              <View style={styles.userInfo}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {reviewData.user?.name ||
                    reviewData.user?.displayName ||
                    'Usuário'}
                </Text>

                {reviewData.user?.username && (
                  <Text style={styles.username} numberOfLines={1}>
                    @{reviewData.user.username}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {reviewOwnerId && (
              <TouchableOpacity
                onPress={handleReviewOptions}
                style={styles.reviewOptionsButton}
                disabled={deletingReview}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={18}
                  color="#55565C"
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.cardBody}>
            <TouchableOpacity activeOpacity={0.8} onPress={goToAlbum}>
              <Image
                source={{ uri: reviewData.albumCover }}
                style={styles.albumCover}
              />
            </TouchableOpacity>

            <View style={styles.contentWrapper}>
              <View style={styles.titleRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={goToAlbum}
                  style={styles.albumNameButton}
                >
                  <Text style={styles.albumName} numberOfLines={2}>
                    {reviewData.albumName}
                  </Text>
                </TouchableOpacity>

                <View
                  style={[
                    styles.ratingBadge,
                    { backgroundColor: getRatingColor(reviewData.rating) },
                  ]}
                >
                  <Text style={styles.ratingText}>
                    {formatRating(reviewData.rating)}
                  </Text>
                </View>
              </View>

              <Text style={styles.reviewText}>{reviewData.text}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <TouchableOpacity style={styles.actionButton} onPress={handleShareReview}>
              <Ionicons name="share-social-outline" size={20} color="#55565C" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={22}
                color={isLiked ? '#FFF' : '#55565C'}
              />

              {likeCount > 0 && (
                <Text style={styles.actionText}>{likeCount}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.commentsSectionInner}>
        <Text style={styles.commentsTitle}>Comentários ({comments.length})</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color="#DEE0E8" />
            </TouchableOpacity>

            <Text style={styles.topBarTitle}>Post</Text>

            <View style={{ width: 40 }} />
          </View>

          {loadingComments ? (
            <ActivityIndicator
              size="large"
              color="#1DB954"
              style={{ marginTop: 50 }}
            />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item, index) => {
                const id = item._id || item.id;
                return id ? id.toString() : index.toString();
              }}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.listContainer}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              renderItem={({ item }) => {
                const commenterId = item.userId || item.user?.id || item.user?._id;
                const isMyComment =
                  item.isMine ||
                  (commenterId &&
                    currentUserId &&
                    commenterId.toString() === currentUserId.toString());
                const canDeleteComment = isMyComment || isMyReview;
                const commentId = item._id || item.id;

                return (
                  <View style={styles.commentRow}>
                    <TouchableOpacity onPress={() => goToProfile(commenterId)}>
                      <Image
                        source={{
                          uri:
                            item.user?.avatarUrl ||
                            item.user?.avatar ||
                            'https://i.stack.imgur.com/l60Hf.png',
                        }}
                        style={styles.commentAvatar}
                      />
                    </TouchableOpacity>

                    <View style={styles.commentBubbleWrapper}>
                      <View style={styles.commentBubble}>
                        <View style={styles.commentHeaderRow}>
                          <TouchableOpacity
                            onPress={() => goToProfile(commenterId)}
                            style={styles.commentAuthorHeader}
                          >
                            <Text
                              style={styles.commentAuthorName}
                              numberOfLines={1}
                            >
                              {item.user?.name ||
                                item.user?.displayName ||
                                'Usuário'}
                            </Text>

                            {item.user?.username && (
                              <Text
                                style={styles.commentAuthorUsername}
                                numberOfLines={1}
                              >
                                @{item.user.username}
                              </Text>
                            )}
                          </TouchableOpacity>

                          {canDeleteComment && commentId ? (
                            <TouchableOpacity
                              onPress={() => confirmDeleteComment(commentId)}
                              style={{ padding: 4, marginLeft: 10 }}
                            >
                              <Ionicons
                                name="ellipsis-vertical"
                                size={16}
                                color="#55565C"
                              />
                            </TouchableOpacity>
                          ) : commenterId && commentId ? (
                            <TouchableOpacity
                              onPress={() => handleCommentOptions(item, commenterId, commentId)}
                              style={{ padding: 4, marginLeft: 10 }}
                            >
                              <Ionicons
                                name="ellipsis-vertical"
                                size={16}
                                color="#55565C"
                              />
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <Text style={styles.commentText}>{item.text}</Text>
                      </View>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Seja o primeiro a comentar!
                </Text>
              }
            />
          )}

          <KeyboardStickyView offset={keyboardStickyOffset}>
            <View
            style={[
              styles.bottomInputBar,
              {
                paddingBottom: bottomPadding,
              },
            ]}
          >
            <TextInput
              style={styles.textInput}
              placeholder="Adicione um comentário..."
              placeholderTextColor="rgba(222, 224, 232, 0.4)"
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />

            <TouchableOpacity
              style={styles.sendButton}
              onPress={handlePostComment}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={newComment.trim() ? '#FFF' : '#55565C'}
                />
              )}
            </TouchableOpacity>
            </View>
          </KeyboardStickyView>
          <ShareReviewHost />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#18191D',
  },

  container: {
    flex: 1,
    backgroundColor: '#18191D',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 232, 0.05)',
  },

  topBarTitle: {
    color: '#DEE0E8',
    fontSize: 18,
    fontWeight: 'bold',
  },

  listContainer: {
    paddingBottom: 20,
  },

  cardWrapper: {
    marginBottom: 15,
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
    paddingBottom: 15,
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

  reviewOptionsButton: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },

  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  displayName: {
    color: '#DEE0E8',
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 6,
  },

  username: {
    color: 'rgba(222, 224, 232, 0.6)',
    fontSize: 13,
  },

  cardBody: {
    flexDirection: 'row',
  },

  albumCover: {
    width: 120,
    height: 120,
    borderRadius: 4,
  },

  contentWrapper: {
    flex: 1,
    marginLeft: 16,
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },

  albumName: {
    color: '#DEE0E8',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },

  albumNameButton: {
    flex: 1,
    marginRight: 10,
  },

  ratingBadge: {
    width: 34,
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  ratingText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },

  reviewText: {
    color: '#DEE0E8',
    fontSize: 15,
    lineHeight: 22,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingRight: 0,
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

  commentsSectionInner: {
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 10,
  },

  commentsTitle: {
    color: '#DEE0E8',
    fontSize: 16,
    fontWeight: 'bold',
  },

  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },

  commentBubbleWrapper: {
    flex: 1,
  },

  commentBubble: {
    backgroundColor: 'rgba(222, 224, 232, 0.05)',
    padding: 12,
    borderRadius: 12,
    borderTopLeftRadius: 4,
  },

  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },

  commentAuthorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },

  commentAuthorName: {
    color: '#DEE0E8',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 6,
  },

  commentAuthorUsername: {
    color: 'rgba(222, 224, 232, 0.6)',
    fontSize: 12,
  },

  commentText: {
    color: 'rgba(222, 224, 232, 0.8)',
    fontSize: 14,
    lineHeight: 20,
  },

  emptyText: {
    color: '#55565C',
    textAlign: 'center',
    marginTop: 20,
  },

  bottomInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18191D',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(222, 224, 232, 0.05)',
  },

  textInput: {
    flex: 1,
    backgroundColor: 'rgba(222, 224, 232, 0.08)',
    color: '#DEE0E8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    fontSize: 15,
  },

  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

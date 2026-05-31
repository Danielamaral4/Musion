import React, { useState, useCallback } from 'react'; 
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  Alert,
  SafeAreaView, 
  Platform,     
  StatusBar,
  Modal,
  Pressable,
  RefreshControl // <-- 1. Importado aqui
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native'; 
import { Ionicons } from '@expo/vector-icons'; 
import { LinearGradient } from 'expo-linear-gradient'; 
import { useReviewShare } from '../components/ReviewShareCard';
import api from '../services/api';
import { confirmBlockUser, openReportPrompt } from '../services/moderation';

export function FeedScreen({ navigation, route }) {
  const { shareReviewCard, ShareReviewHost } = useReviewShare();
  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading] = useState(true); // Loader da primeira abertura
  const [refreshing, setRefreshing] = useState(false); // <-- 2. Estado para o Pull-to-Refresh
  const [likesState, setLikesState] = useState({});
  const [currentUserAvatar, setCurrentUserAvatar] = useState(null); 

  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  // 3. Isolamos a função de busca para ser usada tanto no foco da tela quanto no gesto de puxar
  const loadAllData = async (showFullLoading = true) => {
    if (showFullLoading) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('musion_token');
      const headers = { Authorization: `Bearer ${token}` };

      const userRes = await api.get('/users/me', { headers });
      const freshAvatar = userRes.data.avatarUrl || userRes.data.avatar;
      setCurrentUserAvatar(freshAvatar);

      if (freshAvatar) {
        await AsyncStorage.setItem('musion_user_avatar', freshAvatar);
      }

      const feedRes = await api.get('/dashboard/feed', { headers });
      setFeedData(feedRes.data);
      
      const initialLikes = {};
      feedRes.data.forEach(item => {
        initialLikes[item.reviewId] = {
          count: item.likeCount || 0,
          isLiked: item.isLiked || false
        };
      });
      setLikesState(initialLikes);

    } catch (err) {
      console.error("Erro ao carregar dados do feed/usuário:", err);
    } finally {
      setLoading(false);
      setRefreshing(false); // <-- 4. Garante que a rodinha do topo suma quando acabar
    }
  };

  // Dispara quando entra na tela (ou quando volta da edição)
  useFocusEffect(
    useCallback(() => {
      // Se já temos dados, não mostra o loader de tela inteira para não estragar a experiência
      loadAllData(feedData.length === 0);
    }, [route.params?.refresh])
  );

  // 5. Função acionada especificamente pelo gesto de puxar o feed
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData(false); // Passa false para não ativar o ActivityIndicator de tela cheia
  }, []);

  const toggleLike = async (reviewId) => {
    setLikesState(prev => {
      const current = prev[reviewId] || { count: 0, isLiked: false };
      const newIsLiked = !current.isLiked;
      const newCount = newIsLiked ? current.count + 1 : current.count - 1;
      return { ...prev, [reviewId]: { isLiked: newIsLiked, count: newCount } };
    });
    try { 
      const token = await AsyncStorage.getItem('musion_token');
      await api.post(`/dashboard/review/${reviewId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }); 
    } catch (e) {
      console.error(e);
    }
  };

  const openOptions = (item) => {
    setSelectedReview(item);
    setOptionsModalVisible(true);
  };

  const handleEditOption = () => {
    setOptionsModalVisible(false);
    if (selectedReview) {
      navigation.navigate('AddReview', { 
        reviewToEdit: {
          ...selectedReview,
          id: selectedReview.reviewId 
        } 
      });
    }
  };

  const handleDeleteOption = () => {
    setOptionsModalVisible(false);
    setTimeout(() => {
      Alert.alert(
        "Excluir Review",
        "Tem certeza que deseja excluir esta review? Essa ação não pode ser desfeita.",
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Sim, Excluir", 
            style: "destructive", 
            onPress: () => confirmDeleteAction(selectedReview.reviewId) 
          }
        ]
      );
    }, 300);
  };

  const handleShareOption = () => {
    const review = selectedReview;
    setOptionsModalVisible(false);

    if (review) {
      setTimeout(() => shareReviewCard(review), 180);
    }
  };

  const confirmDeleteAction = async (reviewId) => {
    try {
      const token = await AsyncStorage.getItem('musion_token');
      await api.delete(`/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedData(prev => prev.filter(item => item.reviewId !== reviewId));
    } catch (error) {
      Alert.alert("Erro", "Erro ao excluir.");
    }
  };

  const getRatingColor = (r) => { 
    const n = parseFloat(r); 
    if (n <= 3.9) return '#F20505'; 
    if (n <= 6.0) return '#F2CB05'; 
    return '#37A603'; 
  };
  
  const formatRating = (r) => { 
    const n = parseFloat(r); 
    return isNaN(n) ? '-' : (n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)); 
  };

  const formatTime = (d) => {
    if (!d) return ''; 
    const dt = new Date(d);
    const nw = new Date();
    const diff = Math.floor((nw - dt) / 1000);
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)} h`;
    return dt.toLocaleDateString('pt-BR');
  };

  const getCommentCount = (item) => {
    const count =
      item.commentCount ??
      item.commentsCount ??
      item.comments_count ??
      item.totalComments ??
      item.comments?.length ??
      item._count?.comments ??
      item.stats?.comments ??
      item.review?.commentCount ??
      item.review?.commentsCount ??
      item.review?.comments?.length;

    const parsedCount = Number(count);
    return Number.isFinite(parsedCount) ? parsedCount : 0;
  };

  const handleReportOption = () => {
    const review = selectedReview;
    setOptionsModalVisible(false);

    if (!review?.reviewId) return;

    setTimeout(() => {
      openReportPrompt({
        targetType: 'REVIEW',
        targetId: review.reviewId,
      });
    }, 250);
  };

  const handleBlockOption = () => {
    const review = selectedReview;
    const userId = review?.userId || review?.user?.id;

    setOptionsModalVisible(false);

    if (!userId) return;

    setTimeout(() => {
      confirmBlockUser({
        userId,
        username: review?.user?.username,
        onSuccess: () => {
          setFeedData((prev) =>
            prev.filter((item) => (item.userId || item.user?.id) !== userId)
          );
        },
      });
    }, 250);
  };

const renderItem = ({ item }) => {
    const likeInfo = likesState[item.reviewId] || { count: 0, isLiked: false };
    const commentCount = getCommentCount(item);
    const realName = item.user.name || item.user.nome || item.user.displayName || item.user.username;
    const userIdToNav = item.userId || item.user?.id;

    // Função para navegar para a PostScreen passando os dados
    const goToPost = () => {
      navigation.navigate('PostScreen', { reviewId: item.reviewId, reviewData: item });
    };

    return (
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
              onPress={() => navigation.navigate('Profile', { id: userIdToNav })}
            >
              <Image source={{ uri: item.user.avatar || item.user.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png' }} style={styles.avatar} />
              <View style={styles.userInfo}>
                <Text style={styles.displayName} numberOfLines={1}>{realName}</Text>
                {item.user.username && (
                  <Text style={styles.username} numberOfLines={1}>@{item.user.username}</Text>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
              <TouchableOpacity onPress={() => openOptions(item)} style={styles.optionsIconArea}>
                <Ionicons name="ellipsis-vertical" size={18} color="#55565C" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ⬅️ CORPO DA POSTAGEM AGORA É CLICÁVEL */}
          <TouchableOpacity activeOpacity={0.8} onPress={goToPost} style={styles.cardBody}>
            <Image source={{ uri: item.albumCover }} style={styles.albumCover} />

            <View style={styles.contentWrapper}>
              <View style={styles.titleRow}>
                <Text style={styles.albumName} numberOfLines={2}>{item.albumName}</Text>
                <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(item.rating) }]}>
                  <Text style={styles.ratingText}>{formatRating(item.rating)}</Text>
                </View>
              </View>
              <Text style={styles.reviewText}>{item.text}</Text>
            </View>
          </TouchableOpacity>

          {/* ⬅️ FOOTER COM ÍCONE DE COMENTÁRIO E CURTIR */}
          <View style={styles.cardFooter}>
            
            {/* Ícone de Comentário */}
            <TouchableOpacity style={styles.actionButton} onPress={goToPost}>
              <Ionicons name="chatbubble-outline" size={20} color="#55565C" />
              <Text style={[styles.actionText, styles.commentActionText]}>{commentCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => shareReviewCard(item)}>
              <Ionicons name="share-social-outline" size={20} color="#55565C" />
            </TouchableOpacity>

            {/* Ícone de Curtir */}
            <TouchableOpacity style={styles.actionButton} onPress={() => toggleLike(item.reviewId)}>
              <Ionicons 
                name={likeInfo.isLiked ? "heart" : "heart-outline"} 
                size={22} 
                color={likeInfo.isLiked ? "#FFF" : "#55565C"} 
              />
              {likeInfo.count > 0 && <Text style={styles.actionText}>{likeInfo.count}</Text>}
            </TouchableOpacity>

          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerAll]}>
        <ActivityIndicator size="large" color="#1DB954" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.navLeft} onPress={() => navigation.navigate('Profile')}>
            <Image source={{ uri: currentUserAvatar || 'https://i.stack.imgur.com/l60Hf.png' }} style={styles.navAvatar} />
          </TouchableOpacity>

          <View style={styles.navCenter}>
            <Image source={require('../../assets/musionlogo.png')} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.navRight}>
            <TouchableOpacity
              style={styles.navActionButton}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.75}
            >
              <Ionicons name="notifications-outline" size={18} color="#DEE0E8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navActionButton}
              onPress={() => navigation.navigate('AddReview')}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={20} color="#DEE0E8" />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={feedData}
          keyExtractor={(item) => item.reviewId.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma atividade recente.</Text>}
          // 6. ADICIONADO O REFRESH CONTROL AQUI ABAIXO
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1DB954" // Cor da rodinha no iOS
              colors={["#1DB954"]} // Cor da rodinha no Android
            />
          }
        />

      </View>

      <Modal
        visible={optionsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setOptionsModalVisible(false)}
        >
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            <TouchableOpacity style={styles.sheetActionRow} onPress={handleShareOption}>
              <Ionicons name="share-social-outline" size={22} color="#DEE0E8" />
              <Text style={styles.sheetActionText}>Compartilhar como Story</Text>
            </TouchableOpacity>

            {selectedReview?.isMine ? (
              <>
                <TouchableOpacity style={styles.sheetActionRow} onPress={handleEditOption}>
                  <Ionicons name="pencil-outline" size={22} color="#DEE0E8" />
                  <Text style={styles.sheetActionText}>Editar Review</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.sheetActionRow, styles.sheetActionRowNoBorder]} onPress={handleDeleteOption}>
                  <Ionicons name="trash-outline" size={22} color="#F20505" />
                  <Text style={[styles.sheetActionText, { color: '#F20505' }]}>Excluir Review</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.sheetActionRow} onPress={handleReportOption}>
                  <Ionicons name="flag-outline" size={22} color="#DEE0E8" />
                  <Text style={styles.sheetActionText}>Denunciar Review</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.sheetActionRow, styles.sheetActionRowNoBorder]} onPress={handleBlockOption}>
                  <Ionicons name="ban-outline" size={22} color="#F20505" />
                  <Text style={[styles.sheetActionText, { color: '#F20505' }]}>Bloquear Usuário</Text>
                </TouchableOpacity>
              </>
            )}
            
          </Pressable>
        </Pressable>
      </Modal>

      <ShareReviewHost />

    </SafeAreaView>
  );
}

// ... (Mantenha o mesmo `const styles = StyleSheet.create({...})` de antes sem alterações)

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#18191D', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: '#18191D' },
  centerAll: { justifyContent: 'center', alignItems: 'center' },
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60, backgroundColor: '#18191D', borderBottomWidth: 1, borderBottomColor: 'rgba(222, 224, 232, 0.05)' },
  navLeft: { flex: 1, alignItems: 'flex-start' },
  navAvatar: { width: 32, height: 32, borderRadius: 16 },
  navCenter: { flex: 2, alignItems: 'center' },
  logo: { width: 100, height: 30 },
  navRight: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row', gap: 8 },
  navActionButton: { width: 31, height: 31, borderWidth: 1.4, borderColor: '#DEE0E8', borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingTop: 0, paddingBottom: 100 },
  emptyText: { color: '#DEE0E8', textAlign: 'center', marginTop: 50 },
  cardWrapper: { marginBottom: 5, width: '100%', position: 'relative' },
  topFilament: { position: 'absolute', top: 0, alignSelf: 'center', width: '90%', height: 1.5, backgroundColor: 'rgba(222, 224, 232, 0.05)', borderRadius: 2 },
  reviewCard: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' },
  userInfoClickable: { flexDirection: 'row', alignItems: 'center', flex: 1 }, 
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 10 },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  displayName: { color: '#DEE0E8', fontWeight: 'bold', fontSize: 14, marginRight: 6, flexShrink: 1 }, 
  username: { color: 'rgba(222, 224, 232, 0.6)', fontSize: 13, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  timestamp: { color: 'rgba(222, 224, 232, 0.6)', fontSize: 12, marginRight: 10 },
  optionsIconArea: { padding: 5, marginRight: -5 },
  cardBody: { flexDirection: 'row' },
  albumCover: { width: 140, height: 140, borderRadius: 4 },
  contentWrapper: { flex: 1, marginLeft: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  albumName: { flex: 1, color: '#DEE0E8', fontSize: 20, fontWeight: 'bold', marginRight: 10 },
  ratingBadge: { width: 40, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  ratingText: { color: '#FFF', fontWeight: 'bold', fontSize: 22 },
  reviewText: { color: '#DEE0E8', fontSize: 14, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, paddingRight: 12, gap: 16 },
  likeContainer: { flexDirection: 'row', alignItems: 'center', padding: 6 },
  likeCount: { color: '#DEE0E8', fontSize: 14, marginLeft: 8, fontWeight: 'bold' },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 6 }, // substitui o antigo likeContainer
  actionText: { color: '#DEE0E8', fontSize: 14, marginLeft: 6, fontWeight: 'bold' }, // substitui o antigo likeCount
  commentActionText: { color: '#55565C' },

  // Estilos do Modal Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#1E1F24', // Fundo um pouco mais claro que a tela para destacar
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#55565C',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 232, 0.05)'
  },
  sheetActionRowNoBorder: {
    borderBottomWidth: 0,
  },
  sheetActionText: {
    color: '#DEE0E8',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  }
});

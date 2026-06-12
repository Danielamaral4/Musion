import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  Modal, 
  Pressable,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useReviewShare } from '../components/ReviewShareCard';
import api from '../services/api';
import { confirmBlockUser, confirmUnblockUser, openReportPrompt } from '../services/moderation';

export default function ProfilePage({ navigation, route }) {
  const { id } = route?.params || {}; 
  const { shareReviewCard, ShareReviewHost } = useReviewShare();

  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ displayName: '', username: '', bio: '' });
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageToShow, setImageToShow] = useState('');
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followModalTitle, setFollowModalTitle] = useState('');
  const [followUsers, setFollowUsers] = useState([]);
  const [loadingFollowUsers, setLoadingFollowUsers] = useState(false);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('musion_token');
      const headers = { Authorization: `Bearer ${token}` };

      const meResponse = await api.get('/users/me', { headers });
      setCurrentUser(meResponse.data);

      let profileData;
      let reviewsData;

      if (id && Number(id) !== meResponse.data.id) {
        const otherProfileRes = await api.get(`/users/profile/${id}`, { headers });
        profileData = otherProfileRes.data;
        reviewsData = otherProfileRes.data.reviews || [];
      } else {
        profileData = meResponse.data;
        const myReviewsRes = await api.get('/reviews/me', { headers });
        reviewsData = myReviewsRes.data;
      }

      setProfile(profileData);
      setReviews(reviewsData);
    } catch (err) {
      console.error('Erro:', err);
      setError('Falha ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      loadData();
    }, [id, route?.params?.refreshTrigger])
  );

  const handleFollowToggle = async () => {
    if (!profile) return;
    try {
      const token = await AsyncStorage.getItem('musion_token');
      const headers = { Authorization: `Bearer ${token}` };

      if (profile.isFollowing) {
        await api.delete(`/users/${profile.id}/follow`, { headers });
        setProfile(prev => ({
          ...prev,
          isFollowing: false,
          _count: { ...prev._count, followers: (prev._count.followers || 1) - 1 }
        }));
      } else {
        await api.post(`/users/${profile.id}/follow`, {}, { headers });
        setProfile(prev => ({
          ...prev,
          isFollowing: true,
          _count: { ...prev._count, followers: (prev._count.followers || 0) + 1 }
        }));
      }
    } catch (error) {
      console.error("Erro ao seguir/deixar de seguir", error);
    }
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditFormData({
      displayName: profile.displayName || profile.username,
      username: profile.username,
      bio: profile.bio || ''
    });
    setUploadError('');
    setIsEditModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem('musion_token');
      const response = await api.patch('/users/me', editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      setIsEditModalOpen(false);
    } catch (err) {
      setUploadError('Erro ao salvar.');
    }
  };

  const handleUploadClick = async () => {
    setUploadError('');
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permissão negada", "É necessário acesso à galeria para mudar a foto.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (pickerResult.canceled) return;

    const uri = pickerResult.assets[0].uri;
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    const formData = new FormData();
    formData.append('file', { uri, name: filename, type });

    setIsUploading(true);

    try {
      const token = await AsyncStorage.getItem('musion_token');
      const response = await api.patch('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
      });

      const newAvatarUrl = response.data.avatarUrl || response.data.secure_url || response.data;
      
      setProfile((prev) => ({
        ...prev,
        avatarUrl: newAvatarUrl
      }));
    } catch (err) {
      console.error('Erro no upload:', err);
      setUploadError('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileImageClick = () => {
    if (profile.avatarUrl) {
      setImageToShow(profile.avatarUrl);
      setIsImageModalOpen(true);
    }
  };

  const handleProfileOptions = () => {
    if (!profile?.id || isOwnProfile) return;

    const buttons = [
      {
        text: 'Denunciar perfil',
        onPress: () =>
          openReportPrompt({
            targetType: 'USER',
            targetId: profile.id,
          }),
      },
    ];

    if (profile.isBlocked) {
      buttons.push({
        text: 'Desbloquear usuário',
        onPress: () =>
          confirmUnblockUser({
            userId: profile.id,
            username: profile.username,
            onSuccess: loadData,
          }),
      });
    } else {
      buttons.push({
        text: 'Bloquear usuário',
        style: 'destructive',
        onPress: () =>
          confirmBlockUser({
            userId: profile.id,
            username: profile.username,
            onSuccess: () => {
              setProfile((prev) => ({
                ...prev,
                isBlocked: true,
                isFollowing: false,
              }));
              setReviews([]);
            },
          }),
      });
    }

    buttons.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Opções do Perfil', 'O que você deseja fazer?', buttons);
  };

  const openFollowList = async (type) => {
    if (!profile?.id) return;

    setFollowModalTitle(type === 'followers' ? 'Seguidores' : 'Seguindo');
    setFollowModalVisible(true);
    setLoadingFollowUsers(true);
    setFollowUsers([]);

    try {
      const token = await AsyncStorage.getItem('musion_token');
      const response = await api.get(`/users/${profile.id}/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFollowUsers(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar lista de usuários:', error);
    } finally {
      setLoadingFollowUsers(false);
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

  const getReviewData = (review) => ({
    ...review,
    reviewId: review.reviewId || review.id,
    userId: profile.id,
    user: {
      id: profile.id,
      username: profile.username,
      displayName: realName,
      avatar: userAvatar,
      avatarUrl: userAvatar,
    },
    isMine: isOwnProfile,
  });

  const goToPost = (review) => {
    const reviewId = review.reviewId || review.id;

    if (reviewId) {
      navigation.navigate('PostScreen', {
        reviewId,
        reviewData: getReviewData(review),
      });
    }
  };

  const handleReviewOptions = (review) => {
    setSelectedReview(review);
    setOptionsModalVisible(true);
    return;

    Alert.alert(
      "Opções da review",
      "O que você deseja fazer?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Editar", 
          onPress: () => {
            setSelectedReview(review);
            setOptionsModalVisible(true);
          } 
        },
        { 
          text: "Excluir", 
          onPress: () => handleDeleteReview(review.id),
          style: "destructive"
        }
      ]
    );
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      const token = await AsyncStorage.getItem('musion_token');
      await api.delete(`/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews((prev) =>
        prev.filter((r) => (r.id || r.reviewId)?.toString() !== reviewId?.toString())
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao excluir.');
    }
  };

  const handleEditOption = () => {
    setOptionsModalVisible(false);

    if (selectedReview) {
      navigation.navigate('AddReview', {
        reviewToEdit: {
          ...selectedReview,
          id: selectedReview.id || selectedReview.reviewId,
        },
      });
    }
  };

  const handleDeleteOption = () => {
    setOptionsModalVisible(false);

    setTimeout(() => {
      Alert.alert(
        'Excluir review',
        'Tem certeza de que deseja excluir esta review? Essa ação não pode ser desfeita.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, Excluir',
            style: 'destructive',
            onPress: () =>
              selectedReview &&
              handleDeleteReview(selectedReview.id || selectedReview.reviewId),
          },
        ]
      );
    }, 300);
  };

  const handleShareOption = () => {
    const review = selectedReview;
    setOptionsModalVisible(false);

    if (review) {
      setTimeout(() => shareReviewCard(getReviewData(review)), 180);
    }
  };

  const toggleLike = async (review) => {
    setReviews(prev =>
      prev.map(r =>
        r.id === review.id
          ? {
              ...r,
              isLiked: !r.isLiked,
              likeCount: r.isLiked
                ? Math.max((r.likeCount || 0) - 1, 0)
                : (r.likeCount || 0) + 1
            }
          : r
      )
    );
    try { 
      const token = await AsyncStorage.getItem('musion_token');
      await api.post(`/dashboard/review/${review.id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }); 
    } catch (e) { console.error(e) }
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#1DB954" /></View>;
  if (error) return <View style={styles.centerContainer}><Text style={styles.errorMessage}>{error}</Text></View>;
  if (!profile) return null;

  const isOwnProfile = currentUser && currentUser.id === profile.id;

  const formatTime = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const diff = Math.floor((now - dt) / 1000);

    if (diff < 60) return 'Agora';
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)} h`;
    return dt.toLocaleDateString('pt-BR');
  };

  const realName = profile.displayName || profile.username;
  const userAvatar = profile.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.profileTopGlow}>
        <LinearGradient
          colors={['transparent', 'rgba(222, 224, 232, 0.18)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', '#18191D']}
          start={{ x: 0.5, y: 0.04 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      
      {/* ⬅️ BOTÃO FLUTUANTE DE VOLTAR */}
      <TouchableOpacity 
        style={styles.floatingBackButton} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color="#DEE0E8" />
      </TouchableOpacity>

      {isOwnProfile && (
        <TouchableOpacity
          style={styles.floatingSettingsButton}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.75}
        >
          <Ionicons name="settings-outline" size={22} color="#DEE0E8" />
        </TouchableOpacity>
      )}

      {!isOwnProfile && (
        <TouchableOpacity
          style={styles.floatingSettingsButton}
          onPress={handleProfileOptions}
          activeOpacity={0.75}
        >
          <Ionicons name="ellipsis-vertical" size={22} color="#DEE0E8" />
        </TouchableOpacity>
      )}

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Aumentei a margem para não encostar no botão de voltar */}
        <View style={styles.profileHeader}>
          <View style={styles.profileHeaderTopRow}>
            <TouchableOpacity onPress={handleProfileImageClick}>
              <Image
                source={{ uri: userAvatar }}
                style={styles.profileAvatar}
              />
            </TouchableOpacity>
            
            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{reviews.length}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => openFollowList('followers')}
                activeOpacity={0.75}
              >
                <Text style={styles.statNumber}>{profile._count?.followers || 0}</Text>
                <Text style={styles.statLabel}>Seguidores</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => openFollowList('following')}
                activeOpacity={0.75}
              >
                <Text style={styles.statNumber}>{profile._count?.following || 0}</Text>
                <Text style={styles.statLabel}>Seguindo</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.profileNameLine}>
            {/* ⬅️ NOME E @ NA MESMA LINHA NO PERFIL */}
            <View style={styles.profileNameGroup}>
              <Text style={styles.profileDisplayName} numberOfLines={1}>{realName}</Text>
              <Text style={styles.profileUsernameTag}>@{profile.username}</Text>
            </View>

            {isOwnProfile ? (
              <TouchableOpacity style={styles.editProfileButton} onPress={openEditModal}>
                <Text style={styles.editProfileButtonText}>Editar</Text>
              </TouchableOpacity>
            ) : profile.isBlocked ? (
              <TouchableOpacity
                style={styles.followButton}
                onPress={() =>
                  confirmUnblockUser({
                    userId: profile.id,
                    username: profile.username,
                    onSuccess: loadData,
                  })
                }
              >
                <Text style={styles.followButtonText}>Desbloquear</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.followButton, profile.isFollowing && styles.followingButton]}
                onPress={handleFollowToggle}
              >
                <Text style={[styles.followButtonText, profile.isFollowing && styles.followingButtonText]}>
                  {profile.isFollowing ? 'Seguindo' : 'Seguir'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.profileBio}>
            {profile.isBlocked
              ? 'Você bloqueou este usuário.'
              : profile.blockedMe
                ? 'Perfil indisponível.'
                : profile.bio || 'Sem bio.'}
          </Text>
        </View>

        <View style={styles.feedMainWrapper}>
          <Text style={styles.reviewsTitle}>Reviews</Text>
          {reviews.length === 0 && <Text style={styles.emptyText}>Nenhuma review encontrada.</Text>}
          
          {/* ⬅️ CARDS EXATOS DO FEED */}
          {reviews.map((review) => {
            const commentCount = getCommentCount(review);

            return (
            <View key={review.id} style={styles.cardWrapper}>
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
                    onPress={() => navigation.navigate('Profile', { id: profile.id })}
                    activeOpacity={0.75}
                  >
                    <Image source={{ uri: userAvatar }} style={styles.avatar} />
                  
                  {/* ⬅️ NOME E @ NA MESMA LINHA NO CARD */}
                    <View style={styles.userInfo}>
                      <Text style={styles.displayName} numberOfLines={1}>{realName}</Text>
                      {profile.username && (
                        <Text style={styles.username} numberOfLines={1}>@{profile.username}</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.headerRight}>
                    <Text style={styles.timestamp}>{formatTime(review.createdAt)}</Text>
                    {isOwnProfile && (
                      <TouchableOpacity
                        onPress={() => handleReviewOptions(review)}
                        style={styles.optionsIconArea}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color="#55565C" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.cardBody}
                  activeOpacity={0.8}
                  onPress={() => goToPost(review)}
                >
                  <Image source={{ uri: review.albumCover }} style={styles.albumCover} />

                  <View style={styles.contentWrapper}>
                    <View style={styles.titleRow}>
                      <Text style={styles.albumName} numberOfLines={2}>{review.albumName}</Text>
                      <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(review.rating) }]}>
                        <Text style={styles.ratingText}>{formatRating(review.rating)}</Text>
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
                      name={review.isLiked ? "heart" : "heart-outline"} 
                      size={22} 
                      color={review.isLiked ? "#FFF" : "#55565C"} 
                    />
                    {review.likeCount > 0 && (
                      <Text style={styles.actionText}>{review.likeCount}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            );
          })}
        </View>
      </ScrollView>

      {/* MODAIS (EDIÇÃO E IMAGEM) */}
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

            <TouchableOpacity style={styles.sheetActionRow} onPress={handleEditOption}>
              <Ionicons name="pencil-outline" size={22} color="#DEE0E8" />
              <Text style={styles.sheetActionText}>Editar review</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetActionRow, styles.sheetActionRowNoBorder]}
              onPress={handleDeleteOption}
            >
              <Ionicons name="trash-outline" size={22} color="#F20505" />
              <Text style={[styles.sheetActionText, { color: '#F20505' }]}>
                Excluir review
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={followModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFollowModalVisible(false)}
      >
        <Pressable
          style={styles.followModalOverlay}
          onPress={() => setFollowModalVisible(false)}
        >
          <Pressable
            style={styles.followModalContent}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.followModalHeader}>
              <Text style={styles.followModalTitle}>{followModalTitle}</Text>
              <TouchableOpacity onPress={() => setFollowModalVisible(false)}>
                <Ionicons name="close" size={24} color="#DEE0E8" />
              </TouchableOpacity>
            </View>

            {loadingFollowUsers ? (
              <ActivityIndicator size="large" color="#DEE0E8" style={{ marginTop: 30 }} />
            ) : (
              <FlatList
                data={followUsers}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.followUserRow}
                    onPress={() => {
                      setFollowModalVisible(false);
                      navigation.navigate('Profile', { id: item.id });
                    }}
                    activeOpacity={0.75}
                  >
                    <Image
                      source={{ uri: item.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png' }}
                      style={styles.followUserAvatar}
                    />
                    <View style={styles.followUserInfo}>
                      <Text style={styles.followUserName} numberOfLines={1}>
                        {item.displayName || item.username}
                      </Text>
                      <Text style={styles.followUserUsername} numberOfLines={1}>
                        @{item.username}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={isEditModalOpen} animationType="slide" transparent={true}>
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContent}>
            
            {/* Botão de Fechar */}
            <TouchableOpacity style={styles.editModalClose} onPress={() => setIsEditModalOpen(false)}>
              <Ionicons name="close" size={24} color="#7E818E" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Editar perfil</Text>

            {/* Avatar e Botão de Trocar Foto */}
            <View style={styles.avatarUploadSection}>
              <Image 
                source={{ uri: profile.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png' }} 
                style={styles.profileAvatarLarge} 
              />
              <TouchableOpacity 
                style={[styles.avatarModalUploadBtn, isUploading && styles.disabledBtn]} 
                onPress={handleUploadClick}
                disabled={isUploading}
              >
                <Text style={styles.btnTextDark}>
                  {isUploading ? 'Enviando...' : 'Trocar Foto'}
                </Text>
              </TouchableOpacity>
            </View>

            {uploadError ? <Text style={styles.errorMessageText}>{uploadError}</Text> : null}

            {/* Campos do Formulário */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome de Exibição</Text>
              <TextInput 
                style={styles.input} 
                value={editFormData.displayName} 
                onChangeText={(text) => handleFormChange('displayName', text)}
                placeholderTextColor="#7E818E"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput 
                style={styles.input} 
                value={editFormData.username} 
                onChangeText={(text) => handleFormChange('username', text)}
                autoCapitalize="none"
                placeholderTextColor="#7E818E"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={editFormData.bio} 
                onChangeText={(text) => handleFormChange('bio', text)}
                multiline
                placeholderTextColor="#7E818E"
              />
            </View>

            {/* Botão Salvar */}
            <TouchableOpacity style={styles.saveChangesButton} onPress={handleFormSubmit}>
              <Text style={styles.btnTextDark}>Salvar alterações</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      <Modal visible={isImageModalOpen} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.imageModalOverlay} activeOpacity={1} onPress={() => setIsImageModalOpen(false)}>
          <Image source={{ uri: imageToShow }} style={styles.imageModalImg} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>

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
  profileTopGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'android' ? 185 : 160,
  },
  
  // ⬅️ BOTÃO FLUTUANTE CUSTOMIZADO
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Círculo quase transparente
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999, // Fica por cima de tudo
  },
  floatingSettingsButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  container: { flex: 1, paddingHorizontal: 16, backgroundColor: 'transparent' },
  centerContainer: { flex: 1, backgroundColor: '#18191D', justifyContent: 'center', alignItems: 'center' },
  errorMessage: { color: '#ff4444', fontSize: 16 },
  
  // ⬅️ Margem no topo pro conteúdo não brigar com o botão flutuante
  profileHeader: { marginTop: 30, alignItems: 'center' },
  profileHeaderTopRow: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', width: '100%', marginBottom: 16 },
  profileAvatar: { width: 90, height: 90, borderRadius: 45, marginRight: 20 },
  profileStats: { flexDirection: 'row', flex: 1, justifyContent: 'space-between', paddingHorizontal: 10 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#DEE0E8' },
  statLabel: { fontSize: 13, color: '#DEE0E831', fontWeight: '600' },
  
  profileNameLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  
  // ⬅️ ROW NO PERFIL
  profileNameGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  profileDisplayName: { fontSize: 22, fontWeight: 'bold', color: '#DEE0E8', marginRight: 8, flexShrink: 1 },
  profileUsernameTag: { fontSize: 15, color: '#DEE0E831', flexShrink: 1 },

  editProfileButton: { borderColor: '#DEE0E831', borderWidth: 1.5, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20 },
  editProfileButtonText: { color: '#DEE0E831', fontWeight: '500' },
  followButton: { backgroundColor: '#DEE0E8', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  followButtonText: { color: '#18191D', fontWeight: 'bold' },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#888' },
  followingButtonText: { color: '#ccc' },
  profileBio: { color: '#DEE0E831', fontSize: 15, marginTop: 16, width: '100%' },

  feedMainWrapper: { marginTop: 30, width: '100%' },
  reviewsTitle: { fontSize: 20, fontWeight: 'bold', color: '#DEE0E8', marginBottom: 16 },
  emptyText: { textAlign: 'center', color: '#DEE0E8', marginTop: 20 },

  // ⬅️ ESTILOS EXATOS DO FEEDSCREEN REPETIDOS AQUI
  cardWrapper: { marginBottom: 15, width: '100%', position: 'relative' }, // Margin adaptado pra respirar na listagem
  topFilament: { position: 'absolute', top: 0, alignSelf: 'center', width: '90%', height: 1.5, backgroundColor: 'rgba(222, 224, 232, 0.05)', borderRadius: 2 },
  reviewCard: { paddingHorizontal: 10, paddingTop: 15, paddingBottom: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' },
  userInfoClickable: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 10 },
  // ⬅️ ROW NO CARD
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
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 6 },
  actionText: { color: '#DEE0E8', fontSize: 14, marginLeft: 6, fontWeight: 'bold' },
  commentActionText: { color: '#55565C' },

  // Modais
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#1E1F24',
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
    borderBottomColor: 'rgba(222, 224, 232, 0.05)',
  },
  sheetActionRowNoBorder: {
    borderBottomWidth: 0,
  },
  sheetActionText: {
    color: '#DEE0E8',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  followModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  followModalContent: { backgroundColor: '#18191D', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, maxHeight: '75%' },
  followModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  followModalTitle: { color: '#DEE0E8', fontSize: 18, fontWeight: 'bold' },
  followUserRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(222, 224, 232, 0.06)' },
  followUserAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#2A2A2A' },
  followUserInfo: { flex: 1 },
  followUserName: { color: '#DEE0E8', fontSize: 15, fontWeight: 'bold' },
  followUserUsername: { color: 'rgba(222, 224, 232, 0.55)', fontSize: 13, marginTop: 2 },
  editModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  editModalContent: { backgroundColor: '#18191D', borderRadius: 12, padding: 20, maxHeight: '90%' },
  editModalClose: { position: 'absolute', top: 12, right: 12, zIndex: 10 },
  modalTitle: { color: '#7E818E', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#282828', paddingBottom: 12 },
  avatarUploadSection: { alignItems: 'center', marginBottom: 20 },
  profileAvatarLarge: { width: 120, height: 120, borderRadius: 60, marginBottom: 12 },
  avatarModalUploadBtn: { backgroundColor: '#DEE0E8', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25 },
  formGroup: { marginBottom: 14 },
  label: { color: '#7E818E', marginBottom: 6, fontSize: 13 },
  input: { borderWidth: 1, borderColor: '#dee0e831', borderRadius: 8, color: '#FFF', padding: 12, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveChangesButton: { backgroundColor: '#DEE0E8', paddingVertical: 14, borderRadius: 25, alignItems: 'center', marginTop: 10 },
  btnTextDark: { color: '#18191D', fontWeight: 'bold', fontSize: 15 },
  disabledBtn: { backgroundColor: '#333' },
  errorMessageText: { color: '#ff4444', textAlign: 'center', marginBottom: 10 },
  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  imageModalImg: { width: '90%', height: '90%' },
});

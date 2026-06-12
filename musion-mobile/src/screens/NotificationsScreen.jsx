import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Image, 
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api'; 

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Como estamos nesta tela, a tab ativa é sempre 'notifications'
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('musion_token'); 
      const response = await api.get('/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(response.data);
      setLoading(false); 
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = await AsyncStorage.getItem('musion_token');

      await api.patch(`/notifications/${notificationId}/read`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const goToPost = (item) => {
    const reviewData = item.review;
    const targetNavigation = navigation.getParent?.() || navigation;

    if (!item.reviewId || !reviewData) return;

    targetNavigation.navigate('PostScreen', {
      reviewId: item.reviewId,
      reviewData,
    });
  };

  const handleNotificationPress = (item) => {
    markAsRead(item.id);

    if (item.type === 'FOLLOW') {
      const senderId = item.sender?.id || item.senderId;

      if (senderId) {
        const targetNavigation = navigation.getParent?.() || navigation;
        targetNavigation.navigate('Profile', { id: senderId });
      }

      return;
    }

    if (item.type === 'LIKE' || item.type === 'COMMENT') {
      goToPost(item);
    }
  };

  const renderNotificationMessage = (item) => {
    const senderName = item.sender?.displayName || item.sender?.username || 'Alguém';
    
    switch (item.type) {
      case 'LIKE':
        return (
          <Text style={styles.messageText}>
            <Text style={styles.bold}>{senderName}</Text> curtiu sua review do álbum <Text style={styles.bold}>{item.albumName}</Text>.
          </Text>
        );
      case 'COMMENT':
        return (
          <Text style={styles.messageText}>
            <Text style={styles.bold}>{senderName}</Text> comentou na sua review do álbum <Text style={styles.bold}>{item.albumName}</Text>.
          </Text>
        );
      case 'FOLLOW':
        return (
          <Text style={styles.messageText}>
            <Text style={styles.bold}>{senderName}</Text> começou a seguir você.
          </Text>
        );
      default:
        return (
          <Text style={styles.messageText}>
            <Text style={styles.bold}>{senderName}</Text> interagiu com seu perfil.
          </Text>
        );
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.75}
    >
      <Image 
        source={{ uri: item.sender?.avatarUrl || 'https://via.placeholder.com/150' }} 
        style={styles.avatar} 
      />
      <View style={styles.textContainer}>
        {renderNotificationMessage(item)}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerAll}>
          <ActivityIndicator size="large" color="#DEE0E8" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notificações</Text>
        </View>

        {/* LISTA DE NOTIFICAÇÕES */}
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.scrollContent} // Usa o mesmo paddingBottom do seu ScrollView
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhuma notificação por enquanto.</Text>
          }
        />



      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // CORRIGINDO O ENCAIXE NO TOPO COM O STATUS BAR E MANTENDO SUA COR DE FUNDO
  safeArea: { 
    flex: 1, 
    backgroundColor: '#18191D', 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  container: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  centerAll: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: '#DEE0E8',
    fontSize: 24,
    fontWeight: 'bold',
  },
  
  // ESPAÇO NO FUNDO PARA A LISTA NÃO FICAR ESCONDIDA ATRÁS DA NAVBAR
  scrollContent: { 
    paddingHorizontal: 16,
    paddingBottom: 100 
  },
  
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18191D', // Combinando com seu design
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#dee0e831',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#DEE0E8', 
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    backgroundColor: '#2A2A2A',
  },
  textContainer: {
    flex: 1,
  },
  messageText: {
    color: 'rgba(222, 224, 232, 0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#DEE0E8',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
});

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { confirmUnblockUser } from '../services/moderation';

export default function BlockedUsersScreen({ navigation }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBlockedUsers = useCallback(async () => {
    try {
      const response = await api.get('/moderation/blocks');
      setBlockedUsers(response.data || []);
    } catch (error) {
      setBlockedUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadBlockedUsers();
    }, [loadBlockedUsers])
  );

  const handleUnblock = (item) => {
    confirmUnblockUser({
      userId: item.user?.id,
      username: item.user?.username,
      onSuccess: () =>
        setBlockedUsers((prev) =>
          prev.filter((block) => block.user?.id !== item.user?.id)
        ),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={24} color="#DEE0E8" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Bloqueados</Text>

        <View style={styles.iconButton} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#DEE0E8" />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum usuário bloqueado.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <Image
                source={{
                  uri: item.user?.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png',
                }}
                style={styles.avatar}
              />

              <View style={styles.userInfo}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {item.user?.displayName || item.user?.username || 'Usuário'}
                </Text>
                <Text style={styles.username} numberOfLines={1}>
                  @{item.user?.username || 'user'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblock(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.unblockButtonText}>Desbloquear</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#18191D',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 232, 0.05)',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: '#DEE0E8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  emptyText: {
    color: 'rgba(222, 224, 232, 0.55)',
    textAlign: 'center',
    marginTop: 30,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 232, 0.06)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: '#DEE0E8',
    fontSize: 15,
    fontWeight: 'bold',
  },
  username: {
    color: 'rgba(222, 224, 232, 0.55)',
    fontSize: 13,
    marginTop: 2,
  },
  unblockButton: {
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 232, 0.22)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  unblockButtonText: {
    color: '#DEE0E8',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

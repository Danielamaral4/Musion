import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

const NO_COVER = 'https://via.placeholder.com/150/333333/FFFFFF?text=No+Cover';

export function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('albums');
  const [albumResults, setAlbumResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setAlbumResults([]);
      setUserResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(() => {
      if (activeTab === 'albums') {
        api
          .get('/spotify/search', { params: { q: searchQuery } })
          .then((res) => setAlbumResults(res.data))
          .catch((err) => console.error('Erro na busca de albuns:', err))
          .finally(() => setIsSearching(false));
      } else {
        api
          .get('/users/search', { params: { q: searchQuery } })
          .then((res) => setUserResults(res.data))
          .catch((err) => console.error('Erro na busca de usuarios:', err))
          .finally(() => setIsSearching(false));
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleAlbumSelect = (album) => {
    navigation.navigate('AlbumDetails', { id: album.id });
  };

  const handleUserSelect = (user) => {
    navigation.navigate('Profile', { id: user.id || user._id });
  };

  const renderAlbumItem = (item) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleAlbumSelect(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.images?.[0]?.url || NO_COVER }} style={styles.resultCover} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.resultSub} numberOfLines={1}>
          {item.artists?.map((a) => a.name).join(', ')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#55565C" />
    </TouchableOpacity>
  );

  const renderUserItem = (item) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleUserSelect(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.avatarUrl || item.profilePicture || NO_COVER }}
        style={[styles.resultCover, styles.userAvatarRounded]}
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.displayName || item.username || item.name}
        </Text>
        <Text style={styles.resultSub} numberOfLines={1}>
          {item.username ? `@${item.username}` : 'Ver perfil'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#55565C" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['transparent', 'rgba(222, 224, 232, 0.05)', 'transparent']}
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

      <View style={styles.container}>
        <View style={styles.searchBar}>
          <TouchableOpacity onPress={() => navigation.navigate('Feed')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#7E818E" />
          </TouchableOpacity>

          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'albums'
                ? 'Qual album voce quer encontrar?'
                : 'Qual usuario voce procura?'
            }
            placeholderTextColor="#7E818E"
            autoFocus
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={20} color="#7E818E" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="search" size={20} color="#7E818E" style={styles.searchIcon} />
          )}
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'albums' && styles.tabButtonActive]}
            onPress={() => setActiveTab('albums')}
          >
            <Text style={[styles.tabText, activeTab === 'albums' && styles.tabTextActive]}>
              Albuns
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'users' && styles.tabButtonActive]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
              Usuarios
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchResultsContainer}>
          {isSearching && <ActivityIndicator size="large" color="#DEE0E8" style={styles.loading} />}

          <FlatList
            data={activeTab === 'albums' ? albumResults : userResults}
            keyExtractor={(item, index) => (item.id || item._id || index).toString()}
            contentContainerStyle={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) =>
              activeTab === 'albums' ? renderAlbumItem(item) : renderUserItem(item)
            }
            ListEmptyComponent={
              !isSearching && searchQuery ? (
                <Text style={styles.noResults}>
                  Nenhum {activeTab === 'albums' ? 'album' : 'usuario'} encontrado para "
                  {searchQuery}".
                </Text>
              ) : null
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#18191D',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    marginTop: 40,
  },
  noResults: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18191D',
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#dee0e831',
    shadowColor: '#DEE0E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  backButton: {
    marginRight: 10,
  },
  searchIcon: {
    marginLeft: 8,
  },
  clearIcon: {
    padding: 4,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    height: '100%',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#DEE0E8',
  },
  tabText: {
    color: '#7E818E',
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#DEE0E8',
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsList: {
    paddingBottom: 100,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 232, 0.12)',
    borderRadius: 8,
    backgroundColor: '#18191D',
    shadowColor: '#DEE0E8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  resultCover: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: '#333',
    marginRight: 14,
  },
  userAvatarRounded: {
    borderRadius: 26,
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 10,
  },
  resultName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultSub: {
    color: '#888',
    fontSize: 14,
  },
});

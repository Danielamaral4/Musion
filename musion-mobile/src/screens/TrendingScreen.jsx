import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // ⬅️ Adicionado o Gradiente
import {
  getCachedTrendingPayload,
  preloadTrendingData,
} from '../services/trendingPreload';

// --- FUNÇÕES AUXILIARES ---
const normalizeAlbum = (a) => ({
  id: a.id || a.albumId || a._id,
  name: a.name || a.albumName || 'Álbum Desconhecido',
  artistName: a.artistName || a.albumArtist || a.artists?.[0]?.name || 'Artista Desconhecido',
  imageUrl: a.imageUrl || a.albumCover || a.images?.[0]?.url || '',
  rating: a.rating ?? null,
});

const getSafeRating = (rating) => {
  const num = parseFloat(rating);
  if (isNaN(num)) return null;
  const fixed = num.toFixed(1);
  return fixed === '10.0' ? '10' : fixed;
};

const getRatingColor = (value) => {
  const r = parseFloat(value);
  if (isNaN(r)) return '#333333'; 
  if (r <= 3.9) return '#F20505'; 
  if (r <= 6.9) return '#F2CB05'; 
  return '#37A603'; 
};

// --- COMPONENTES MENORES ---
const SkeletonCard = () => (
  <View style={styles.dashCard}>
    <View style={[styles.skeleton, { width: '100%', height: 160, marginBottom: 10 }]} />
    <View style={[styles.skeleton, { width: '70%', height: 16, marginBottom: 6 }]} />
    <View style={[styles.skeleton, { width: '45%', height: 12 }]} />
  </View>
);

const SkeletonGrid = () => (
  <FlatList
    style={styles.horizontalList}
    horizontal
    showsHorizontalScrollIndicator={false}
    data={[1, 2, 3, 4]}
    keyExtractor={(item) => item.toString()}
    renderItem={() => <SkeletonCard />}
    contentContainerStyle={styles.listContainer}
  />
);

const AlbumGrid = ({ albums, navigation }) => {
  if (!albums?.length) return null;

  return (
    <FlatList
      style={styles.horizontalList}
      horizontal
      showsHorizontalScrollIndicator={false}
      data={albums}
      keyExtractor={(item, index) => (item.id || item.albumId || index).toString()}
      contentContainerStyle={styles.listContainer}
      snapToAlignment="start"
      decelerationRate="fast"
      snapToInterval={176} 
      renderItem={({ item }) => {
        const n = normalizeAlbum(item);
        const ratingVal = getSafeRating(n.rating);

        return (
          <TouchableOpacity 
            style={styles.dashCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AlbumDetails', { id: n.id })}
          >
            <Image 
              source={{ uri: n.imageUrl || 'https://i.stack.imgur.com/l60Hf.png' }} 
              style={styles.cardImage} 
            />
            
            <View style={styles.infoRow}>
              <View style={styles.textCol}>
                <Text style={styles.dashTitle} numberOfLines={1}>{n.name}</Text>
                <Text style={styles.dashArtist} numberOfLines={1}>{n.artistName}</Text>
              </View>

              <View style={[styles.ratingSquare, { backgroundColor: getRatingColor(ratingVal) }]}>
                <Text style={styles.ratingText}>{ratingVal || '-'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
};

// --- TELA PRINCIPAL ---
export function TrendingScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [recommendedByLast, setRecommendedByLast] = useState([]);
  const [lastAlbumName, setLastAlbumName] = useState(null);
  const [recommendedBySecond, setRecommendedBySecond] = useState([]);
  const [secondAlbumName, setSecondAlbumName] = useState(null);
  const [recommendedByThird, setRecommendedByThird] = useState([]);
  const [thirdAlbumName, setThirdAlbumName] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const cached = await getCachedTrendingPayload();
      if (cached.dashboard) {
        setData(cached.dashboard);
        setLoading(false);
      }

      if (cached.recommendations) {
        applyRecommendations(cached.recommendations);
      }

      const fresh = await preloadTrendingData({ force: true });

      if (fresh?.dashboard) {
        setData(fresh.dashboard);
      }

      if (fresh?.recommendations) {
        applyRecommendations(fresh.recommendations);
      }
    } catch (error) {
      console.error("Erro ao carregar Dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendations = (recommendations) => {
    const last = recommendations?.last || {};
    const second = recommendations?.second || {};
    const third = recommendations?.third || {};

    setLastAlbumName(last.baseAlbumName || null);
    setRecommendedByLast((last.recommendations || []).slice(0, 7));
    setSecondAlbumName(second.baseAlbumName || null);
    setRecommendedBySecond((second.recommendations || []).slice(0, 7));
    setThirdAlbumName(third.baseAlbumName || null);
    setRecommendedByThird((third.recommendations || []).slice(0, 7));
  };

  if (!data && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerAll}>
          <Text style={styles.emptyText}>Avalie alguns álbuns para começar!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* 🌟 FUNDO COM GRADIENTE GLOBAL 🌟 */}
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

      <View style={styles.container}>
        
        {/* CONTEÚDO SCROLLÁVEL */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionTitle}>Em Alta no Musion</Text>
          {loading && !data ? <SkeletonGrid /> : <AlbumGrid albums={data?.popular} navigation={navigation} />}

          <Text style={styles.sectionTitle}>Aclamação da Crítica</Text>
          {loading && !data ? <SkeletonGrid /> : <AlbumGrid albums={data?.topRated} navigation={navigation} />}

          {recommendedByLast?.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>
                Porque você curtiu <Text style={styles.recommendedName}>{lastAlbumName}</Text>
              </Text>
              <AlbumGrid albums={recommendedByLast} navigation={navigation} />
            </View>
          )}

          {recommendedBySecond?.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>
                Porque você também curtiu <Text style={styles.recommendedName}>{secondAlbumName}</Text>
              </Text>
              <AlbumGrid albums={recommendedBySecond} navigation={navigation} />
            </View>
          )}

          {recommendedByThird?.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>
                Porque você gostou de <Text style={styles.recommendedName}>{thirdAlbumName}</Text>
              </Text>
              <AlbumGrid albums={recommendedByThird} navigation={navigation} />
            </View>
          )}
          
        </ScrollView>

        {/* --- NAVBAR INFERIOR --- */}
          {/* ⬅️ AQUI ESTÁ A MUDANÇA: Navega para SearchScreen empilhando */}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#18191D', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: 'transparent' }, // Deixado transparente para mostrar o gradiente do fundo
  centerAll: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 16 },
  
  scrollContent: { paddingBottom: 100 }, 
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#DEE0E8', marginLeft: 16, marginTop: 30, marginBottom: 12 },
  recommendedName: { color: '#FFF', fontWeight: '800' },
  
  horizontalList: { overflow: 'visible' },
  listContainer: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  
  dashCard: {
    width: 160,
    backgroundColor: '#18191D',
    borderWidth: 1.5,
    borderColor: '#dee0e831',
    borderRadius: 8,
    padding: 10,
    marginRight: 4,
    marginVertical: 2,
    shadowColor: '#DEE0E8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  },
  cardImage: { width: '100%', height: 140, borderRadius: 6, backgroundColor: '#282828', marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  textCol: { flex: 1, overflow: 'hidden', paddingRight: 8 },
  dashTitle: { fontWeight: 'bold', fontSize: 14, color: '#DEE0E8', marginBottom: 4 },
  dashArtist: { fontSize: 12, color: 'rgba(222, 224, 232, 0.7)' },
  
  ratingSquare: { width: 34, height: 34, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  ratingText: { color: '#FFF', fontWeight: 'bold', fontSize: 20 },

  skeleton: { backgroundColor: '#2A2A2A', borderRadius: 4, opacity: 0.6 },
});

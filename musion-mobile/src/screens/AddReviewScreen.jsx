import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform, 
  StatusBar, 
  Image, 
  FlatList, 
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient'; // <-- Novo import adicionado
import { Accelerometer } from 'expo-sensors';

// ⚠️ Confirmando: seu import estava como services/api na última mensagem
import api from '../services/api';

const NO_COVER = "https://via.placeholder.com/150/333333/FFFFFF?text=No+Cover";
const SLIDER_THUMB_SIZE = 38;
const SLIDER_EDGE_INSET = 12;
const clampRating = (value) => Math.min(Math.max(Number(value) || 0, 0), 10);

export function AddReviewScreen({ navigation, route }) {
  const reviewToEdit = route.params?.reviewToEdit || null;
  const albumToReview = route.params?.albumToReview || null;
  const returnToAlbum = route.params?.returnToAlbum || false;
  const isEditing = !!reviewToEdit;
  const isReviewingAlbum = !!albumToReview;
  
  const [step, setStep] = useState(isEditing || isReviewingAlbum ? 2 : 1);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [rating, setRating] = useState(isEditing ? reviewToEdit.rating : 5);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [isSliderActive, setIsSliderActive] = useState(false);
  const [sensorRatingEnabled, setSensorRatingEnabled] = useState(false);
  const [sensorRatingUsed, setSensorRatingUsed] = useState(false);
  const [reviewText, setReviewText] = useState(isEditing ? reviewToEdit.text : '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const sensorSubscriptionRef = useRef(null);

  // --- PREENCHER DADOS (EDIÇÃO) ---
  useEffect(() => {
    if (isEditing && reviewToEdit) {
      setSelectedAlbum({
        id: reviewToEdit.spotifyId || reviewToEdit.albumId,
        spotifyId: reviewToEdit.spotifyId || reviewToEdit.albumId,
        name: reviewToEdit.albumName,
        artistName: reviewToEdit.albumArtist,
        imageUrl: reviewToEdit.albumCover || NO_COVER,
        releaseDate: reviewToEdit.releaseYear,
        totalTracks: 0,
        totalDurationMin: 0 
      });

      api.get(`/spotify/album/${reviewToEdit.albumId}`)
         .then(res => {
            const processed = processAlbumData(res.data);
            setSelectedAlbum(prev => ({
                ...prev,
                totalTracks: processed.totalTracks,
                totalDurationMin: processed.totalDurationMin,
                releaseDate: processed.releaseDate || prev.releaseDate
            }));
         })
         .catch(() => console.log("Sem detalhes extras."));
    }
  }, [isEditing, reviewToEdit]);

  useEffect(() => {
    if (!isEditing && albumToReview) {
      setSelectedAlbum({
        id: albumToReview.id,
        spotifyId: albumToReview.id,
        name: albumToReview.name,
        artistName: albumToReview.artistName,
        imageUrl: albumToReview.imageUrl || NO_COVER,
        releaseDate: albumToReview.releaseDate,
        totalTracks: albumToReview.totalTracks || 0,
        totalDurationMin: albumToReview.totalDurationMin || 0,
      });
    }
  }, [albumToReview, isEditing]);

  // --- BUSCA ---
  useEffect(() => {
    if (isEditing) return;
    if (searchQuery.trim() === '') { setSearchResults([]); return; }

    setIsSearching(true);
    const timer = setTimeout(() => {
      api.get('/spotify/search', { params: { q: searchQuery } })
        .then(res => setSearchResults(res.data))
        .catch(console.error)
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isEditing]);

  useEffect(() => {
    return () => {
      sensorSubscriptionRef.current?.remove();
      sensorSubscriptionRef.current = null;
    };
  }, []);

  // --- PROCESSAMENTO DADOS ---
  const processAlbumData = (data) => {
    const tracksRaw = data.tracks?.items || data.tracks || [];
    let durationMin = data.totalDurationMin || 0;

    if (!durationMin) {
       if (Array.isArray(tracksRaw) && tracksRaw.length > 0) {
          const totalMs = tracksRaw.reduce((acc, t) => acc + (parseInt(t.duration_ms) || 0), 0);
          durationMin = Math.floor(totalMs / 60000);
       }
    }

    return {
        id: data.id,
        name: data.name || "",
        artistName: data.artistName || data.artists?.[0]?.name || "Artista Desconhecido",
        imageUrl: data.imageUrl || data.images?.[0]?.url || NO_COVER,
        releaseDate: data.releaseDate || data.release_date || "",
        totalTracks: data.totalTracks || data.total_tracks || tracksRaw.length || 0,
        totalDurationMin: durationMin
    };
  };

  const handleAlbumSelect = async (albumCard) => {
    setIsLoadingDetails(true);
    setStep(2);

    try {
      const response = await api.get(`/spotify/album/${albumCard.id}`);
      const processed = processAlbumData(response.data);

      if (!processed.name) processed.name = albumCard.name;
      if (processed.imageUrl === NO_COVER && albumCard.images?.[0]?.url) {
          processed.imageUrl = albumCard.images[0].url;
      }

      setSelectedAlbum({ ...processed, spotifyId: processed.id });
    } catch (err) {
      console.error("Erro ao buscar detalhes:", err);
      setSelectedAlbum({
        id: albumCard.id,
        spotifyId: albumCard.id,
        name: albumCard.name,
        artistName: albumCard.artists?.[0]?.name || "Artista",
        imageUrl: albumCard.images?.[0]?.url || NO_COVER,
        releaseDate: albumCard.release_date,
        totalTracks: albumCard.total_tracks || 0,
        totalDurationMin: 0
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSubmitReview = async () => {
    setIsSubmitting(true);
    
    const year = String(selectedAlbum.releaseDate || '').substring(0, 4);
    const coverToSave = selectedAlbum.imageUrl === NO_COVER ? "" : selectedAlbum.imageUrl;

    const payload = {
      spotifyId: selectedAlbum.spotifyId || selectedAlbum.id,
      albumId: selectedAlbum.id,
      albumName: selectedAlbum.name,
      albumCover: coverToSave,
      albumArtist: selectedAlbum.artistName,
      releaseYear: parseInt(year) || 0,
      rating: parseFloat(rating),
      text: reviewText
    };

    try {
      if (isEditing) {
        await api.patch(`/reviews/${reviewToEdit.id}`, payload);
      } else {
        await api.post('/reviews', payload);
      }

      if (returnToAlbum) {
        navigation.goBack();
      } else {
        navigation.navigate('Feed', {
          screen: 'Feed',
          params: { refresh: Date.now() },
        });
      }
    } catch (err) {
      setSubmitError('Erro ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LÓGICA DE CORES (INTERPOLAÇÃO RGB) ---
  const getDynamicRgb = (value) => {
    const r = clampRating(value);
    
    const red = { r: 242, g: 5, b: 5 };      
    const yellow = { r: 242, g: 203, b: 5 }; 
    const green = { r: 55, g: 166, b: 3 };   

    let finalR, finalG, finalB;

    if (r <= 5) {
      const percentage = r / 5; 
      finalR = Math.round(red.r + (yellow.r - red.r) * percentage);
      finalG = Math.round(red.g + (yellow.g - red.g) * percentage);
      finalB = Math.round(red.b + (yellow.b - red.b) * percentage);
    } else {
      const percentage = (r - 5) / 5;
      finalR = Math.round(yellow.r + (green.r - yellow.r) * percentage);
      finalG = Math.round(yellow.g + (green.g - yellow.g) * percentage);
      finalB = Math.round(yellow.b + (green.b - yellow.b) * percentage);
    }

    return { red: finalR, green: finalG, blue: finalB };
  };

  const getDynamicColor = (value) => {
    const color = getDynamicRgb(value);
    return `rgb(${color.red}, ${color.green}, ${color.blue})`;
  };

  const toggleSensorRating = () => {
    if (sensorRatingEnabled) {
      sensorSubscriptionRef.current?.remove();
      sensorSubscriptionRef.current = null;
      setSensorRatingEnabled(false);
      setIsSliderActive(false);
      return;
    }

    Accelerometer.setUpdateInterval(120);
    sensorSubscriptionRef.current = Accelerometer.addListener(({ x }) => {
      const nextRating = Math.round(clampRating(((x + 1) / 2) * 10) * 10) / 10;
      setRating(nextRating);
      setSensorRatingUsed(true);
    });

    setSensorRatingEnabled(true);
    setIsSliderActive(true);
  };

  const getTitleFontSize = (title) => {
    const len = title ? title.length : 0;
    if (len <= 12) return 28; 
    if (len <= 20) return 22; 
    if (len <= 35) return 18; 
    return 14;                
  };

  // --- RENDERIZAÇÃO: PASSO 1 (BUSCA) ---
  const renderSearchStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#7E818E" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Qual álbum você ouviu?"
          placeholderTextColor="#7E818E"
          autoFocus
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.searchResultsContainer}>
        {isSearching && <ActivityIndicator size="large" color="#DEE0E8" style={styles.loading} />}
        
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.albumResultItem} onPress={() => handleAlbumSelect(item)}>
              <Image source={{ uri: item.images?.[0]?.url || NO_COVER }} style={styles.albumResultCover} />
              <View style={styles.albumResultInfo}>
                <Text style={styles.albumResultName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.albumResultArtist} numberOfLines={1}>
                  {item.artists?.map(a => a.name).join(', ')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !isSearching && searchQuery ? <Text style={styles.noResults}>Nenhum álbum encontrado.</Text> : null
          }
        />
      </View>
    </View>
  );

  // --- RENDERIZAÇÃO: PASSO 2 (FORMULÁRIO) ---
  const renderFormStep = () => {
    if (!selectedAlbum) return <ActivityIndicator size="large" color="#DEE0E8" style={styles.loading} />;
    
    const dynamicColor = getDynamicColor(rating);
    const titleFontSize = getTitleFontSize(selectedAlbum.name);
    const numericRating = parseFloat(rating);
    const sliderThumbLeft = sliderWidth > 0
      ? Math.max(
          SLIDER_EDGE_INSET,
          Math.min(
            sliderWidth - SLIDER_THUMB_SIZE - SLIDER_EDGE_INSET,
            SLIDER_EDGE_INSET +
              (numericRating / 10) *
                (sliderWidth - SLIDER_THUMB_SIZE - SLIDER_EDGE_INSET * 2)
          )
        )
      : SLIDER_EDGE_INSET;

    const year = String(selectedAlbum.releaseDate || '').substring(0, 4);
    const metaParts = [];
    if (year) metaParts.push(year);
    if (selectedAlbum.totalTracks > 0) metaParts.push(`${selectedAlbum.totalTracks} faixas`);
    if (selectedAlbum.totalDurationMin > 0) metaParts.push(`${selectedAlbum.totalDurationMin} min`);

    return (
      <KeyboardAvoidingView 
        style={styles.stepContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Header do Form (Capa e Infos) */}
          <View style={styles.reviewFormHeader}>
            <Image source={{ uri: selectedAlbum.imageUrl }} style={styles.reviewFormCover} />
            <View style={styles.reviewFormInfo}>
              <Text style={[styles.albumTitle, { fontSize: titleFontSize }]}>
                {selectedAlbum.name}
              </Text>
              <Text style={styles.artistName}>{selectedAlbum.artistName}</Text>
              <Text style={styles.reviewFormMeta}>{metaParts.join(' • ')}</Text>
            </View>
          </View>

          {/* Corpo do Form */}
          <View style={styles.reviewFormBody}>
            <TextInput
              style={styles.reviewFormTextarea}
              placeholder="Escreva sua review..."
              placeholderTextColor="#55565C"
              multiline
              maxLength={280}
              value={reviewText}
              onChangeText={setReviewText}
            />
            <Text style={styles.charCounter}>{reviewText.length} / 280</Text>
            
            {/* Sistema de Nota com o novo estilo em pílula */}
            <View style={styles.ratingWrapper}>
              
              <View
                style={styles.customSliderTrack}
                onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
              >
                {sliderWidth > 0 && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.sliderThumbVisual,
                      {
                        left: sliderThumbLeft,
                        backgroundColor: isSliderActive
                          ? '#FFFFFF'
                          : 'rgba(222, 224, 232, 0.45)',
                        borderColor: isSliderActive
                          ? 'rgba(255, 255, 255, 0.95)'
                          : 'rgba(222, 224, 232, 0.35)',
                      },
                    ]}
                  />
                )}
                <Slider
                  style={styles.sliderItself}
                  minimumValue={0}
                  maximumValue={10}
                  step={0.1}
                  value={parseFloat(rating)}
                  onValueChange={(val) => setRating(val)}
                  onSlidingStart={() => setIsSliderActive(true)}
                  onSlidingComplete={(val) => {
                    setRating(val);
                    setIsSliderActive(false);
                  }}
                  // Deixa as linhas do slider transparentes para mostrar apenas a bolinha e o contorno externo
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                  thumbTintColor="rgba(255, 255, 255, 0)"
                />
              </View>
              
              <View style={[styles.ratingValueBox, { backgroundColor: dynamicColor }]}>
                <Text style={styles.ratingValueText}>
                  {parseFloat(rating) === 10 ? '10' : parseFloat(rating).toFixed(1)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.sensorRatingButton,
                sensorRatingEnabled && styles.sensorRatingButtonActive,
              ]}
              onPress={toggleSensorRating}
              activeOpacity={0.78}
            >
              <Ionicons
                name={sensorRatingEnabled ? 'phone-portrait' : 'phone-portrait-outline'}
                size={18}
                color={sensorRatingEnabled ? '#18191D' : '#DEE0E8'}
              />
              <View style={styles.sensorRatingTextBlock}>
                <Text
                  style={[
                    styles.sensorRatingTitle,
                    sensorRatingEnabled && styles.sensorRatingTitleActive,
                  ]}
                >
                  {sensorRatingEnabled ? 'Sensor controlando a nota' : 'Controlar nota com sensor'}
                </Text>
                <Text
                  style={[
                    styles.sensorRatingHint,
                    sensorRatingEnabled && styles.sensorRatingHintActive,
                  ]}
                >
                  Incline o celular para mover o slider.
                </Text>
              </View>
            </TouchableOpacity>

            {submitError ? <Text style={styles.errorMessage}>{submitError}</Text> : null}
            
            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
              onPress={handleSubmitReview} 
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar alterações' : 'Publicar review')}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['transparent', 'rgba(222, 224, 232, 0.09)', 'transparent']}
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
        
        {/* HEADER DA TELA */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 2 && !isEditing && !isReviewingAlbum ? setStep(1) : navigation.goBack()}>
            <Ionicons name={step === 2 && !isEditing && !isReviewingAlbum ? "chevron-back" : "arrow-back"} size={24} color="#DEE0E8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 1 ? 'Nova review' : (isEditing ? 'Editar review' : 'Nova review')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* CONTEÚDO DINÂMICO */}
        {step === 1 ? renderSearchStep() : renderFormStep()}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 232, 0.05)',
  },
  headerTitle: {
    color: '#7E818E',
    fontSize: 16,
    fontWeight: '600',
  },
  stepContainer: {
    flex: 1,
  },
  loading: {
    marginTop: 40,
  },
  noResults: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  
  /* --- ESTILOS: PASSO 1 (BUSCA) --- */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18191D',
    margin: 16,
    marginTop: 18,
    marginBottom: 18,
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    height: '100%',
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  albumResultItem: {
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
  albumResultCover: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#333',
    marginRight: 12,
  },
  albumResultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  albumResultName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  albumResultArtist: {
    color: '#888',
    fontSize: 14,
  },

  /* --- ESTILOS: PASSO 2 (FORMULÁRIO) --- */
  scrollContent: {
    paddingGrow: 1,
  },
  reviewFormHeader: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'flex-end',
    gap: 16,
  },
  reviewFormCover: {
    width: 150, // Aumentado conforme pedido
    height: 150, // Aumentado conforme pedido
    borderRadius: 6,
    backgroundColor: '#333',
  },
  reviewFormInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  albumTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  artistName: {
    color: '#55565C',
    fontSize: 14,
    fontWeight: '500',
  },
  reviewFormMeta: {
    color: '#55565C',
    fontSize: 12,
    marginTop: 4,
  },
  reviewFormBody: {
    padding: 20,
    gap: 16,
  },
  reviewFormTextarea: {
    width: '100%',
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: 'rgba(222, 224, 232, 0.2)',
    borderRadius: 10, // Arredondamento reduzido
    color: 'white',
    fontSize: 16,
    padding: 16,
    textAlignVertical: 'top', 
  },
  charCounter: {
    textAlign: 'right',
    color: '#55565C',
    fontSize: 12,
    marginTop: -10,
  },
  ratingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  
  /* --- NOVO ESTILO DO SLIDER (FORMATO PÍLULA DA IMAGEM) --- */
  customSliderTrack: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
    height: 56, // Altura que define o formato da "pílula"
    borderRadius: 30, // Deixa completamente redondo nas pontas
    borderWidth: 1.5,
    borderColor: '#dee0e831',
    backgroundColor: '#18191D',
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 10, // Android precisa de um respiro pro thumb não cortar
    overflow: 'visible',
    shadowColor: '#DEE0E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  sliderItself: {
    width: '100%', 
    height: 54,
    zIndex: 2,
  },
  sliderThumbVisual: {
    position: 'absolute',
    top: (56 - SLIDER_THUMB_SIZE) / 2,
    width: SLIDER_THUMB_SIZE,
    height: SLIDER_THUMB_SIZE,
    borderRadius: SLIDER_THUMB_SIZE / 2,
    borderWidth: 1,
    zIndex: 3,
  },

  ratingValueBox: {
    width: 55,
    height: 55,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingValueText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sensorRatingButton: {
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#dee0e831',
    backgroundColor: 'rgba(222, 224, 232, 0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  sensorRatingButtonActive: {
    backgroundColor: '#DEE0E8',
    borderColor: '#DEE0E8',
  },
  sensorRatingTextBlock: {
    flex: 1,
  },
  sensorRatingTitle: {
    color: '#DEE0E8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sensorRatingTitleActive: {
    color: '#18191D',
  },
  sensorRatingHint: {
    color: 'rgba(222, 224, 232, 0.48)',
    fontSize: 12,
    marginTop: 2,
  },
  sensorRatingHintActive: {
    color: 'rgba(24, 25, 29, 0.62)',
  },
  submitButton: {
    backgroundColor: '#DEE0E8',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
  },
  submitButtonText: {
    color: '#18191D',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorMessage: {
    color: '#ff4444',
    textAlign: 'center',
  }
});

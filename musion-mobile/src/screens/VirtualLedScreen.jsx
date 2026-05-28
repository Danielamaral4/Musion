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
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const defaultState = {
  albumName: 'Nenhum album enviado ainda',
  albumCover: null,
  source: 'Idle',
  hexColor: '#DEE0E8',
  rgb: { red: 222, green: 224, blue: 232 },
  createdAt: null,
};

const formatDate = (value) => {
  if (!value) return 'Aguardando sinal';

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const randomColor = () => ({
  red: Math.floor(Math.random() * 256),
  green: Math.floor(Math.random() * 256),
  blue: Math.floor(Math.random() * 256),
});

export default function VirtualLedScreen({ navigation }) {
  const [ledState, setLedState] = useState(defaultState);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const loadLed = useCallback(async () => {
    try {
      const [stateRes, historyRes] = await Promise.all([
        api.get('/iot/led/state'),
        api.get('/iot/led/history?take=12'),
      ]);

      setLedState(stateRes.data || defaultState);
      setHistory(historyRes.data || []);
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel carregar o LED virtual.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadLed();
    }, [loadLed])
  );

  const handleTestLed = async () => {
    const color = randomColor();
    setTesting(true);

    try {
      const response = await api.post('/iot/led/test', {
        ...color,
        albumName: 'Teste manual do LED',
      });

      setLedState(response.data);
      await loadLed();
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel testar o LED virtual.');
    } finally {
      setTesting(false);
    }
  };

  const rgb = ledState.rgb || defaultState.rgb;
  const glowColor = ledState.hexColor || '#DEE0E8';

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

        <Text style={styles.topBarTitle}>Musion Glow</Text>

        <TouchableOpacity style={styles.iconButton} onPress={loadLed} activeOpacity={0.75}>
          <Ionicons name="refresh" size={22} color="#DEE0E8" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#DEE0E8" />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => (item.id || index).toString()}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              <View style={styles.ledPanel}>
                <View style={[styles.glowHaloOuter, { backgroundColor: glowColor }]}>
                  <View style={[styles.glowHaloMiddle, { backgroundColor: glowColor }]}>
                    <View
                      style={[
                        styles.ledCircle,
                        {
                          backgroundColor: glowColor,
                          shadowColor: glowColor,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Text style={styles.ledLabel}>LED Virtual</Text>
                <Text style={styles.ledSubLabel}>Simulador do ESP32 com LED RGB</Text>
              </View>

              <View style={styles.currentPanel}>
                <View style={styles.albumRow}>
                  {ledState.albumCover ? (
                    <Image source={{ uri: ledState.albumCover }} style={styles.albumCover} />
                  ) : (
                    <View style={[styles.albumCoverFallback, { backgroundColor: glowColor }]}>
                      <Ionicons name="bulb-outline" size={26} color="#18191D" />
                    </View>
                  )}

                  <View style={styles.albumTextBlock}>
                    <Text style={styles.currentLabel}>Sinal atual</Text>
                    <Text style={styles.albumName} numberOfLines={2}>
                      {ledState.albumName || defaultState.albumName}
                    </Text>
                    <Text style={styles.sourceText}>{ledState.source}</Text>
                  </View>
                </View>

                <View style={styles.colorInfoRow}>
                  <View style={styles.colorInfoBox}>
                    <Text style={styles.colorInfoLabel}>HEX</Text>
                    <Text style={styles.colorInfoValue}>{glowColor}</Text>
                  </View>

                  <View style={styles.colorInfoBox}>
                    <Text style={styles.colorInfoLabel}>RGB</Text>
                    <Text style={styles.colorInfoValue}>
                      {rgb.red}, {rgb.green}, {rgb.blue}
                    </Text>
                  </View>
                </View>

                <Text style={styles.timestamp}>{formatDate(ledState.createdAt)}</Text>

                <TouchableOpacity
                  style={[styles.testButton, testing && styles.disabledButton]}
                  onPress={handleTestLed}
                  disabled={testing}
                  activeOpacity={0.8}
                >
                  {testing ? (
                    <ActivityIndicator size="small" color="#18191D" />
                  ) : (
                    <>
                      <Ionicons name="flash-outline" size={18} color="#18191D" />
                      <Text style={styles.testButtonText}>Testar LED</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Historico de sinais</Text>
            </>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Abra um album ou post para enviar uma cor ao LED virtual.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.historyRow}>
              <View style={[styles.historySwatch, { backgroundColor: item.hexColor }]} />

              <View style={styles.historyTextBlock}>
                <Text style={styles.historyAlbum} numberOfLines={1}>
                  {item.albumName}
                </Text>
                <Text style={styles.historyMeta}>
                  {item.hexColor} - {formatDate(item.createdAt)}
                </Text>
              </View>
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
    paddingBottom: 40,
  },
  ledPanel: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  glowHaloOuter: {
    width: 210,
    height: 210,
    borderRadius: 105,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.18,
  },
  glowHaloMiddle: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.75,
  },
  ledCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowOpacity: 0.9,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  ledLabel: {
    color: '#DEE0E8',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  ledSubLabel: {
    color: 'rgba(222, 224, 232, 0.55)',
    fontSize: 13,
    marginTop: 4,
  },
  currentPanel: {
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 232, 0.08)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 24,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumCover: {
    width: 70,
    height: 70,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#282828',
  },
  albumCoverFallback: {
    width: 70,
    height: 70,
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumTextBlock: {
    flex: 1,
  },
  currentLabel: {
    color: 'rgba(222, 224, 232, 0.55)',
    fontSize: 12,
    marginBottom: 3,
  },
  albumName: {
    color: '#DEE0E8',
    fontSize: 17,
    fontWeight: 'bold',
  },
  sourceText: {
    color: 'rgba(222, 224, 232, 0.55)',
    fontSize: 13,
    marginTop: 3,
  },
  colorInfoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  colorInfoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 232, 0.08)',
    borderRadius: 8,
    padding: 10,
  },
  colorInfoLabel: {
    color: 'rgba(222, 224, 232, 0.45)',
    fontSize: 11,
    marginBottom: 4,
  },
  colorInfoValue: {
    color: '#DEE0E8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timestamp: {
    color: 'rgba(222, 224, 232, 0.45)',
    fontSize: 12,
    marginTop: 12,
  },
  testButton: {
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DEE0E8',
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testButtonText: {
    color: '#18191D',
    fontSize: 15,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.65,
  },
  sectionTitle: {
    color: '#DEE0E8',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    color: 'rgba(222, 224, 232, 0.55)',
    textAlign: 'center',
    marginTop: 10,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 232, 0.06)',
  },
  historySwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  historyTextBlock: {
    flex: 1,
  },
  historyAlbum: {
    color: '#DEE0E8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyMeta: {
    color: 'rgba(222, 224, 232, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
});

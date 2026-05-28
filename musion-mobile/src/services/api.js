import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const localApiURL = 'http://192.168.15.3:3000';
const baseURL = process.env.EXPO_PUBLIC_API_URL || localApiURL;

const api = axios.create({
  baseURL,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('musion_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('musion_token');
      alert('Sessão expirada! Por favor, faça login novamente.');
    }

    return Promise.reject(error);
  }
);

export default api;

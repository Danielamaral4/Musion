// src/api.js
import axios from 'axios';

// Base URL: se estiver em produção, troca para process.env
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// --- INTERCEPTOR DE REQUISIÇÃO ---
// Adiciona token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('musion_token'); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- INTERCEPTOR DE RESPOSTA ---
// Lida com 401 e outros erros globais
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('musion_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

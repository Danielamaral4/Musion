import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import ProfilePage from './ProfilePage';
import Feed from './Feed';
import AlbumPage from './AlbumPage';
import Layout from './Layout';
import './index.css';

// Layout protegido (Requer Login)
const ProtectedLayout = () => {
  const token = localStorage.getItem('musion_token'); 
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout />;
};

// Layout de visitante (Só para quem NÃO está logado)
const GuestLayout = () => {
  const token = localStorage.getItem('musion_token');
  if (token) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- PRIORIDADE MÁXIMA: ROTAS DE VISITANTE --- */}
        {/* Devem vir PRIMEIRO para que /login não seja confundido com um ID */}
        <Route element={<GuestLayout />}>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
        </Route>

        {/* --- PRIORIDADE 2: ROTAS PROTEGIDAS --- */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/feed" element={<Feed />} />
          
          {/* Rotas Específicas */}
          <Route path="/profile" element={<ProfilePage />} />
          
          {/* Rotas Dinâmicas (Devem vir depois das específicas) */}
          <Route path="/profile/:id" element={<ProfilePage />} />
          
          {/* Rota do Álbum (Use /album/ para evitar conflito na raiz) */}
          <Route path="/album/:albumId" element={<AlbumPage />} />
        </Route>

        {/* --- ROTA CORINGA --- */}
        {/* Qualquer url desconhecida vai para a home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
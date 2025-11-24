import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import ProfilePage from './ProfilePage';
import Feed from './Feed';
import AlbumPage from './AlbumPage'; // <-- Importar a página do álbum
import Layout from './Layout';
import './index.css';

const ProtectedLayout = () => {
  const token = localStorage.getItem('musion_token'); 
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout />;
};

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
        {/* Rotas de visitante */}
        <Route element={<GuestLayout />}>
          <Route path="/login" element={<AuthPage />} />
        </Route>

        {/* Dashboard sempre acessível */}
        <Route path="/" element={<Layout isGuest={true} />}>
          <Route index element={<Dashboard />} />
        </Route>

        {/* Rotas protegidas */}
        <Route element={<ProtectedLayout />}>
          <Route path="/feed" element={<Feed />} />
          <Route path="/profile" element={<ProfilePage />} />      
          <Route path="/profile/:id" element={<ProfilePage />} />  
          <Route path="/album/:id" element={<AlbumPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>

  );
  
}

export default App;

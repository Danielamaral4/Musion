import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import ProfilePage from './ProfilePage';
import Feed from './Feed';
import AlbumPage from './AlbumPage';
import Layout from './Layout';
import ChatPage from './ChatPage';
import NotificationsPage from './NotificationsPage';
import SettingsPage from './SettingsPage';
import BlockedUsersPage from './BlockedUsersPage';
import PostPage from './PostPage';
import AdminModerationPage from './AdminModerationPage';
import Logo from './assets/Musion0.png';
import api from './api';
import './index.css';

// Layout protegido (Requer Login)
const ProtectedLayout = () => {
  const token = localStorage.getItem('musion_token'); 
  const location = useLocation();
  const isPublicReadableRoute =
    location.pathname.startsWith('/album/') ||
    /^\/profile\/\d+/.test(location.pathname);

  if (!token) {
    if (location.pathname === '/') {
      return <PublicHome />;
    }
    if (isPublicReadableRoute) {
      return <PublicShell />;
    }
    return <Navigate to="/login" replace />;
  }
  return <Layout />;
};

const PublicNavbar = () => {
  const navigate = useNavigate();
  const searchContainerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ albums: [], users: [] });
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchResults({ albums: [], users: [] });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults({ albums: [], users: [] });
      setIsSearchLoading(false);
      return;
    }

    setIsSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const [spotifyRes, usersRes] = await Promise.allSettled([
          api.get('/spotify/search', { params: { q: query } }),
          api.get('/users/public/search', { params: { q: query } }),
        ]);

        const albums = spotifyRes.status === 'fulfilled' && Array.isArray(spotifyRes.value.data)
          ? spotifyRes.value.data
          : [];

        const users = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value.data)
          ? usersRes.value.data
          : [];

        setSearchResults({ albums, users });
      } catch {
        setSearchResults({ albums: [], users: [] });
      } finally {
        setIsSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults({ albums: [], users: [] });
  };

  const handleAlbumClick = (album) => {
    const albumTarget = album.spotifyId || album.albumId || album.id;
    if (!albumTarget) return;

    clearSearch();
    navigate(`/album/${albumTarget}`);
  };

  const handleUserClick = (userId) => {
    clearSearch();
    navigate(`/profile/${userId}`);
  };

  const hasResults = searchResults.albums.length > 0 || searchResults.users.length > 0;

  return (
    <header className="public-navbar">
      <div className="public-brand-search">
        <Link to="/" className="public-logo" onClick={clearSearch}>
          <img src={Logo} alt="Musion" />
        </Link>

        <div className="public-search-container" ref={searchContainerRef}>
          <input
            type="text"
            className="public-search-input"
            placeholder="Buscar álbuns ou usuários..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button className="public-search-button" type="button" aria-label="Buscar">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {(hasResults || isSearchLoading) && searchQuery.trim().length >= 2 && (
            <div className="public-search-results">
              {isSearchLoading && <div className="public-search-loading">Buscando...</div>}

              {searchResults.users.length > 0 && (
                <div className="public-results-section">
                  <h4>Usuários</h4>
                  {searchResults.users.map((user) => (
                    <button key={user.id} className="public-result-item public-user-result" onClick={() => handleUserClick(user.id)}>
                      <img src={user.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png'} alt="" />
                      <span>
                        <strong>{user.displayName || user.username}</strong>
                        <small>@{user.username}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.albums.length > 0 && (
                <div className="public-results-section">
                  <h4>Álbuns</h4>
                  {searchResults.albums.map((album) => (
                    <button key={album.id} className="public-result-item public-album-result" onClick={() => handleAlbumClick(album)}>
                      <img src={album.images?.[2]?.url || album.images?.[0]?.url || '/placeholder.png'} alt="" />
                      <span>
                        <strong>{album.name}</strong>
                        <small>{album.artists?.[0]?.name || 'Artista desconhecido'}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!isSearchLoading && !hasResults && (
                <div className="public-search-loading">Nada encontrado.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <nav>
        <Link to="/login">Entrar</Link>
        <Link to="/register" className="public-register-link">Cadastrar</Link>
      </nav>
    </header>
  );
};

const PublicShell = () => (
  <div className="public-home">
    <PublicNavbar />
    <main className="public-content">
      <Outlet />
    </main>
  </div>
);

const PublicHome = () => (
  <div className="public-home">
    <PublicNavbar />
    <main className="public-content public-landing-content">
      <Dashboard publicMode />
    </main>
  </div>
);

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
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/blocked-users" element={<BlockedUsersPage />} />
          <Route path="/admin/moderation" element={<AdminModerationPage />} />
          <Route path="/post/:reviewId" element={<PostPage />} />
          
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

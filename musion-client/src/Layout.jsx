import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { IoChatbubbleOutline, IoEllipsisVertical, IoNotificationsOutline } from 'react-icons/io5';
import api from './api';
import ReviewModal from './ReviewModal';
import { DEFAULT_AVATAR, getDisplayName } from './utils';
import './Layout.css';
import Logo from './assets/Musion0.png';

function Layout() {
  const navigate = useNavigate();

  // --- ESTADO PARA ATUALIZAR AS PÁGINAS (O SINAL) ---
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Estados da Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ albums: [], users: [] }); 
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  const searchContainerRef = useRef(null); 
  const profileMenuRef = useRef(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchResults({ albums: [], users: [] });
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      try {
        setCurrentUser(JSON.parse(cachedUser));
      } catch {}
    }

    const loadMe = async () => {
      try {
        const response = await api.get('/users/me');
        setCurrentUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch {}
    };

    loadMe();
  }, []);

  // --- BUSCA ---
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults({ albums: [], users: [] });
      return;
    }

    setIsSearchLoading(true);

    const searchTimer = setTimeout(async () => {
      try {
        const [spotifyRes, usersRes] = await Promise.allSettled([
          api.get('/spotify/search', { params: { q: searchQuery } }),
          api.get('/users/search', { params: { q: searchQuery } })
        ]);

        const albums = spotifyRes.status === 'fulfilled' && Array.isArray(spotifyRes.value.data) 
          ? spotifyRes.value.data 
          : [];

        const users = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value.data) 
          ? usersRes.value.data 
          : [];

        setSearchResults({ albums, users });

      } catch (err) {
        console.error("Erro na busca:", err);
      } finally {
        setIsSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);


  // Ações de Clique
  const handleUserClick = (userId) => {
    setSearchQuery('');
    setSearchResults({ albums: [], users: [] });
    navigate(`/profile/${userId}`);
  };

const handleSearchAlbumClick = (album) => {
  const albumTarget = album.spotifyId || album.albumId || album.id;
  if (!albumTarget) return;

  setSearchResults({ albums: [], users: [] });
  setSearchQuery('');
  // Navega para a página do álbum
  navigate(`/album/${albumTarget}`);
};

  const handleLogout = () => {
    localStorage.removeItem('musion_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // --- FUNÇÃO QUE RODA QUANDO UMA REVIEW É SALVA PELO MENU (+) ---
  const handleGlobalReviewSaved = () => {
    console.log("Review salva! Enviando sinal de atualização...");
    setRefreshTrigger(prev => prev + 1); // Muda o número, forçando as páginas a recarregar
  };

  const hasResults = searchResults.albums.length > 0 || searchResults.users.length > 0;

  return (
    <div className="layout-container">
      <nav className="navbar">
        <Link to="/" className="navbar-logo"><img src={Logo} alt="Musion Logo" className="logo" /></Link>
        
        <div className="search-container" ref={searchContainerRef}>
          <input 
            type="text" 
            className="search-input"
            placeholder="Buscar álbuns ou usuários..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="search-button">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
             </svg>
          </button>

          {(hasResults || isSearchLoading) && searchQuery.length >= 2 && (
            <div className="search-results-popover">
              {isSearchLoading && <div className="search-loading">Buscando...</div>}

              {searchResults.users.length > 0 && (
                <div className="results-section">
                  <h4 className="results-category-title">USUÁRIOS</h4>
                  {searchResults.users.map(user => (
                    <div key={user.id} className="result-item user-item" onClick={() => handleUserClick(user.id)}>
                      <img src={user.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png'} alt="Avatar" className="result-avatar" />
                      <div className="result-info">
                        <span className="result-name">{user.displayName || user.username}</span>
                        <span className="result-subtext">@{user.username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.albums.length > 0 && (
                <div className="results-section">
                  <h4 className="results-category-title">ÁLBUNS</h4>
                  {searchResults.albums.map(album => (
                    <div key={album.id} className="result-item album-item" onClick={() => handleSearchAlbumClick(album)}>
                       <img src={album.images[2]?.url || album.images[0]?.url} alt={album.name} className="result-cover" />
                       <div className="result-info">
                         <span className="result-name">{album.name}</span>
                         <span className="result-subtext">{album.artists[0].name}</span>
                       </div>
                    </div>
                  ))}
                </div>
              )}

              {!isSearchLoading && !hasResults && (
                <div className="no-results">Nada encontrado.</div>
              )}
            </div>
          )}
        </div> 

        <div className="navbar-links">
          <Link to="/" className="nav-link">Início</Link>
          <Link to="/feed" className="nav-link">Feed</Link>
          <Link to="/chat" className="nav-icon-link" title="Chat">
            <IoChatbubbleOutline />
          </Link>
          <Link to="/notifications" className="nav-icon-link" title="Notificações">
            <IoNotificationsOutline />
          </Link>
          

          <button className="new-review-btn" onClick={() => setIsReviewModalOpen(true)} title="Nova Review">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        
          <Link to="/profile" className="nav-profile-link" title="Perfil">
            <img
              className="nav-profile-avatar"
              src={currentUser?.avatarUrl || currentUser?.avatar || DEFAULT_AVATAR}
              alt="Perfil"
            />
            <span className="nav-profile-text">
              <strong>{getDisplayName(currentUser || {})}</strong>
              <small>@{currentUser?.username || 'usuário'}</small>
            </span>
          </Link>

          <div className="nav-profile-menu" ref={profileMenuRef}>
            <button
              className="nav-profile-menu-button"
              onClick={() => setProfileMenuOpen((value) => !value)}
              title="Opções"
            >
              <IoEllipsisVertical />
            </button>

            {profileMenuOpen && (
              <div className="nav-profile-dropdown">
                {currentUser?.role === 'ADMIN' && (
                  <Link to="/admin/moderation" onClick={() => setProfileMenuOpen(false)}>Moderação</Link>
                )}
                <Link to="/settings" onClick={() => setProfileMenuOpen(false)}>Configurações</Link>
                <button onClick={handleLogout}>Sair</button>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      <div className="content-wrapper">
         {/* --- AQUI ESTÁ O SEGREDO: Passamos o trigger para as páginas filhas --- */}
         <Outlet context={{ refreshTrigger }} />
      </div>

      {isReviewModalOpen && (
        <ReviewModal 
            onClose={() => setIsReviewModalOpen(false)} 
            // --- CONECTAMOS O MODAL AO GATILHO ---
            onReviewSaved={handleGlobalReviewSaved}
        />
      )}
    </div>
  );
}

export default Layout;


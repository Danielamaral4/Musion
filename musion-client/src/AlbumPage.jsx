import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaSpotify } from 'react-icons/fa'; // Ícone do Spotify
import api from './api';
import './AlbumPage.css';

function AlbumPage() {
  const params = useParams();
  const navigate = useNavigate();
  const rawId = params.id || params.albumId;

  if (rawId === 'login') return null;
  const albumId = rawId;

  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openReviewMenuId, setOpenReviewMenuId] = useState(null);

  // --- Helpers ---
  const formatTime = (d) => {
    if (!d) return '';
    try {
      const dt = new Date(d);
      const now = new Date();
      const diff = Math.floor((now - dt) / 1000);
      if (diff < 60) return 'Agora mesmo';
      if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `Há ${Math.floor(diff / 3600)} h`;
      return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch (e) { return ''; }
  };

  const msToMinutes = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const closeMenu = () => setOpenReviewMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    if (!albumId) { setError("ID não fornecido."); setLoading(false); return; }

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        try {
          const meRes = await api.get('/users/me');
          setCurrentUser(meRes.data);
        } catch (e) {}

        const albumRes = await api.get(`/spotify/album/${albumId}`);
        setAlbum(albumRes.data);
        if (albumRes.data.tracks?.items) setTracks(albumRes.data.tracks.items);

        const reviewsRes = await api.get(`/reviews/album/${albumId}`);
        let reviewsList = [];
        if (Array.isArray(reviewsRes.data)) {
          reviewsList = reviewsRes.data;
        } else if (reviewsRes.data && Array.isArray(reviewsRes.data.reviews)) {
          reviewsList = reviewsRes.data.reviews;
          setAverageRating(reviewsRes.data.averageRating);
        }
        setReviews(reviewsList);
      } catch (err) {
        console.error(err);
        if (err.response && (err.response.status === 401 || err.response.status === 403)) navigate('/login');
        else setError('Álbum não encontrado.');
      } finally { setLoading(false); }
    };
    loadData();
  }, [albumId, navigate]);

  const handleLikeToggle = async (reviewId, currentIsLiked, currentCount) => {
    if (!currentUser) return;
    setReviews(prev => prev.map(r => {
      const rId = r.id || r.reviewId;
      if (rId === reviewId) {
        return { ...r, isLiked: !currentIsLiked, likeCount: currentIsLiked ? currentCount - 1 : currentCount + 1 };
      }
      return r;
    }));
    try { await api.post(`/dashboard/review/${reviewId}/like`); } catch (e) {}
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Excluir review?")) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => (r.id || r.reviewId) !== reviewId));
    } catch (e) { alert("Erro ao excluir."); }
  };

  const handleEditReview = (review) => { console.log("Editar:", review); };

  const getRatingColor = (r) => {
    const n = parseFloat(r);
    if (n <= 3.9) return 'rating-bg-red';
    if (n <= 6.0) return 'rating-bg-yellow';
    return 'rating-bg-green';
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!album) return <div className="loading">Álbum não encontrado.</div>;

  const totalDurationMs = tracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0);

  return (
    <div className="album-page-container">

      {/* HEADER DO ÁLBUM */}
      <div className="album-header-wrapper">
        <img src={album.images?.[0]?.url} alt={album.name} className="album-cover-img" />

        <div className="album-header-info">
          <h1 className="album-title">{album.name}</h1>
          <p className="album-artists">{album.artists?.map(a => a.name).join(', ')}</p>

          <div className="album-meta-info">
            <span>{album.release_date}</span>
            <span>{album.total_tracks} Músicas</span>
            <span>{msToMinutes(totalDurationMs)}</span>
            {album.external_urls?.spotify && (
              <a href={album.external_urls.spotify} target="_blank" rel="noopener noreferrer" className="spotify-icon">
                <FaSpotify />
              </a>
            )}
          </div>
        </div>

        {averageRating && (
          <div className={`album-average-rating-square ${getRatingColor(averageRating)}`}>
            {averageRating % 1 === 0 ? averageRating.toFixed(0) : averageRating.toFixed(1)}
          </div>
        )}
      </div>

      {/* TRACKLIST */}
      <div className="tracklist-section">
        <h3>Faixas</h3>
        <ul className="tracklist">
          {tracks.map((track, idx) => (
            <li key={track.id} className="track-item">
              <span>{idx + 1}. {track.name}</span>
              <span className="track-duration">{msToMinutes(track.duration_ms)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* REVIEWS */}
      <div className="album-reviews-section">
        <h3>Reviews Populares</h3>
        {reviews.length === 0 && <p className="no-results">Seja o primeiro a avaliar este álbum!</p>}

        {reviews.map((review) => {
          const reviewId = review.id || review.reviewId;
          const userObj = review.user || {};
          const userAvatar = userObj.avatarUrl || userObj.avatar || 'https://i.stack.imgur.com/l60Hf.png';
          const displayName = userObj.displayName || userObj.username || 'Usuário';
          const username = userObj.username || 'user';
          const userId = userObj.id || review.userId;
          const isOwner = currentUser && (currentUser.id === userId);

          return (
            <div key={reviewId} className="review-card">
              <div className="review-author-header">
                <div className="review-author-left">
                  <Link to={`/profile/${userId}`}>
                    <img src={userAvatar} alt="Avatar" className="review-author-avatar" />
                  </Link>
                  <div className="review-author-info">
                    <span className="review-author-name">{displayName}</span>
                    <span className="review-author-username">@{username}</span>
                  </div>
                </div>

                <div className="feed-header-right">
                  <span className="feed-timestamp">{formatTime(review.createdAt)}</span>
                  {isOwner && (
                    <div className="menu-wrapper">
                      <button className="options-button" onClick={(e) => { e.stopPropagation(); setOpenReviewMenuId(openReviewMenuId === reviewId ? null : reviewId); }}>
                        &#x22EE;
                      </button>
                      {openReviewMenuId === reviewId && (
                        <div className="review-dropdown-menu">
                          <button onClick={() => handleEditReview(review)}>Editar</button>
                          <button onClick={() => handleDeleteReview(reviewId)} className="delete-btn">Excluir</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="review-card-body">
                <div className="review-details">
                  <p className="review-text">{review.text}</p>
                </div>
                <div className={`review-rating-square ${getRatingColor(review.rating)}`}>
                  {review.rating % 1 === 0 ? review.rating.toFixed(0) : review.rating.toFixed(1)}
                </div>
              </div>

              <div className="like-container">
                <button className={`like-button ${review.isLiked ? 'liked' : ''}`} onClick={() => handleLikeToggle(reviewId, review.isLiked, review.likeCount)}>
                  <svg className="like-icon" viewBox="0 0 24 24" fill={review.isLiked ? '#E91429' : 'none'} stroke={review.isLiked ? '#E91429' : '#b3b3b3'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
                <span className="like-count">{review.likeCount > 0 ? review.likeCount : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AlbumPage;

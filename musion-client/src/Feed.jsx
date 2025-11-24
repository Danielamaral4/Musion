import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import './ProfilePage.css';
import ReviewModal from './ReviewModal';

function Feed() {
  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Controle
  const [likesState, setLikesState] = useState({}); 
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState(null);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const res = await api.get('/dashboard/feed');
        setFeedData(res.data);
        
        // Inicializa Likes
        const initialLikes = {};
        res.data.forEach(item => {
          initialLikes[item.reviewId] = {
            count: item.likeCount || 0,
            isLiked: item.isLiked || false
          };
        });
        setLikesState(initialLikes);
      } catch (err) {
        console.error("Erro ao carregar feed:", err);
      } finally {
        setLoading(false);
      }
    };
    loadFeed();
  }, []);

  // --- AÇÕES ---
  const toggleLike = async (reviewId) => {
    setLikesState(prev => {
      const current = prev[reviewId] || { count: 0, isLiked: false };
      const newIsLiked = !current.isLiked;
      const newCount = newIsLiked ? current.count + 1 : current.count - 1;
      return { ...prev, [reviewId]: { isLiked: newIsLiked, count: newCount } };
    });
    try { await api.post(`/dashboard/review/${reviewId}/like`); } catch (e) {}
  };

  const toggleMenu = (e, reviewId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === reviewId ? null : reviewId);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setFeedData(prev => prev.filter(item => item.reviewId !== reviewId));
    } catch (error) {
      alert("Erro ao excluir.");
    }
  };

  const handleEditReview = (item) => {
    setReviewToEdit({
        id: item.reviewId,
        text: item.text,
        rating: item.rating,
        albumId: item.albumId,
        albumName: item.albumName,
        albumCover: item.albumCover,
        albumArtist: item.albumArtist
    });
    setIsReviewModalOpen(true);
    setOpenMenuId(null);
  };

  const handleReviewSaved = () => {
    window.location.reload();
  };

  // --- HELPERS ---
  const getRatingClass = (r) => { const n=parseFloat(r); return n<=3.9?'rating-bg-red':n<=6.0?'rating-bg-yellow':'rating-bg-green'; };
  const formatRating = (r) => { const n=parseFloat(r); return isNaN(n)?'-':(n%1===0?n.toFixed(0):n.toFixed(1)); };
  const formatTime = (d) => {
    if(!d) return ''; const dt=new Date(d),nw=new Date(),diff=Math.floor((nw-dt)/1000);
    if(diff<60)return 'Agora mesmo'; if(diff<3600)return `Há ${Math.floor(diff/60)} min`;
    if(diff<86400)return `Há ${Math.floor(diff/3600)} h`;
    return dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' às '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  };

  // Fecha menu ao clicar fora
  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (loading) return <div className="feed-loading">Carregando...</div>;

  return (
    <div className="feed-main-wrapper">
      <div className="profile-reviews-list">
        <h3>Atividades</h3>
        
        {feedData.length === 0 && <p>Nenhuma atividade recente.</p>}

        {feedData.map((item) => {
          const likeInfo = likesState[item.reviewId] || { count: 0, isLiked: false };

          return (
            <div key={item.reviewId} className="review-card">
              
              <div className="review-author-header">
                <div className="review-author-left">
                  <Link to={`/profile/${item.userId}`} className="feed-clickable-link">
                      <img src={item.user.avatar || 'https://i.stack.imgur.com/l60Hf.png'} alt="Avatar" className="review-author-avatar" />
                  </Link>
                  <div className="review-author-info">
                    <Link to={`/profile/${item.userId}`} className="feed-clickable-link no-decoration">
                       <span className="review-author-name">{item.user.displayName || item.user.username}</span>
                    </Link>
                    <Link to={`/profile/${item.userId}`} className="feed-clickable-link no-decoration">
                      <span className="review-author-username">@{item.user.username}</span>
                    </Link>
                  </div>
                </div>
                
                {/* DATA + 3 PONTINHOS */}
                <div className="feed-header-right">
                  <span className="feed-timestamp">{formatTime(item.createdAt)}</span>

                  {/* AQUI ESTÁ A CORREÇÃO: 
                      Usamos item.isMine que vem direto do backend (certeza absoluta) 
                  */}
                  {item.isMine && (
                    <div className="menu-wrapper" onClick={(e) => e.stopPropagation()}>
                        <button className="options-button" onClick={(e) => toggleMenu(e, item.reviewId)}>
                            &#x22EE;
                        </button>
                        
                        {openMenuId === item.reviewId && (
                            <div className="review-dropdown-menu">
                                <button onClick={() => handleEditReview(item)}>Editar</button>
                                <button onClick={() => handleDeleteReview(item.reviewId)} className="delete-btn">Excluir</button>
                            </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* BODY */}
              <div className="review-card-body">
                <img src={item.albumCover} alt={item.albumName} className="review-album-cover" />
                <div className="review-details">
                  <div className="review-header">
                    <span className="review-album-name">{item.albumName}</span>
                    <div className={`review-rating-square ${getRatingClass(item.rating)}`}>
                      {formatRating(item.rating)}
                    </div>
                  </div>
                  <p className="review-text">{item.text}</p>
                </div>
              </div>

              {/* LIKE */}
              <div className="like-container">
                <button className={`like-button ${likeInfo.isLiked ? 'liked' : ''}`} onClick={() => toggleLike(item.reviewId)}>
                  <svg className="like-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={likeInfo.isLiked ? "#E91429" : "none"} stroke={likeInfo.isLiked ? "#E91429" : "#b3b3b3"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
                <span className="like-count">{likeInfo.count > 0 ? likeInfo.count : ''}</span>
              </div>

            </div>
          );
        })}
      </div>

      {isReviewModalOpen && (
        <ReviewModal 
          onClose={() => setIsReviewModalOpen(false)}
          onReviewSaved={handleReviewSaved}
          reviewToEdit={reviewToEdit}
        />
      )}
    </div>
  );
}

export default Feed;
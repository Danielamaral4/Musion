import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { IoChatbubbleOutline, IoEllipsisVertical, IoShareSocialOutline } from 'react-icons/io5';
import api from './api';
import './ProfilePage.css';
import ReviewModal from './ReviewModal';
import { blockUser, reportTarget } from './moderation';
import { shareReview } from './shareReview';

function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { refreshTrigger } = useOutletContext() || {};

  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Controle de Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ displayName: '', username: '', bio: '' });

  // Controle de Reviews
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState(null);
  const [openReviewMenuId, setOpenReviewMenuId] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Upload de Foto / Visualizar imagem
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Modal de imagem do perfil
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageToShow, setImageToShow] = useState('');
  const [peopleModal, setPeopleModal] = useState({
    open: false,
    title: '',
    users: [],
    loading: false,
  });
  const isLoggedIn = Boolean(localStorage.getItem('musion_token'));

  const requireLogin = () => {
    if (isLoggedIn) return true;
    navigate('/login');
    return false;
  };

  // --- CARREGAR DADOS ---
  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      let me = null;
      let hasValidSession = isLoggedIn;

      if (isLoggedIn) {
        try {
          const meResponse = await api.get('/users/me');
          me = meResponse.data;
          setCurrentUser(me);
        } catch {
          hasValidSession = false;
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }

      let profileData;
      let reviewsData;

      if (id && (!me || Number(id) !== me.id)) {
        const otherProfileRes = await api.get(hasValidSession ? `/users/profile/${id}` : `/users/public/profile/${id}`);
        profileData = otherProfileRes.data;
        reviewsData = otherProfileRes.data.reviews || [];
      } else {
        if (!me) {
          navigate('/login');
          return;
        }

        profileData = me;
        const myReviewsRes = await api.get('/reviews/me');
        reviewsData = myReviewsRes.data;
      }

      setProfile(profileData);
      setReviews(reviewsData);
    } catch (err) {
      console.error('Erro:', err);
      setError('Falha ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, refreshTrigger, isLoggedIn]);

  // --- FUNÇÕES DE AÇÃO ---

  const handleFollowToggle = async () => {
    if (!requireLogin()) return;
    if (!profile) return;
    try {
      if (profile.isFollowing) {
        await api.delete(`/users/${profile.id}/follow`);
        setProfile(prev => ({
          ...prev,
          isFollowing: false,
          _count: { ...prev._count, followers: (prev._count.followers || 1) - 1 }
        }));
      } else {
        await api.post(`/users/${profile.id}/follow`);
        setProfile(prev => ({
          ...prev,
          isFollowing: true,
          _count: { ...prev._count, followers: (prev._count.followers || 0) + 1 }
        }));
      }
    } catch (error) {
      console.error("Erro ao seguir/deixar de seguir", error);
    }
  };

  const openPeopleModal = async (type) => {
    if (!requireLogin()) return;
    if (!profile?.id) return;

    const title = type === 'followers' ? 'Seguidores' : 'Seguindo';
    setPeopleModal({ open: true, title, users: [], loading: true });

    try {
      const response = await api.get(`/users/${profile.id}/${type}`);
      setPeopleModal({ open: true, title, users: response.data || [], loading: false });
    } catch {
      setPeopleModal({ open: true, title, users: [], loading: false });
    }
  };

  const handleBlockProfile = async () => {
    if (!requireLogin()) return;
    try {
      const label = profile?.username ? `@${profile.username}` : 'usuário';
      const blocked = await blockUser(profile.id, label);
      if (blocked) navigate('/feed');
    } catch {
      alert('Não foi possível bloquear este usuário.');
    }
  };

  const openEditModal = () => {
    if (!requireLogin()) return;
    if (!profile) return;
    setEditFormData({
      displayName: profile.displayName || profile.username,
      username: profile.username,
      bio: profile.bio || ''
    });
    setUploadError('');
    setIsEditModalOpen(true);
  };

  const handleFormChange = (e) => setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.patch('/users/me', editFormData);
      setProfile(response.data);
      setIsEditModalOpen(false);
    } catch (err) {
      setUploadError('Erro ao salvar.');
    }
  };

  const handleUploadClick = () => {
    setUploadError('');
    fileInputRef.current.click();
  };

const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 1. Cria o formulário para envio
    const formData = new FormData();
    formData.append('file', file); // O nome 'file' bate com FileInterceptor('file') do backend

    setIsUploading(true);
    setUploadError('');

    try {
      // --- AQUI ESTÁ A CORREÇÃO: api.patch ---
      // Seu backend está esperando @Patch('me/avatar')
      const response = await api.patch('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 2. Atualiza o estado visual com a nova URL
      // O seu service provavelmente retorna o usuário atualizado, então acessamos .avatarUrl
      // Se o seu service retornar apenas a URL direta, ajuste para response.data
      const newAvatarUrl = response.data.avatarUrl || response.data.secure_url || response.data;
      
      setProfile((prev) => ({
        ...prev,
        avatarUrl: newAvatarUrl
      }));

    } catch (err) {
      console.error('Erro no upload:', err);
      setUploadError('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setIsUploading(false);
      // Limpa o input para permitir enviar a mesma foto se der erro
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProfileImageClick = () => {
    if (profile.avatarUrl) {
      setImageToShow(profile.avatarUrl);
      setIsImageModalOpen(true);
    }
  };

  const getRatingStyle = (rating) => {
    if (rating <= 3.9) return { backgroundColor: '#F20505', color: '#FFF' };
    if (rating <= 6.0) return { backgroundColor: '#F2CB05', color: '#FFF' };
    return { backgroundColor: '#37a603', color: '#FFF' };
  };

  const handleEditReview = (review) => { setReviewToEdit(review); setIsReviewModalOpen(true); setOpenReviewMenuId(null); };
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Excluir review?')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews(reviews.filter(r => (r.id || r.reviewId) !== reviewId));
      setOpenReviewMenuId(null);
    } catch (error) { alert('Erro ao excluir.'); }
  };

  const handleReviewSaved = () => loadData();

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!profile) return null;

  const isOwnProfile = currentUser && currentUser.id === profile.id;

  const formatTime = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const diff = Math.floor((now - dt) / 1000);

    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)} h`;

    return (
      dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
      ' às ' +
      dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="profile-container">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />

      <div className="profile-header">
        <div className="profile-header-content">
          <div className="profile-header-top-row">
            <img
              src={profile.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png'}
              alt="Avatar"
              className="profile-avatar"
              onClick={handleProfileImageClick}
            />
            <div className="profile-stats">
              <div className="stat-item"><span className="stat-number">{reviews.length}</span><span className="stat-label">Reviews</span></div>
              <button className="stat-item stat-button" onClick={() => openPeopleModal('followers')}>
                <span className="stat-number">{profile._count?.followers || 0}</span>
                <span className="stat-label">Seguidores</span>
              </button>
              <button className="stat-item stat-button" onClick={() => openPeopleModal('following')}>
                <span className="stat-number">{profile._count?.following || 0}</span>
                <span className="stat-label">Seguindo</span>
              </button>
            </div>
          </div>
          <div className="profile-name-line">
            <div className="profile-name-group">
              <span className="profile-display-name">{profile.displayName || profile.username}</span>
              <span className="profile-username-tag">@{profile.username}</span>
            </div>

            <div className="profile-actions">
              {isOwnProfile ? (
                <>
                  <button className="edit-profile-button" onClick={openEditModal}>Editar perfil</button>
                </>
              ) : (
                <>
                  <button
                    className={`follow-button ${profile.isFollowing ? 'following' : ''}`}
                    onClick={handleFollowToggle}
                  >
                    {profile.isFollowing ? 'Seguindo' : 'Seguir'}
                  </button>
                  <button
                    className="profile-secondary-button"
                    onClick={() => {
                      if (!requireLogin()) return;
                      navigate('/chat', { state: { user: profile } });
                    }}
                  >
                    Chat
                  </button>
                  <div className="menu-wrapper" onClick={(event) => event.stopPropagation()}>
                    <button
                      className="options-button"
                      onClick={() => setProfileMenuOpen((value) => !value)}
                      title="Opções"
                    >
                      <IoEllipsisVertical />
                    </button>
                    {profileMenuOpen && (
                      <div className="review-dropdown-menu">
                        <button
                          onClick={() => {
                            if (!requireLogin()) return;
                            reportTarget('USER', profile.id, 'usuário');
                          }}
                        >
                          Denunciar
                        </button>
                        <button className="delete-btn" onClick={handleBlockProfile}>
                          Bloquear usuário
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="profile-bio">{profile.bio || 'Sem bio.'}</p>
        </div>
      </div>

      {/* Lista de Reviews */}
      <div className="feed-main-wrapper">
        <h3>Reviews</h3>
        {reviews.length === 0 && <p>Nenhuma review encontrada.</p>}
        {reviews.map((review) => {
          const reviewId = review.id || review.reviewId;
          const reviewWithUser = {
            ...review,
            reviewId,
            user: {
              displayName: profile.displayName,
              username: profile.username,
              avatarUrl: profile.avatarUrl,
            },
          };

          return (
          <div key={reviewId} className="review-card">
            <div className="review-author-header">
              <div className="review-author-left">
                <img
                  src={profile.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png'}
                  alt="Avatar"
                  className="review-author-avatar"
                />
                <div className="review-author-info">
                  <span className="review-author-name">{profile.displayName || profile.username}</span>
                  <span className="review-author-username">@{profile.username}</span>
                </div>
              </div>
              <div className="feed-header-right">
                <span className="feed-timestamp">{formatTime(review.createdAt)}</span>
                <div className="menu-wrapper" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="options-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenReviewMenuId(openReviewMenuId === reviewId ? null : reviewId);
                    }}
                    title="Opções"
                  >
                    <IoEllipsisVertical />
                  </button>
                  {openReviewMenuId === reviewId && (
                    <div className="review-dropdown-menu">
                      {isOwnProfile ? (
                        <>
                          <button onClick={() => handleEditReview(review)}>Editar</button>
                          <button onClick={() => handleDeleteReview(reviewId)} className="delete-btn">Excluir</button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            if (!requireLogin()) return;
                            reportTarget('REVIEW', reviewId, 'review');
                          }}
                        >
                          Denunciar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="review-card-body clickable-review-body" onClick={() => navigate(`/post/${reviewId}`)}>
              <img src={review.albumCover} alt={review.albumName} className="review-album-cover" />
              <div className="review-details">
                <div className="review-header">
                  <span className="review-album-name">{review.albumName}</span>
                  <div
                    className={`review-rating-square ${
                      review.rating <= 3.9 ? 'rating-bg-red' :
                      review.rating <= 6.0 ? 'rating-bg-yellow' : 'rating-bg-green'
                    }`}
                  >
                    {(review.rating % 1 === 0 ? review.rating.toFixed(0) : review.rating.toFixed(1))}
                  </div>
                </div>
                <p className="review-text">{review.text}</p>
              </div>
            </div>

            <div className="like-container">
              <button
                className={`like-button ${review.isLiked ? 'liked' : ''}`}
                onClick={async () => {
                  if (!requireLogin()) return;
                  setReviews(prev =>
                    prev.map(r =>
                      (r.id || r.reviewId) === reviewId
                        ? { ...r, isLiked: !r.isLiked, likeCount: r.isLiked ? r.likeCount - 1 : r.likeCount + 1 }
                        : r
                    )
                  );
                  try { await api.post(`/dashboard/review/${reviewId}/like`); } catch (e) {}
                }}
              >
                <svg
                  className="like-icon"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill={review.isLiked ? "#E91429" : "none"}
                  stroke={review.isLiked ? "#E91429" : "#b3b3b3"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
              <span className="like-count">{review.likeCount > 0 ? review.likeCount : ''}</span>
            </div>

            <div className="review-action-row">
              <button className="review-icon-action" onClick={() => navigate(`/post/${reviewId}`)} title="Comentários">
                <IoChatbubbleOutline />
                <span>{review.commentCount || 0}</span>
              </button>
              <button className="review-icon-action" onClick={() => shareReview(reviewWithUser)} title="Compartilhar">
                <IoShareSocialOutline />
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Modal de edição de perfil */}
      {isEditModalOpen && isOwnProfile && (
        <div className="edit-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="edit-modal-close" onClick={() => setIsEditModalOpen(false)}>&times;</button>
            <h3>Editar perfil</h3>
            <div className="avatar-upload-section">
              <img
                src={profile.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png'}
                alt="Avatar"
                className="profile-avatar-large"
                onClick={handleUploadClick}
              />
              <button className="avatar-modal-upload-btn" onClick={handleUploadClick} disabled={isUploading}>
                {isUploading ? '...' : 'Alterar foto'}
              </button>
            </div>
            <form className="edit-text-form" onSubmit={handleFormSubmit}>
              <div className="form-group"><label>Nome</label><input name="displayName" value={editFormData.displayName} onChange={handleFormChange} /></div>
              <div className="form-group"><label>Username</label><input name="username" value={editFormData.username} onChange={handleFormChange} /></div>
              <div className="form-group"><label>Bio</label><textarea name="bio" rows="3" value={editFormData.bio} onChange={handleFormChange} /></div>
              {uploadError && <p className="error-message">{uploadError}</p>}
              <button type="submit" className="save-changes-button">Salvar</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de review */}
      {isReviewModalOpen && (
        <ReviewModal
          onClose={() => setIsReviewModalOpen(false)}
          onReviewSaved={handleReviewSaved}
          reviewToEdit={reviewToEdit}
        />
      )}

      {peopleModal.open && (
        <div
          className="edit-modal-overlay"
          onClick={() => setPeopleModal({ open: false, title: '', users: [], loading: false })}
        >
          <div className="people-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="edit-modal-close"
              onClick={() => setPeopleModal({ open: false, title: '', users: [], loading: false })}
            >
              &times;
            </button>
            <h3>{peopleModal.title}</h3>
            {peopleModal.loading && <p className="people-empty">Carregando...</p>}
            {!peopleModal.loading && peopleModal.users.length === 0 && (
              <p className="people-empty">Nada por aqui ainda.</p>
            )}
            <div className="people-list">
              {peopleModal.users.map((user) => (
                <button
                  key={user.id}
                  className="people-row"
                  onClick={() => {
                    setPeopleModal({ open: false, title: '', users: [], loading: false });
                    navigate(`/profile/${user.id}`);
                  }}
                >
                  <img src={user.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png'} alt="" />
                  <span>
                    <strong>{user.displayName || user.username}</strong>
                    <small>@{user.username}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de imagem maximizada */}
      {isImageModalOpen && (
        <div className="image-modal-overlay" onClick={() => setIsImageModalOpen(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={imageToShow} alt="Imagem do perfil" className="image-modal-img" />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IoEllipsisVertical, IoHeart, IoHeartOutline, IoShareSocialOutline } from 'react-icons/io5';
import { FiSend } from 'react-icons/fi';
import api from './api';
import { reportTarget } from './moderation';
import { shareReview } from './shareReview';
import {
  DEFAULT_AVATAR,
  formatRating,
  formatTime,
  getDisplayName,
  getRatingClass,
  normalizeReview,
} from './utils';
import './PostPage.css';

function PostPage() {
  const { reviewId } = useParams();
  const [review, setReview] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewMenuOpen, setReviewMenuOpen] = useState(false);

  const load = async () => {
    setLoading(true);

    try {
      const [reviewRes, commentsRes] = await Promise.all([
        api.get(`/reviews/${reviewId}`),
        api.get(`/reviews/${reviewId}/comments`),
      ]);

      setReview(normalizeReview(reviewRes.data));
      setComments(commentsRes.data || []);
    } catch {
      setReview(null);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [reviewId]);

  const toggleLike = async () => {
    setReview((prev) => ({
      ...prev,
      isLiked: !prev.isLiked,
      likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
    }));

    try {
      await api.post(`/dashboard/review/${review.reviewId}/like`);
    } catch {}
  };

  const sendComment = async () => {
    const text = commentText.trim();
    if (!text || submitting) return;

    setSubmitting(true);

    try {
      const response = await api.post(`/reviews/${review.reviewId}/comments`, { text });
      setComments((prev) => [response.data, ...prev]);
      setCommentText('');
      setReview((prev) => ({ ...prev, commentCount: (prev.commentCount || 0) + 1 }));
    } catch {
      window.alert('Não foi possível comentar.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Excluir comentário?')) return;

    try {
      await api.delete(`/reviews/${review.reviewId}/comments/${commentId}`);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch {
      window.alert('Não foi possível excluir.');
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (!review) return <div className="error-message">Review não encontrada.</div>;

  const albumTarget = review.spotifyId || review.albumId || review.album?.spotifyId || review.album?.id;
  const albumPath = albumTarget ? `/album/${albumTarget}` : '#';

  return (
    <div className="post-page">
      <article className="post-card">
        <header className="review-author-header">
          <div className="review-author-left">
            <Link to={`/profile/${review.userId}`}>
              <img
                src={review.user?.avatarUrl || DEFAULT_AVATAR}
                alt=""
                className="review-author-avatar"
              />
            </Link>

            <div className="review-author-info">
              <strong>{getDisplayName(review.user)}</strong>
              <span>@{review.user?.username}</span>
            </div>
          </div>

          <div className="feed-header-right">
            <span className="feed-timestamp">{formatTime(review.createdAt)}</span>

            <div className="menu-wrapper" onClick={(event) => event.stopPropagation()}>
              <button
                className="options-button"
                onClick={() => setReviewMenuOpen((value) => !value)}
                title="Opções"
              >
                <IoEllipsisVertical />
              </button>

              {reviewMenuOpen && (
                <div className="review-dropdown-menu">
                  <button onClick={() => reportTarget('REVIEW', review.reviewId, 'review')}>
                    Denunciar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="post-body">
          <Link to={albumPath} className="post-album-cover-link">
            <img src={review.albumCover} alt={review.albumName} />
          </Link>

          <div>
            <div className="post-title-row">
              <Link to={albumPath} className="post-album-title-link">
                <h1>{review.albumName}</h1>
                <p>{review.albumArtist}</p>
              </Link>

              <div className={`review-rating-square ${getRatingClass(review.rating)}`}>
                {formatRating(review.rating)}
              </div>
            </div>

            <p className="post-review-text">{review.text}</p>
          </div>
        </div>

        <footer className="post-actions">
          <button className="review-icon-action" onClick={toggleLike} title="Curtir">
            {review.isLiked ? <IoHeart /> : <IoHeartOutline />}
            <span>{review.likeCount || 0}</span>
          </button>

          <button className="review-icon-action" onClick={() => shareReview(review)} title="Compartilhar">
            <IoShareSocialOutline />
          </button>
        </footer>
      </article>

      <section className="comments-panel">
        <h2>Comentários ({comments.length})</h2>

        <div className="comment-compose">
          <textarea
            placeholder="Digite aqui"
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendComment();
              }
            }}
          />

          <button onClick={sendComment} disabled={!commentText.trim() || submitting} title="Enviar">
            <FiSend />
          </button>
        </div>

        {comments.length === 0 && <p className="comments-empty">Seja o primeiro a comentar.</p>}

        {comments.map((comment) => (
          <div className="comment-row" key={comment.id}>
            <Link to={`/profile/${comment.user?.id || comment.userId}`}>
              <img src={comment.user?.avatarUrl || DEFAULT_AVATAR} alt="" />
            </Link>

            <div>
              <header>
                <strong>{getDisplayName(comment.user)}</strong>
                <span>@{comment.user?.username}</span>
                <small>{formatTime(comment.createdAt)}</small>
              </header>

              <p>{comment.text}</p>

              <footer>
                <button onClick={() => reportTarget('COMMENT', comment.id, 'comentário')}>
                  Denunciar
                </button>

                {comment.isMine && (
                  <button onClick={() => deleteComment(comment.id)}>Excluir</button>
                )}
              </footer>
            </div>
          </div>
        ))}
      </section>

    </div>
  );
}

export default PostPage;

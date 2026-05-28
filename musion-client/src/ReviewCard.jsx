// ReviewCard.jsx
import React from 'react';

export default function ReviewCard({ review, author, isOwnProfile, onEdit, onDelete, onLikeToggle }) {
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
    <div className="review-card">
      <div className="review-author-header">
        <div className="review-author-left">
          <img src={author.avatarUrl || 'https://i.stack.imgur.com/l60Hf.png'} alt="Avatar" className="review-author-avatar" />
          <div className="review-author-info">
            <span className="review-author-name">{author.displayName || author.username}</span>
            <span className="review-author-username">@{author.username}</span>
          </div>
        </div>
        <div className="feed-header-right">
          <span className="feed-timestamp">{formatTime(review.createdAt)}</span>
          {isOwnProfile && (
            <div className="menu-wrapper">
              <button
                className="options-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(review);
                }}
              >
                &#x22EE;
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="review-card-body">
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
              {review.rating % 1 === 0 ? review.rating.toFixed(0) : review.rating.toFixed(1)}
            </div>
          </div>
          <p className="review-text">{review.text}</p>
        </div>
      </div>

      <div className="like-container">
        <button
          className={`like-button ${review.isLiked ? 'liked' : ''}`}
          onClick={() => onLikeToggle(review)}
        >
          <svg
            className="like-icon"
            viewBox="0 0 24 24"
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
    </div>
  );
}

export const DEFAULT_AVATAR = 'https://i.stack.imgur.com/l60Hf.png';

export const getDisplayName = (user = {}) =>
  user.displayName || user.name || user.username || 'Usuario';

export const formatRating = (rating) => {
  const value = Number(rating);
  if (Number.isNaN(value)) return '-';
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
};

export const getRatingClass = (rating) => {
  const value = Number(rating);
  if (Number.isNaN(value)) return 'rating-bg-gray';
  if (value <= 3.9) return 'rating-bg-red';
  if (value <= 6.0) return 'rating-bg-yellow';
  return 'rating-bg-green';
};

export const formatTime = (dateValue) => {
  if (!dateValue) return '';

  try {
    const date = new Date(dateValue);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `Ha ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Ha ${Math.floor(diff / 3600)} h`;

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

export const normalizeReview = (review = {}) => ({
  ...review,
  reviewId: review.reviewId || review.id,
  id: review.id || review.reviewId,
  user: {
    ...(review.user || {}),
    avatarUrl: review.user?.avatarUrl || review.user?.avatar,
  },
});

export const makeReviewShareUrl = (reviewId) =>
  `${window.location.origin}/post/${reviewId}`;

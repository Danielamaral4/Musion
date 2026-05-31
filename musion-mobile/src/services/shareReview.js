const formatRating = (rating) => {
  const n = parseFloat(rating);

  if (Number.isNaN(n)) return '';

  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
};

const getAuthorName = (review = {}) =>
  review.user?.displayName ||
  review.user?.name ||
  review.user?.username ||
  review.displayName ||
  review.username ||
  'um usuario';

const getAuthorUsername = (review = {}) => {
  const username = review.user?.username || review.username || '';
  return username ? `@${username.replace(/^@/, '')}` : '';
};

export const normalizeReviewForShare = (review = {}) => {
  const albumName = review.albumName || review.album?.name || 'Album';
  const artistName =
    review.albumArtist ||
    review.artistName ||
    review.album?.artistName ||
    review.album?.artists?.map?.((artist) => artist.name).join(', ') ||
    review.artists?.[0]?.name ||
    '';
  const rating = formatRating(review.rating);
  const reviewText = String(review.text || review.reviewText || '').trim();
  const authorName = getAuthorName(review);
  const authorUsername = getAuthorUsername(review);

  return {
    ...review,
    albumName,
    artistName,
    albumCover:
      review.albumCover ||
      review.album?.imageUrl ||
      review.album?.images?.[0]?.url ||
      review.imageUrl ||
      '',
    rating,
    ratingLabel: rating || '-',
    text: reviewText,
    authorName,
    authorUsername,
    reviewId: review.reviewId || review.id,
  };
};

export const buildReviewShareMessage = (review = {}) => {
  const data = normalizeReviewForShare(review);

  return [
    `Olha essa review do ${data.authorName} no Musion:`,
    `${data.albumName}${data.artistName ? ` - ${data.artistName}` : ''}`,
    data.rating ? `Nota: ${data.rating}/10` : '',
    data.text ? `"${data.text}"` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

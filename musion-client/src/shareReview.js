import { formatRating, getDisplayName, makeReviewShareUrl } from './utils';

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

export const shareReview = async (review) => {
  const reviewId = review.reviewId || review.id;
  const url = makeReviewShareUrl(reviewId);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#18191D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.shadowColor = 'rgba(222, 224, 232, 0.24)';
    ctx.shadowBlur = 42;
    ctx.strokeStyle = '#DEE0E8';
    ctx.lineWidth = 4;
    ctx.strokeRect(94, 166, 712, 860);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#DEE0E8';
    ctx.font = '52px Arial';
    ctx.fillText('Musion', 110, 105);
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Review', 678, 105);

    const cover = await loadImage(review.albumCover);
    ctx.drawImage(cover, 160, 220, 580, 580);

    ctx.fillStyle = '#DEE0E8';
    ctx.font = 'bold 44px Arial';
    const albumName = String(review.albumName || 'Álbum').slice(0, 34);
    ctx.fillText(albumName, 160, 875);

    ctx.fillStyle = 'rgba(222, 224, 232, 0.72)';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(String(review.albumArtist || '').slice(0, 34), 160, 920);

    ctx.fillStyle = '#37A603';
    ctx.roundRect(640, 830, 100, 100, 12);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 44px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(formatRating(review.rating), 690, 895);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#DEE0E8';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(String(review.text || '').slice(0, 90), 160, 990);

    ctx.fillStyle = 'rgba(222, 224, 232, 0.36)';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${getDisplayName(review.user)} • @${review.user?.username || 'musion'}`,
      740,
      1048,
    );
    ctx.textAlign = 'left';

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'musion-review.png', { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'Review no Musion',
        text: `${review.albumName} no Musion`,
        files: [file],
        url,
      });
      return;
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'musion-review.png';
    link.click();
    URL.revokeObjectURL(downloadUrl);
  } catch {
    if (navigator.share) {
      await navigator.share({
        title: 'Review no Musion',
        text: `${review.albumName} no Musion`,
        url,
      });
      return;
    }

    await navigator.clipboard.writeText(url);
    window.alert('Link da review copiado.');
  }
};

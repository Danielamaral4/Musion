import api from './api';

export const sendAlbumToVirtualLed = async ({
  albumId,
  albumName,
  albumCover,
  source,
}) => {
  if (!albumId || !albumName) return null;

  try {
    const response = await api.post('/iot/album-color', {
      albumId: albumId.toString(),
      albumName,
      albumCover,
      source,
    });

    return response.data;
  } catch (error) {
    console.log('Musion Glow indisponivel:', error?.response?.data || error?.message);
    return null;
  }
};

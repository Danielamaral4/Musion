import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import api from './api';
import './Dashboard.css';
import ChatWidget from './ChatWidget';

const normalizeAlbum = (a) => ({
  id: a.id || a.albumId,
  name: a.name || a.albumName || 'Álbum Desconhecido',
  artistName: a.artistName || a.albumArtist || a.artists?.[0]?.name || 'Artista Desconhecido',
  imageUrl: a.imageUrl || a.albumCover || a.images?.[0]?.url || '',
  rating: a.rating ?? null,
});

const getSafeRating = (rating) => {
  const num = parseFloat(rating);
  if (isNaN(num)) return null;
  const fixed = num.toFixed(1);
  return fixed === '10.0' ? '10' : fixed;
};

const getDynamicColorClass = (value) => {
  const r = parseFloat(value);
  if (isNaN(r)) return 'rating-gray';
  if (r <= 3.9) return 'rating-red';
  if (r <= 6.9) return 'rating-yellow';
  return 'rating-green';
};

const SkeletonCard = () => (
  <div className="dash-card">
    <div className="skeleton" style={{ width: '100%', height: 200 }} />
    <div className="skeleton" style={{ width: '70%', height: 20, marginTop: 12 }} />
    <div className="skeleton" style={{ width: '45%', height: 16, marginTop: 8 }} />
  </div>
);

const SkeletonGrid = () => (
  <div className="album-grid">
    {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
);

const AlbumGrid = ({ albums }) => {
  if (!albums?.length) return null;

  return (
    <div className="album-grid">
      {albums.map((album, i) => {
        const n = normalizeAlbum(album);
        const ratingVal = getSafeRating(n.rating);

        return (
          <div className="dash-card">
            <img src={n.imageUrl || '/placeholder.png'} alt={n.name} />
            <div className="dash-info-row">
              <div className="dash-text-col">
                <div className="dash-title">{n.name}</div>
                <div className="dash-artist">{n.artistName}</div>
              </div>
              <div className={`dash-rating-square ${getDynamicColorClass(ratingVal)}`}>
                {ratingVal || '-'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

function Dashboard() {
  const { refreshTrigger } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendedByLast, setRecommendedByLast] = useState([]);
  const [lastAlbumName, setLastAlbumName] = useState(null);
  const [recommendedBySecond, setRecommendedBySecond] = useState([]);
  const [secondAlbumName, setSecondAlbumName] = useState(null);
  const [recommendedByThird, setRecommendedByThird] = useState([]);
  const [thirdAlbumName, setThirdAlbumName] = useState(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id || 'visitante';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chatRef.current && !chatRef.current.contains(e.target)) setIsChatOpen(false);
    };
    if (isChatOpen) document.addEventListener('mousedown', handleClickOutside);
    else document.removeEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isChatOpen]);

  useEffect(() => {
    const load = async () => {
      try { 
        const res = await api.get('/dashboard'); 
        setData(res.data); 
      } catch { setData(null); } 
      finally { setLoading(false); }
      loadRecommendations();
    };
    load();
  }, [refreshTrigger]);

  const loadRecommendations = async () => {
    try { const last = await api.get('/dashboard/recommend/last'); setLastAlbumName(last.data.baseAlbumName); setRecommendedByLast(last.data.recommendations.slice(0,5)); } catch {}
    try { const second = await api.get('/dashboard/recommend/second'); setSecondAlbumName(second.data.baseAlbumName); setRecommendedBySecond(second.data.recommendations.slice(0,5)); } catch {}
    try { const third = await api.get('/dashboard/recommend/third'); setThirdAlbumName(third.data.baseAlbumName); setRecommendedByThird(third.data.recommendations.slice(0,5)); } catch {}
  };

  if (!data && !loading)
    return <div className="loading-screen">Avalie alguns álbuns para começar!</div>;

  return (
    <div className="dashboard-container">
      <section>
        <div className="section-title">Em Alta no Musion</div>
        {loading ? <SkeletonGrid /> : <AlbumGrid albums={data?.popular} />}
      </section>

      <section>
        <div className="section-title">Aclamação da Crítica</div>
        {loading ? <SkeletonGrid /> : <AlbumGrid albums={data?.topRated} />}
      </section>

      {recommendedByLast?.length > 0 && (
        <section>
          <div className="section-title">Porque você curtiu {lastAlbumName}</div>
          <AlbumGrid albums={recommendedByLast} />
        </section>
      )}
      {recommendedBySecond?.length > 0 && (
        <section>
          <div className="section-title">Porque você também curtiu {secondAlbumName}</div>
          <AlbumGrid albums={recommendedBySecond} />
        </section>
      )}
      {recommendedByThird?.length > 0 && (
        <section>
          <div className="section-title">Porque você gostou de {thirdAlbumName}</div>
          <AlbumGrid albums={recommendedByThird} />
        </section>
      )}

      <div className="chat-fixed-container" ref={chatRef}>
        {isChatOpen && <ChatWidget sessionId={`session-${userId}`} />}
        <button className="chat-toggle-btn" onClick={() => setIsChatOpen(!isChatOpen)}>
          {isChatOpen ? (
            <svg className="icon-close" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="24" height="24" className="chat-icon">
              <path d="M51.9 384.9C19.3 344.6 0 294.4 0 240 0 107.5 114.6 0 256 0S512 107.5 512 240 397.4 480 256 480c-36.5 0-71.2-7.2-102.6-20L37 509.9c-3.7 1.6-7.5 2.1-11.5 2.1-14.1 0-25.5-11.4-25.5-25.5 0-4.3 1.1-8.5 3.1-12.2l48.8-89.4zm37.3-30.2c12.2 15.1 14.1 36.1 4.8 53.2l-18 33.1 58.5-25.1c11.8-5.1 25.2-5.2 37.1-.3 25.7 10.5 54.2 16.4 84.3 16.4 117.8 0 208-88.8 208-192S373.8 48 256 48 48 136.8 48 240c0 42.8 15.1 82.4 41.2 114.7z" fill="currentColor"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default Dashboard;

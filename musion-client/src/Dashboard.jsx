import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { IoLogoAndroid } from 'react-icons/io5';
import api from './api';
import './Dashboard.css';

const normalizeAlbum = (album) => ({
  id: album.spotifyId || album.albumId || album.id || album._id,
  name: album.name || album.albumName || 'Álbum desconhecido',
  artistName: album.artistName || album.albumArtist || album.artists?.[0]?.name || 'Artista desconhecido',
  imageUrl: album.imageUrl || album.albumCover || album.images?.[0]?.url || '',
  rating: album.rating ?? null,
});

const getSafeRating = (rating) => {
  const num = parseFloat(rating);
  if (isNaN(num)) return null;
  const fixed = num.toFixed(1);
  return fixed === '10.0' ? '10' : fixed;
};

const getDynamicColorClass = (value) => {
  const rating = parseFloat(value);
  if (isNaN(rating)) return 'rating-gray';
  if (rating <= 3.9) return 'rating-red';
  if (rating <= 6.9) return 'rating-yellow';
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
    {Array.from({ length: 5 }).map((_, index) => <SkeletonCard key={index} />)}
  </div>
);

const AlbumGrid = ({ albums }) => {
  if (!albums?.length) return null;

  return (
    <div className="album-grid">
      {albums.map((album) => {
        const normalized = normalizeAlbum(album);
        const ratingVal = getSafeRating(normalized.rating);

        return (
          <Link to={`/album/${normalized.id}`} className="dash-card" key={normalized.id}>
            <img src={normalized.imageUrl || '/placeholder.png'} alt={normalized.name} />

            <div className="dash-info-row">
              <div className="dash-text-col">
                <div className="dash-title">{normalized.name}</div>
                <div className="dash-artist">{normalized.artistName}</div>
              </div>

              <div className={`dash-rating-square ${getDynamicColorClass(ratingVal)}`}>
                {ratingVal || '-'}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

function Dashboard({ publicMode = false }) {
  const { refreshTrigger } = useOutletContext() || {};
  const isLoggedIn = Boolean(localStorage.getItem('musion_token'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendedByLast, setRecommendedByLast] = useState([]);
  const [lastAlbumName, setLastAlbumName] = useState(null);
  const [recommendedBySecond, setRecommendedBySecond] = useState([]);
  const [secondAlbumName, setSecondAlbumName] = useState(null);
  const [recommendedByThird, setRecommendedByThird] = useState([]);
  const [thirdAlbumName, setThirdAlbumName] = useState(null);
  const [recentRecommendations, setRecentRecommendations] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [publicSlide, setPublicSlide] = useState(0);
  const [displayedPublicSlide, setDisplayedPublicSlide] = useState(0);
  const [isPublicSlideFading, setIsPublicSlideFading] = useState(false);
  const publicFadeTimeoutRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get(isLoggedIn ? '/dashboard' : '/dashboard/public');
        setData(response.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }

      loadRecommendations();
    };

    load();
  }, [refreshTrigger, isLoggedIn]);

  const loadRecommendations = async () => {
    try {
      const releases = await api.get('/spotify/new-releases');
      setNewReleases((releases.data || []).slice(0, 5));
    } catch {}

    if (!isLoggedIn) return;

    try {
      const recent = await api.get('/dashboard/recommend/recent');
      const last = recent.data?.last || {};
      const second = recent.data?.second || {};
      const third = recent.data?.third || {};

      setRecentRecommendations([]);
      setLastAlbumName(last.baseAlbumName || null);
      setRecommendedByLast((last.recommendations || []).slice(0, 5));
      setSecondAlbumName(second.baseAlbumName || null);
      setRecommendedBySecond((second.recommendations || []).slice(0, 5));
      setThirdAlbumName(third.baseAlbumName || null);
      setRecommendedByThird((third.recommendations || []).slice(0, 5));
    } catch {
      setRecentRecommendations([]);
      setRecommendedByLast([]);
      setRecommendedBySecond([]);
      setRecommendedByThird([]);
    }
  };

  const publicAlbums = (data?.topRated || []).map(normalizeAlbum).filter((album) => album.id);
  const featuredAlbum = publicAlbums.length ? publicAlbums[displayedPublicSlide % publicAlbums.length] : null;

  const goToPublicSlide = (nextSlide) => {
    if (publicAlbums.length <= 1) return;

    const normalizedNext = ((nextSlide % publicAlbums.length) + publicAlbums.length) % publicAlbums.length;
    if (normalizedNext === publicSlide && normalizedNext === displayedPublicSlide) return;

    setIsPublicSlideFading(true);
    setPublicSlide(normalizedNext);

    if (publicFadeTimeoutRef.current) {
      clearTimeout(publicFadeTimeoutRef.current);
    }

    publicFadeTimeoutRef.current = setTimeout(() => {
      setDisplayedPublicSlide(normalizedNext);
      setIsPublicSlideFading(false);
    }, 280);
  };

  useEffect(() => {
    if (!publicMode || publicAlbums.length <= 1) return;

    const timer = setInterval(() => {
      goToPublicSlide(publicSlide + 1);
    }, 6800);

    return () => clearInterval(timer);
  }, [publicMode, publicAlbums.length, publicSlide, displayedPublicSlide]);

  useEffect(() => {
    if (!publicAlbums.length) return;

    if (displayedPublicSlide >= publicAlbums.length) {
      setDisplayedPublicSlide(0);
      setPublicSlide(0);
    }
  }, [publicAlbums.length, displayedPublicSlide]);

  useEffect(() => () => {
    if (publicFadeTimeoutRef.current) {
      clearTimeout(publicFadeTimeoutRef.current);
    }
  }, []);

  if (!data && !loading) {
    return <div className="loading-screen">Avalie alguns álbuns para começar!</div>;
  }

  if (publicMode) {
    const ratingVal = getSafeRating(featuredAlbum?.rating);
    const featuredImage = featuredAlbum?.imageUrl || '/placeholder.png';

    return (
      <div
        className="dashboard-container public-dashboard"
        style={{ '--public-album-bg': `url(${featuredImage})` }}
      >
        <section className="public-spotlight-section">
          {loading ? (
            <div className="public-spotlight-skeleton" />
          ) : featuredAlbum ? (
            <div className={`public-spotlight-card ${isPublicSlideFading ? 'is-dissolving' : ''}`}>
              <div
                className="public-spotlight-blur"
                style={{ backgroundImage: `url(${featuredImage})` }}
              />

              <button
                className="public-carousel-control public-carousel-prev"
                type="button"
                onClick={() => goToPublicSlide(publicSlide - 1)}
                aria-label="Álbum anterior"
              >
                {'<'}
              </button>

              <Link to={`/album/${featuredAlbum.id}`} className="public-featured-cover-link">
                <img src={featuredImage} alt={featuredAlbum.name} className="public-featured-cover" />
              </Link>

              <div className="public-featured-info">
                <p className="public-featured-kicker">Aclamado no Musion</p>
                <div className="public-featured-title-row">
                  <div>
                    <h1>{featuredAlbum.name}</h1>
                    <p>{featuredAlbum.artistName}</p>
                  </div>
                  <div className={`public-featured-rating ${getDynamicColorClass(ratingVal)}`}>
                    {ratingVal || '-'}
                  </div>
                </div>
              </div>

              <button
                className="public-carousel-control public-carousel-next"
                type="button"
                onClick={() => goToPublicSlide(publicSlide + 1)}
                aria-label="Próximo álbum"
              >
                {'>'}
              </button>
            </div>
          ) : (
            <div className="public-spotlight-empty">Nenhum álbum em destaque ainda.</div>
          )}
        </section>

        <section className="public-copy-section">
          <h2>Registre os álbuns que marcaram você.</h2>
          <p>Salve o que ainda quer ouvir. Compartilhe suas notas. Descubra a próxima obsessão antes dela virar consenso.</p>
          <Link to="/register" className="public-cta-button">Comece agora</Link>
          <div className="public-app-note">
            <span>Uma rede social para amantes de música.</span>
            <span className="public-android-line">
              Também disponível em <IoLogoAndroid aria-hidden="true" />
            </span>
          </div>
        </section>

        <footer className="public-footer">
          <div className="public-footer-brand">Musion</div>
          <nav aria-label="Links institucionais">
            <a href="#quem-somos">Quem somos</a>
            <a href="#privacidade">Política de privacidade</a>
            <a href="#sobre">Sobre</a>
            <a href="#ajuda">Ajuda</a>
            <a href="mailto:musionoficial@outlook.com">Contato</a>
          </nav>
        </footer>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <section>
        <div className="section-title">Em alta no Musion</div>
        {loading ? <SkeletonGrid /> : <AlbumGrid albums={data?.popular} />}
      </section>

      <section>
        <div className="section-title">Aclamação da crítica</div>
        {loading ? <SkeletonGrid /> : <AlbumGrid albums={data?.topRated} />}
      </section>

      {newReleases?.length > 0 && (
        <section>
          <div className="section-title">Lançamentos da semana</div>
          <AlbumGrid albums={newReleases} />
        </section>
      )}

      {recentRecommendations?.length > 0 && (
        <section>
          <div className="section-title">Recomendado para você</div>
          <AlbumGrid albums={recentRecommendations} />
        </section>
      )}

      {recommendedByLast?.length > 0 && (
        <section>
          <div className="section-title">Por ter curtido <span className="recommended-Name">{lastAlbumName}</span></div>
          <AlbumGrid albums={recommendedByLast} />
        </section>
      )}

      {recommendedBySecond?.length > 0 && (
        <section>
          <div className="section-title">Por também ter curtido <span className="recommended-Name">{secondAlbumName}</span></div>
          <AlbumGrid albums={recommendedBySecond} />
        </section>
      )}

      {recommendedByThird?.length > 0 && (
        <section>
          <div className="section-title">Por ter gostado de <span className="recommended-Name">{thirdAlbumName}</span></div>
          <AlbumGrid albums={recommendedByThird} />
        </section>
      )}
    </div>
  );
}

export default Dashboard;

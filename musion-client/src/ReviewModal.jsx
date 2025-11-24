import React, { useState, useEffect } from 'react';
import api from './api';
import './ReviewModal.css';

const NO_COVER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function ReviewModal({ onClose, onReviewSaved, reviewToEdit }) {
  
  const isEditing = !!reviewToEdit;
  const [step, setStep] = useState(isEditing ? 2 : 1);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [rating, setRating] = useState(isEditing ? reviewToEdit.rating : 5);
  const [reviewText, setReviewText] = useState(isEditing ? reviewToEdit.text : '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // --- PREENCHER DADOS (EDIÇÃO) ---
  useEffect(() => {
    if (isEditing && reviewToEdit) {
      setSelectedAlbum({
  id: reviewToEdit.spotifyId || reviewToEdit.albumId,
  spotifyId: reviewToEdit.spotifyId || reviewToEdit.albumId,
  name: reviewToEdit.albumName,
  artistName: reviewToEdit.albumArtist,
  imageUrl: reviewToEdit.albumCover,
  releaseDate: reviewToEdit.releaseYear,
  totalTracks: 0,
  totalDurationMin: 0 
});

      api.get(`/spotify/album/${reviewToEdit.albumId}`)
         .then(res => {
            const processed = processAlbumData(res.data);
            setSelectedAlbum(prev => ({
                ...prev,
                totalTracks: processed.totalTracks,
                totalDurationMin: processed.totalDurationMin,
                releaseDate: processed.releaseDate || prev.releaseDate
            }));
         })
         .catch(() => console.log("Sem detalhes extras."));
    }
  }, [isEditing, reviewToEdit]);

  // --- BUSCA ---
  useEffect(() => {
    if (isEditing) return;
    if (searchQuery.trim() === '') { setSearchResults([]); return; }

    setIsSearching(true);
    const timer = setTimeout(() => {
      api.get('/spotify/search', { params: { q: searchQuery } })
        .then(res => setSearchResults(res.data))
        .catch(console.error)
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isEditing]);

  // --- PROCESSAMENTO DADOS ---
  const processAlbumData = (data) => {
    const tracksRaw = data.tracks?.items || data.tracks || [];
    let durationMin = data.totalDurationMin || 0;

    if (!durationMin) {
       if (Array.isArray(tracksRaw) && tracksRaw.length > 0) {
          const totalMs = tracksRaw.reduce((acc, t) => acc + (parseInt(t.duration_ms) || 0), 0);
          durationMin = Math.floor(totalMs / 60000);
       }
    }

    return {
        id: data.id,
        name: data.name || "",
        artistName: data.artistName || data.artists?.[0]?.name || "Artista Desconhecido",
        imageUrl: data.imageUrl || data.images?.[0]?.url || NO_COVER,
        releaseDate: data.releaseDate || data.release_date || "",
        totalTracks: data.totalTracks || data.total_tracks || tracksRaw.length || 0,
        totalDurationMin: durationMin
    };
  };

  const handleAlbumSelect = async (albumCard) => {
    setIsLoadingDetails(true);
    setStep(2);

    try {
      const response = await api.get(`/spotify/album/${albumCard.id}`);
      const processed = processAlbumData(response.data);

      if (!processed.name) processed.name = albumCard.name;
      if (processed.imageUrl === NO_COVER && albumCard.images?.[0]?.url) {
          processed.imageUrl = albumCard.images[0].url;
      }

      setSelectedAlbum({
  ...processed,
  spotifyId: processed.id
});
    } catch (err) {
      console.error("Erro ao buscar detalhes:", err);
      setSelectedAlbum({
        id: albumCard.id,
        spotifyId: albumCard.id,
        name: albumCard.name,
        artistName: albumCard.artists?.[0]?.name || "Artista",
        imageUrl: albumCard.images?.[0]?.url || NO_COVER,
        releaseDate: albumCard.release_date,
        totalTracks: albumCard.total_tracks || 0,
        totalDurationMin: 0
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSubmitReview = async () => {
    setIsSubmitting(true);
    
    const year = String(selectedAlbum.releaseDate || '').substring(0, 4);
    const coverToSave = selectedAlbum.imageUrl === NO_COVER ? "" : selectedAlbum.imageUrl;

    const payload = {
      spotifyId: selectedAlbum.spotifyId || selectedAlbum.id,
albumId: selectedAlbum.id,
      albumName: selectedAlbum.name,
      albumCover: coverToSave,
      albumArtist: selectedAlbum.artistName,
      releaseYear: parseInt(year) || 0,
      rating: parseFloat(rating),
      text: reviewText
    };

    try {
      if (isEditing) {
        await api.patch(`/reviews/${reviewToEdit.id}`, payload);
      } else {
        await api.post('/reviews', payload);
      }
      if (onReviewSaved) onReviewSaved();
      onClose();
    } catch (err) {
      setSubmitError('Erro ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NOVA LÓGICA DE CORES (INTERPOLAÇÃO RGB) ---
  const getDynamicColor = (value) => {
    const r = parseFloat(value);
    
    // Cores base (RGB)
    const red = { r: 242, g: 5, b: 5 };      // #F20505
    const yellow = { r: 242, g: 203, b: 5 }; // #F2CB05
    const green = { r: 55, g: 166, b: 3 };   // #37A603

    let finalR, finalG, finalB;

    if (r <= 5) {
      // Transição de Vermelho para Amarelo (0 a 5)
      const percentage = r / 5; 
      finalR = Math.round(red.r + (yellow.r - red.r) * percentage);
      finalG = Math.round(red.g + (yellow.g - red.g) * percentage);
      finalB = Math.round(red.b + (yellow.b - red.b) * percentage);
    } else {
      // Transição de Amarelo para Verde (5 a 10)
      const percentage = (r - 5) / 5;
      finalR = Math.round(yellow.r + (green.r - yellow.r) * percentage);
      finalG = Math.round(yellow.g + (green.g - yellow.g) * percentage);
      finalB = Math.round(yellow.b + (green.b - yellow.b) * percentage);
    }

    return `rgb(${finalR}, ${finalG}, ${finalB})`;
  };

  // --- NOVA LÓGICA DE TAMANHO DE FONTE (FIT-TO-WIDTH) ---
  const getTitleFontSize = (title) => {
    const len = title ? title.length : 0;
    if (len <= 12) return '2.2rem'; // Curto: Fonte Gigante
    if (len <= 20) return '1.8rem'; // Médio
    if (len <= 35) return '1.4rem'; // Longo
    return '1.1rem';                // Muito longo
  };

  // --- RENDERIZAÇÃO ---
  const renderSearchStep = () => (
    <div className="review-modal-step-1">
      <h3>Novo Review</h3>
      <div className="search-bar-modal">
        <input autoFocus type="text" placeholder="Qual álbum você ouviu?" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>
      <div className="search-results-modal">
        {isSearching && <div className="loading">Buscando...</div>}
        {searchResults.map((album) => (
          <div key={album.id} className="album-result-item" onClick={() => handleAlbumSelect(album)}>
            <img src={album.images?.[0]?.url || NO_COVER} alt={album.name} className="album-result-cover" />
            <div className="album-result-info">
              <div className="album-result-name">{album.name}</div>
              <div className="album-result-artist">{album.artists?.map(a => a.name).join(', ')}</div>
            </div>
          </div>
        ))}
        {!isSearching && searchQuery && searchResults.length === 0 && (
          <div className="no-results">Nenhum álbum encontrado.</div>
        )}
      </div>
    </div>
  );

  const renderFormStep = () => {
    if (!selectedAlbum) return <div className="loading">Carregando...</div>;
    
    // Calcula cor e tamanho da fonte dinamicamente
    const dynamicColor = getDynamicColor(rating);
    const titleFontSize = getTitleFontSize(selectedAlbum.name);

    const year = String(selectedAlbum.releaseDate || '').substring(0, 4);
    const metaParts = [];
    if (year) metaParts.push(year);
    if (selectedAlbum.totalTracks > 0) metaParts.push(`${selectedAlbum.totalTracks} faixas`);
    if (selectedAlbum.totalDurationMin > 0) metaParts.push(`${selectedAlbum.totalDurationMin} min`);

    return (
      <div className="review-modal-step-2">
        <h3>{isEditing ? 'Editar Review' : 'Nova Review'}</h3>
        
        <div className="review-form-all">
        <div className="review-form-header">
          <img src={selectedAlbum.imageUrl} alt={selectedAlbum.name} className="review-form-cover" />
          <div className="review-form-info">
            
            {/* TÍTULO COM TAMANHO DINÂMICO */}
            <h2 style={{ fontSize: titleFontSize, lineHeight: '1.1' }}>
              {selectedAlbum.name}
            </h2>
            
            <p className="artist-name">{selectedAlbum.artistName}</p>
            <div className="review-form-meta">
               <span>{metaParts.join(' • ')}</span>
            </div>
          </div>
        </div>

        <div className="review-form-body">
          <textarea
            className="review-form-textarea"
            placeholder="Escreva sua review..."
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            maxLength="280"
          />
          <div className="review-char-counter">{reviewText.length} / 280</div>
          
          <div className="review-form-rating">
            <div className="rating-wrapper">
              <div className="slider-container">
                <input type="range" min="0" max="10" step="0.1" value={rating} onChange={e => setRating(e.target.value)} className="rating-slider" />
              </div>
              
              {/* CAIXA DE NOTA COM COR DINÂMICA */}
              <div 
                className="rating-value-box" 
                style={{ backgroundColor: dynamicColor }} // Aplica a cor calculada
              >
                <span className="rating-value">
                    {parseFloat(rating) === 10 ? '10' : parseFloat(rating).toFixed(1)}
                </span>
              </div>

            </div>
          </div>

          {submitError && <p className="error-message">{submitError}</p>}
          
          <button className="review-form-submit" onClick={handleSubmitReview} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Publicar Review')}
          </button>
        </div>
        </div>
      </div>
    );
  };

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal-content" onClick={e => e.stopPropagation()}>
        <button className="review-modal-close" onClick={onClose} title="Fechar">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        {!isEditing && step === 2 && (
            <button className="review-modal-back-btn" onClick={() => setStep(1)} title="Voltar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
        )}
        {step === 1 ? renderSearchStep() : renderFormStep()}
      </div>
    </div>
  );
}

export default ReviewModal;
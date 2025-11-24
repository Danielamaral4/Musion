import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./api";
import "./AlbumPage.css";

function AlbumPage() {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || id === 'undefined') return;
    const loadAlbum = async () => {
      try {
        const res = await api.get(`/albums/${id}`);
        setAlbum(res.data);
      } catch (err) {
        console.error("Erro ao carregar álbum:", err);

        // --- CORREÇÃO DO LOOP ---
        // Se a API retornar erro 401 (Não Autorizado), força o redirecionamento
        if (err.response && err.response.status === 401) {
          // Limpa qualquer resquício de token
          localStorage.removeItem('token');
          // Redireciona via window para garantir que o React limpe o estado
          window.location.href = '/login';
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    loadAlbum();
  }, [id]);

  if (loading) return <div className="loading-screen">Carregando álbum...</div>;
  
  // Se não estiver carregando e não tiver álbum (e não for erro de login), mostra msg
  if (!album) return <div className="loading-screen">Álbum não encontrado</div>;

  return (
    <div className="album-container">
      <img
        src={album.coverUrl || album.imageUrl || "/placeholder.png"}
        alt={album.name}
        className="album-cover"
      />
      
      <div className="album-details">
        <h1>{album.name}</h1>
        <h2>{album.artistName}</h2>
        <p className="album-rating">
          Nota: <span>{album.rating ?? "Sem avaliação"}</span>
        </p>
        
        {/* Espaço para descrição ou lista de reviews futuramente */}
      </div>
    </div>
  );
}

export default AlbumPage;
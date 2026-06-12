import React, { useEffect, useState } from 'react';
import api from './api';
import { unblockUser } from './moderation';
import { DEFAULT_AVATAR, getDisplayName } from './utils';
import './SettingsPage.css';

function BlockedUsersPage() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/moderation/blocks');
      setBlocks(response.data || []);
    } catch {
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUnblock = async (userId) => {
    await unblockUser(userId);
    setBlocks((prev) => prev.filter((block) => block.user?.id !== userId));
  };

  return (
    <div className="settings-page">
      <h2>Usuários bloqueados</h2>
      {loading && <p className="settings-muted">Carregando...</p>}
      {!loading && blocks.length === 0 && (
        <p className="settings-muted">Nenhum usuário bloqueado.</p>
      )}

      <div className="blocked-list">
        {blocks.map((block) => (
          <div className="blocked-row" key={block.id}>
            <img src={block.user?.avatarUrl || DEFAULT_AVATAR} alt="" />
            <span>
              <strong>{getDisplayName(block.user)}</strong>
              <small>@{block.user?.username}</small>
            </span>
            <button onClick={() => handleUnblock(block.user.id)}>Desbloquear</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BlockedUsersPage;

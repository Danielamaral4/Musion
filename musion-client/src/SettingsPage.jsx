import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './api';
import './SettingsPage.css';

function SettingsPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const legalBase = `${api.defaults.baseURL}/legal`;

  const logout = () => {
    localStorage.removeItem('musion_token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Senha alterada com sucesso.');
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível alterar a senha.');
    }
  };

  const deleteAccount = async (event) => {
    event.preventDefault();
    if (!window.confirm('Excluir sua conta permanentemente?')) return;
    setError('');
    setMessage('');
    try {
      await api.delete('/users/me', { data: { password: deletePassword } });
      logout();
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível excluir a conta.');
    }
  };

  return (
    <div className="settings-page">
      <h2>Configurações</h2>

      <section className="settings-card">
        <h3>Alterar senha</h3>
        <form onSubmit={changePassword}>
          <input
            type="password"
            placeholder="Senha atual"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Nova senha"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <button>Salvar nova senha</button>
        </form>
      </section>

      <section className="settings-card">
        <h3>Privacidade e segurança</h3>
        <Link to="/blocked-users">Usuários bloqueados</Link>
        <a href={`${legalBase}/privacy`} target="_blank" rel="noreferrer">Política de privacidade</a>
        <a href={`${legalBase}/terms`} target="_blank" rel="noreferrer">Termos de uso</a>
        <a href={`${legalBase}/delete-account`} target="_blank" rel="noreferrer">Solicitação pública de exclusão</a>
      </section>

      <section className="settings-card danger">
        <h3>Excluir conta</h3>
        <form onSubmit={deleteAccount}>
          <input
            type="password"
            placeholder="Confirme sua senha"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
            required
          />
          <button>Excluir minha conta</button>
        </form>
      </section>

      <button className="settings-logout" onClick={logout}>Sair da conta</button>

      {message && <p className="settings-message">{message}</p>}
      {error && <p className="settings-error">{error}</p>}
    </div>
  );
}

export default SettingsPage;

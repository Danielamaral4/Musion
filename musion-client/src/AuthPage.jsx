import React, { useState } from 'react';
import axios from 'axios';
import './AuthPage.css';

const API_URL = 'http://localhost:3000';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isValidEmail(email)) {
      setError('Por favor, insira um email válido.');
      return;
    }

    const payload = { email, password };
    if (!isLogin) {
      payload.displayName = name;
      payload.username = username;
    }

    try {
      const url = isLogin ? `${API_URL}/auth/login` : `${API_URL}/auth/register`;
      const response = await axios.post(url, payload);

      if (isLogin) {
        const token = response.data.access_token;
        setSuccess('Login bem-sucedido!');
        localStorage.setItem('musion_token', token);
        window.location.reload();
      } else {
        setSuccess('Cadastro realizado! Faça o login.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ocorreu um erro.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? 'Login' : 'Cadastro'}</h2>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="input-group">
                <label>Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Username</label>
                <div className="input-wrapper">
                  <span className="input-icon">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-button">
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="toggle-button"
        >
          {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça o login'}
        </button>

        {error && <p className="message error">{error}</p>}
        {success && <p className="message success">{success}</p>}
      </div>
    </div>
  );
}

export default AuthPage;

import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';
import api from './api';
import './AuthPage.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '';

function AuthPage() {
  const location = useLocation();
  const googleButtonRef = useRef(null);
  const [mode, setMode] = useState(location.pathname === '/register' ? 'register' : 'login');
  const [resetRequested, setResetRequested] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const finishLogin = (data) => {
    localStorage.setItem('musion_token', data.access_token);
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    window.location.href = '/';
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current || isForgot) return;

    const setupGoogle = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setError('');
          setSuccess('');
          setLoading(true);
          try {
            const res = await api.post('/auth/google', { idToken: response.credential });
            finishLogin(res.data);
          } catch (err) {
            setError(err.response?.data?.message || 'Não foi possível entrar com o Google.');
          } finally {
            setLoading(false);
          }
        },
      });

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 400,
        text: 'continue_with',
      });
    };

    if (window.google?.accounts?.id) {
      setupGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = setupGoogle;
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [isForgot, mode]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setResetRequested(false);
    setError('');
    setSuccess('');
    setPassword('');
    setNewPassword('');
    setResetCode('');
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!isValidEmail(email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    setLoading(true);

    try {
      if (isForgot) {
        if (!resetRequested) {
          const response = await api.post('/auth/forgot-password', { email });
          setResetRequested(true);
          setSuccess(response.data?.resetCode
            ? `${response.data.message} Código: ${response.data.resetCode}`
            : response.data?.message || 'Enviamos as instruções para seu e-mail.');
          return;
        }

        await api.post('/auth/reset-password', {
          email,
          code: resetCode,
          password: newPassword,
        });

        setSuccess('Senha redefinida. Faça login com a nova senha.');
        setMode('login');
        setResetRequested(false);
        setPassword('');
        setNewPassword('');
        setResetCode('');
        return;
      }

      const payload = { email, password };
      if (isRegister) {
        payload.name = name;
        payload.displayName = name;
        payload.username = username;
      }

      const response = await api.post(isLogin ? '/auth/login' : '/auth/register', payload);

      if (isLogin) {
        finishLogin(response.data);
      } else {
        setSuccess('Cadastro realizado. Faça login para continuar.');
        setMode('login');
        setPassword('');
      }
    } catch (err) {
      const message = err.response?.data?.message;
      setError(Array.isArray(message) ? message.join(' ') : message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>
          {isForgot
            ? 'Redefinir senha'
            : isLogin
              ? 'Entrar'
              : 'Cadastro'}
        </h2>

        <form onSubmit={handleAuthSubmit}>
          {isRegister && (
            <>
              <div className="input-group">
                <label>Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Nome de usuário</label>
                <div className="input-wrapper">
                  <span className="input-icon">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {!isForgot && (
            <div className="input-group">
              <label>Senha</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </button>
              </div>
            </div>
          )}

          {isForgot && resetRequested && (
            <>
              <div className="input-group">
                <label>Código recebido</label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(event) => setResetCode(event.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Nova senha</label>
                <div className="password-wrapper">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowNewPassword((value) => !value)}>
                    {showNewPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading
              ? 'Aguarde...'
              : isForgot
                ? resetRequested
                  ? 'Alterar senha'
                  : 'Enviar código'
                : isLogin
                  ? 'Entrar'
                  : 'Cadastrar'}
          </button>
        </form>

        {!isForgot && GOOGLE_CLIENT_ID && (
          <div className="google-login-wrapper">
            <button type="button" className="google-auth-button" tabIndex={-1}>
              <span className="google-auth-mark">G</span>
              Continuar com Google
            </button>
            <div className="google-hidden-button" ref={googleButtonRef} />
          </div>
        )}

        <div className="auth-links">
          {!isForgot && (
            <button onClick={() => switchMode(isLogin ? 'register' : 'login')}>
              {isLogin ? 'Não tem uma conta? Cadastre-se.' : 'Já tem uma conta? Faça login.'}
            </button>
          )}

          {isLogin && (
            <button onClick={() => switchMode('forgot')}>
              Esqueci minha senha
            </button>
          )}

          {isForgot && (
            <button onClick={() => switchMode('login')}>
              Voltar para login
            </button>
          )}
        </div>

        {error && <p className="message error">{error}</p>}
        {success && <p className="message success">{success}</p>}
      </div>
    </div>
  );
}

export default AuthPage;

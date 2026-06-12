import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { preloadTrendingData } from '../services/trendingPreload';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

const isGoogleConfigured = Boolean(GOOGLE_WEB_CLIENT_ID);

const loadNativeGoogleSignin = () => {
  try {
    return require('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
};

export function LoginScreen({ navigation }) {
  const [authMode, setAuthMode] = useState('login');
  const [resetRequested, setResetRequested] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isLogin = authMode === 'login';
  const isRegister = authMode === 'register';
  const isForgotPassword = authMode === 'forgot';

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const completeLogin = async (data, message = 'Login bem-sucedido!') => {
    const token = data.access_token;

    await AsyncStorage.setItem('musion_token', token);

    const avatarToSave = data.user?.avatarUrl || data.avatarUrl || '';
    if (avatarToSave) {
      await AsyncStorage.setItem('musion_user_avatar', avatarToSave);
    }

    preloadTrendingData({ force: true }).catch(() => {});
    setSuccess(message);
    navigation.replace('Feed');
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setResetRequested(false);
    setName('');
    setUsername('');
    setPassword('');
    setResetCode('');
    setNewPassword('');
    setShowPassword(false);
    setShowNewPassword(false);
    clearMessages();
  };

  const handleGoogleLogin = async () => {
    clearMessages();

    if (!isGoogleConfigured) {
      setError('Configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no musion-mobile/.env e reinicie o app.');
      return;
    }

    const googleModule = loadNativeGoogleSignin();
    if (!googleModule?.GoogleSignin) {
      setError('Login com Google nativo precisa de uma development build. Ele não roda dentro do Expo Go.');
      return;
    }

    const { GoogleSignin, statusCodes, isErrorWithCode, isSuccessResponse } = googleModule;

    setGoogleLoading(true);

    try {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
        scopes: ['profile', 'email'],
        offlineAccess: false,
      });

      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      await GoogleSignin.signOut().catch(() => {});

      const result = await GoogleSignin.signIn();

      if (!isSuccessResponse(result)) {
        setGoogleLoading(false);
        return;
      }

      let idToken = result.data?.idToken;

      if (!idToken) {
        const tokens = await GoogleSignin.getTokens().catch(() => null);
        idToken = tokens?.idToken;
      }

      if (!idToken) {
        setError('O Google não retornou um idToken. Confira se o WEB Client ID está correto.');
        setGoogleLoading(false);
        return;
      }

      const response = await api.post('/auth/google', { idToken });
      await completeLogin(response.data, 'Login com Google realizado!');
    } catch (err) {
      console.log('Erro no login com Google:', {
        code: err.code,
        message: err.message,
        response: err.response?.data,
        baseURL: api.defaults.baseURL,
      });

      if (isErrorWithCode?.(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED) {
          setGoogleLoading(false);
          return;
        }

        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setError('Google Play Services indisponível ou desatualizado neste aparelho.');
          setGoogleLoading(false);
          return;
        }
      }

      const apiMessage = err.response?.data?.message;
      const readableApiMessage = Array.isArray(apiMessage)
        ? apiMessage.join(' ')
        : apiMessage;

      if (readableApiMessage) {
        setError(readableApiMessage);
      } else if (err.message === 'Network Error') {
        setError(
          `Não consegui acessar o backend em ${api.defaults.baseURL}. Confirme se a API está rodando e se o celular está na mesma rede.`
        );
      } else if (
        String(err.code || '').includes('DEVELOPER_ERROR') ||
        String(err.message || '').includes('DEVELOPER_ERROR') ||
        String(err.message || '').includes('10:')
      ) {
        setError(
          'Erro Google DEVELOPER_ERROR: confira se o Android OAuth Client usa package com.musion.app e o SHA-1 da keystore da EAS.'
        );
      } else if (err.code) {
        setError(`Erro Google (${err.code}): ${err.message || 'falha ao autenticar.'}`);
      } else {
        setError(err.message || 'Não foi possível entrar com o Google.');
      }
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    clearMessages();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().replace(/^@/, '').toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    if (isForgotPassword) {
      if (resetRequested) {
        if (!resetCode.trim()) {
          setError('Informe o código recebido.');
          return;
        }

        if (!newPassword || newPassword.length < 6) {
          setError('A nova senha deve ter, no mínimo, 6 caracteres.');
          return;
        }
      }

      setLoading(true);

      try {
        if (resetRequested) {
          const response = await api.post('/auth/reset-password', {
            email: normalizedEmail,
            code: resetCode.trim(),
            password: newPassword,
          });

          setSuccess(response.data?.message || 'Senha redefinida com sucesso.');
          setPassword('');
          setResetCode('');
          setNewPassword('');
          setTimeout(() => switchMode('login'), 900);
        } else {
          const response = await api.post('/auth/forgot-password', {
            email: normalizedEmail,
          });

          const codeMessage = response.data?.resetCode
            ? ` Código: ${response.data.resetCode}`
            : '';

          setSuccess(
            `${response.data?.message || 'Se esse e-mail estiver cadastrado, enviaremos as instruções.'}${codeMessage}`
          );
          setResetRequested(true);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao redefinir a senha.');
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!password || password.length < 6) {
      setError('A senha deve ter, no mínimo, 6 caracteres.');
      return;
    }

    if (isRegister && (!name.trim() || !normalizedUsername)) {
      setError('Nome e nome de usuário são obrigatórios.');
      return;
    }

    const payload = {
      email: normalizedEmail,
      password,
    };

    if (isRegister) {
      payload.name = name.trim();
      payload.displayName = name.trim();
      payload.username = normalizedUsername;
    }

    setLoading(true);

    try {
      const url = isLogin ? '/auth/login' : '/auth/register';
      const response = await api.post(url, payload);

      if (isLogin) {
        await completeLogin(response.data);
      } else {
        setSuccess('Cadastro realizado! Faça login.');
        setAuthMode('login');
        setPassword('');
      }
    } catch (err) {
      setSuccess('');
      console.error('Erro no login:', {
        message: err.message,
        response: err.response?.data,
        baseURL: api.defaults.baseURL,
      });

      const apiMessage = err.response?.data?.message;
      const readableApiMessage = Array.isArray(apiMessage)
        ? apiMessage.join(' ')
        : apiMessage;

      if (readableApiMessage) {
        setError(readableApiMessage);
      } else if (err.message === 'Network Error') {
        setError(
          `Não consegui acessar o backend em ${api.defaults.baseURL}. Confirme se a API está rodando e se o celular está na mesma rede.`
        );
      } else {
        setError(err.message || 'Erro ao processar a requisição.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.authBox}>
          <Text style={styles.title}>
            {isForgotPassword ? 'Redefinir senha' : isLogin ? 'Login' : 'Cadastro'}
          </Text>

          {isForgotPassword && (
            <Text style={styles.helperText}>
              {resetRequested
                ? 'Digite o código recebido e escolha uma nova senha.'
                : 'Informe seu e-mail para receber as instruções.'}
            </Text>
          )}

          {isRegister && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder=""
                  placeholderTextColor="#404040"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome de usuário</Text>
                <View style={styles.inputWithIconWrapper}>
                  <View style={styles.inputIconBox}>
                    <Text style={styles.inputIcon}>@</Text>
                  </View>
                  <TextInput
                    style={styles.usernameInput}
                    value={username}
                    onChangeText={setUsername}
                    placeholder=""
                    placeholderTextColor="#404040"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder=""
              placeholderTextColor="#404040"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {!isForgotPassword && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder=""
                  placeholderTextColor="#404040"
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.passwordEyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isForgotPassword && resetRequested && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Código</Text>
                <TextInput
                  style={styles.input}
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder=""
                  placeholderTextColor="#404040"
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nova senha</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder=""
                    placeholderTextColor="#404040"
                    secureTextEntry={!showNewPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.passwordEyeButton}
                    onPress={() => setShowNewPassword((prev) => !prev)}
                    disabled={loading}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.authButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.authButtonText}>
                {isForgotPassword
                  ? resetRequested
                    ? 'Redefinir senha'
                    : 'Enviar instruções'
                  : isLogin
                    ? 'Entrar'
                    : 'Cadastrar'}
              </Text>
            )}
          </TouchableOpacity>

          {!isForgotPassword && (
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={COLORS.textMain} />
              ) : (
                <>
                  <View style={styles.googleMark}>
                    <Text style={styles.googleMarkText}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>Entrar com Google</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isLogin && (
            <TouchableOpacity
              style={styles.forgotWrapper}
              onPress={() => switchMode('forgot')}
              disabled={loading}
            >
              <Text style={styles.forgotButton}>Esqueci minha senha</Text>
            </TouchableOpacity>
          )}

          {isForgotPassword ? (
            <TouchableOpacity
              style={styles.toggleWrapper}
              onPress={() => switchMode('login')}
              disabled={loading}
            >
              <Text style={styles.toggleButton}>Voltar para o login</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.toggleWrapper}
              onPress={() => switchMode(isLogin ? 'register' : 'login')}
              disabled={loading}
            >
              <Text style={styles.toggleButton}>
                {isLogin ? 'Não tem uma conta? Cadastre-se.' : 'Já tem uma conta? Entrar.'}
              </Text>
            </TouchableOpacity>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const COLORS = {
  background: '#0D0E10',
  box: '#1A1B1F',
  border: '#2A2B2F',
  button: '#D1D5DB',
  textMain: '#FFFFFF',
  textSecondary: '#808080',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 20,
    alignItems: 'center',
  },
  authBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.box,
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 30,
    textAlign: 'center',
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: -18,
    marginBottom: 24,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    color: COLORS.textMain,
    marginBottom: 8,
    fontSize: 14,
    paddingLeft: 4,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: 'transparent',
    color: COLORS.textMain,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordInputWrapper: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    color: COLORS.textMain,
    paddingLeft: 20,
    paddingRight: 8,
    fontSize: 16,
  },
  passwordEyeButton: {
    width: 48,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWithIconWrapper: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  inputIconBox: {
    width: 44,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  inputIcon: {
    color: '#888',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  usernameInput: {
    flex: 1,
    height: '100%',
    color: COLORS.textMain,
    fontSize: 16,
    paddingRight: 20,
  },
  authButton: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.button,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  authButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  googleMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.textMain,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleMarkText: {
    color: '#18191D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButtonText: {
    color: COLORS.textMain,
    fontSize: 15,
    fontWeight: '700',
  },
  forgotWrapper: {
    marginTop: 18,
    alignItems: 'center',
  },
  forgotButton: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  toggleWrapper: {
    marginTop: 22,
    alignItems: 'center',
  },
  toggleButton: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#FF6666',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: 'bold',
  },
  successText: {
    color: '#00D851',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: 'bold',
  },
});

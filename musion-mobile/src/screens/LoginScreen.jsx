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
import api from '../services/api';
import { preloadTrendingData } from '../services/trendingPreload';

export function LoginScreen({ navigation }) {
  const [authMode, setAuthMode] = useState('login');
  const [resetRequested, setResetRequested] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = authMode === 'login';
  const isRegister = authMode === 'register';
  const isForgotPassword = authMode === 'forgot';

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setResetRequested(false);
    setName('');
    setUsername('');
    setPassword('');
    setResetCode('');
    setNewPassword('');
    clearMessages();
  };

  const handleSubmit = async () => {
    clearMessages();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().replace(/^@/, '').toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError('Por favor, insira um email valido.');
      return;
    }

    if (isForgotPassword) {
      if (resetRequested) {
        if (!resetCode.trim()) {
          setError('Informe o codigo recebido.');
          return;
        }

        if (!newPassword || newPassword.length < 6) {
          setError('Nova senha deve ter no minimo 6 caracteres.');
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
            ? ` Codigo: ${response.data.resetCode}`
            : '';

          setSuccess(
            `${response.data?.message || 'Se esse email estiver cadastrado, enviaremos as instrucoes.'}${codeMessage}`
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
      setError('Senha deve ter no minimo 6 caracteres.');
      return;
    }

    if (isRegister && (!name.trim() || !normalizedUsername)) {
      setError('Nome e username sao obrigatorios.');
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
        const token = response.data.access_token;

        await AsyncStorage.setItem('musion_token', token);

        const avatarToSave = response.data.user?.avatarUrl || response.data.avatarUrl || '';
        if (avatarToSave) {
          await AsyncStorage.setItem('musion_user_avatar', avatarToSave);
        }

        preloadTrendingData({ force: true }).catch(() => {});
        setSuccess('Login bem-sucedido!');
        navigation.replace('Feed');
      } else {
        setSuccess('Cadastro realizado! Faca o login.');
        setAuthMode('login');
        setPassword('');
      }
    } catch (err) {
      setSuccess('');
      setError(err.response?.data?.message || 'Erro ao processar a requisicao.');
      console.error('Erro no login:', err);
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
                ? 'Digite o codigo recebido e escolha uma nova senha.'
                : 'Informe seu email para receber as instrucoes.'}
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
                <Text style={styles.label}>Username</Text>
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
            <Text style={styles.label}>Email</Text>
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
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder=""
                placeholderTextColor="#404040"
                secureTextEntry
                editable={!loading}
              />
            </View>
          )}

          {isForgotPassword && resetRequested && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Codigo</Text>
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
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder=""
                  placeholderTextColor="#404040"
                  secureTextEntry
                  editable={!loading}
                />
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
                    : 'Enviar instrucoes'
                  : isLogin
                    ? 'Entrar'
                    : 'Cadastrar'}
              </Text>
            )}
          </TouchableOpacity>

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
                {isLogin ? 'Nao tem uma conta? Cadastre-se' : 'Ja tem uma conta? Entrar'}
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

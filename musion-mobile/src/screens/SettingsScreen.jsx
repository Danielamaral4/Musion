import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const getErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;

  if (Array.isArray(message)) return message[0] || fallback;
  if (typeof message === 'string') return message;

  return fallback;
};

export default function SettingsScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const openLegalPage = async (path) => {
    try {
      await Linking.openURL(`${api.defaults.baseURL}${path}`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir a página.');
    }
  };

  const logoutAndGoToLogin = async () => {
    await AsyncStorage.multiRemove([
      'musion_token',
      '@musion_trending_data',
      '@musion_trending_recommendations_v3',
      '@musion_trending_recommendations_v4',
    ]);

    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Deseja sair do Musion?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: logoutAndGoToLogin,
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Ops', 'Preencha todos os campos de senha.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Ops', 'A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Ops', 'A confirmação da senha não confere.');
      return;
    }

    setChangingPassword(true);

    try {
      await api.patch('/users/me/password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Pronto', 'Sua senha foi alterada.');
    } catch (error) {
      Alert.alert('Erro', getErrorMessage(error, 'Não foi possível alterar a senha.'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Ops', 'Digite sua senha para confirmar.');
      return;
    }

    setDeletingAccount(true);

    try {
      await api.delete('/users/me', {
        data: { password: deletePassword },
      });

      setDeleteModalVisible(false);
      setDeletePassword('');
      await logoutAndGoToLogin();
    } catch (error) {
      Alert.alert('Erro', getErrorMessage(error, 'Não foi possível excluir a conta.'));
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={24} color="#DEE0E8" />
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>Configurações</Text>

          <View style={styles.iconButtonPlaceholder} />
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conta</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Senha atual</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Digite sua senha atual"
                placeholderTextColor="rgba(222, 224, 232, 0.35)"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nova senha</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Mínimo de 6 caracteres"
                placeholderTextColor="rgba(222, 224, 232, 0.35)"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirmar nova senha</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Repita a nova senha"
                placeholderTextColor="rgba(222, 224, 232, 0.35)"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, changingPassword && styles.disabledButton]}
              onPress={handleChangePassword}
              disabled={changingPassword}
              activeOpacity={0.8}
            >
              {changingPassword ? (
                <ActivityIndicator size="small" color="#18191D" />
              ) : (
                <Text style={styles.primaryButtonText}>Alterar senha</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal</Text>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => openLegalPage('/legal/privacy')}
              activeOpacity={0.75}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#DEE0E8" />
              </View>
              <View style={styles.actionTextBlock}>
                <Text style={styles.actionTitle}>Política de privacidade</Text>
                <Text style={styles.actionDescription}>Ver como seus dados são tratados.</Text>
              </View>
              <Ionicons name="open-outline" size={20} color="rgba(222, 224, 232, 0.45)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, styles.actionRowSpacing]}
              onPress={() => openLegalPage('/legal/terms')}
              activeOpacity={0.75}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="document-text-outline" size={22} color="#DEE0E8" />
              </View>
              <View style={styles.actionTextBlock}>
                <Text style={styles.actionTitle}>Termos de uso</Text>
                <Text style={styles.actionDescription}>Regras de uso e moderação.</Text>
              </View>
              <Ionicons name="open-outline" size={20} color="rgba(222, 224, 232, 0.45)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, styles.actionRowSpacing]}
              onPress={() => openLegalPage('/legal/delete-account')}
              activeOpacity={0.75}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="person-remove-outline" size={22} color="#DEE0E8" />
              </View>
              <View style={styles.actionTextBlock}>
                <Text style={styles.actionTitle}>Exclusão de dados</Text>
                <Text style={styles.actionDescription}>Solicitar exclusão sem acessar o app.</Text>
              </View>
              <Ionicons name="open-outline" size={20} color="rgba(222, 224, 232, 0.45)" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacidade e segurança</Text>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('BlockedUsers')}
              activeOpacity={0.75}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="ban-outline" size={22} color="#DEE0E8" />
              </View>
              <View style={styles.actionTextBlock}>
                <Text style={styles.actionTitle}>Usuários bloqueados</Text>
                <Text style={styles.actionDescription}>Gerenciar quem você bloqueou.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(222, 224, 232, 0.45)" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.75}>
              <View style={styles.actionIcon}>
                <Ionicons name="log-out-outline" size={22} color="#DEE0E8" />
              </View>
              <View style={styles.actionTextBlock}>
                <Text style={styles.actionTitle}>Sair</Text>
                <Text style={styles.actionDescription}>Voltar para a tela de login.</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.dangerSection}>
            <Text style={styles.sectionTitle}>Zona de perigo</Text>

            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() => setDeleteModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={20} color="#F20505" />
              <Text style={styles.dangerButtonText}>Excluir conta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDeleteModalVisible(false)}>
            <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
              <Text style={styles.modalTitle}>Excluir conta</Text>
              <Text style={styles.modalText}>
                Essa ação apaga seu perfil, reviews, comentários, likes e conexões. Digite sua senha para confirmar.
              </Text>

              <TextInput
                style={styles.input}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                placeholder="Sua senha"
                placeholderTextColor="rgba(222, 224, 232, 0.35)"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setDeleteModalVisible(false);
                    setDeletePassword('');
                  }}
                  disabled={deletingAccount}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmDeleteButton, deletingAccount && styles.disabledButton]}
                  onPress={handleDeleteAccount}
                  disabled={deletingAccount}
                  activeOpacity={0.8}
                >
                  {deletingAccount ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.confirmDeleteButtonText}>Excluir</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#18191D',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  keyboardWrapper: {
    flex: 1,
  },
  topBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 224, 232, 0.05)',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  topBarTitle: {
    color: '#DEE0E8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  dangerSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#DEE0E8',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    color: 'rgba(222, 224, 232, 0.65)',
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 232, 0.18)',
    backgroundColor: 'rgba(222, 224, 232, 0.06)',
    borderRadius: 8,
    color: '#DEE0E8',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DEE0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#18191D',
    fontSize: 15,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.65,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 232, 0.08)',
    borderRadius: 8,
    padding: 14,
  },
  actionRowSpacing: {
    marginTop: 10,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(222, 224, 232, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextBlock: {
    flex: 1,
  },
  actionTitle: {
    color: '#DEE0E8',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  actionDescription: {
    color: 'rgba(222, 224, 232, 0.55)',
    fontSize: 13,
  },
  dangerButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(242, 5, 5, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dangerButtonText: {
    color: '#F20505',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1E1F24',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 232, 0.08)',
  },
  modalTitle: {
    color: '#DEE0E8',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalText: {
    color: 'rgba(222, 224, 232, 0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(222, 224, 232, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#DEE0E8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmDeleteButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F20505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

import { Alert } from 'react-native';
import api from './api';

const reasonOptions = [
  { label: 'Assedio ou ataque', value: 'HARASSMENT' },
  { label: 'Discurso de odio', value: 'HATE' },
  { label: 'Spam ou golpe', value: 'SPAM' },
  { label: 'Conteudo ofensivo', value: 'OFFENSIVE' },
  { label: 'Outro motivo', value: 'OTHER' },
];

const targetLabels = {
  USER: 'usuario',
  REVIEW: 'review',
  COMMENT: 'comentario',
};

const getErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;

  if (Array.isArray(message)) return message[0] || fallback;
  if (typeof message === 'string') return message;

  return fallback;
};

export const openReportPrompt = ({ targetType, targetId, onSuccess }) => {
  const targetLabel = targetLabels[targetType] || 'conteudo';

  Alert.alert(`Denunciar ${targetLabel}`, 'Escolha o motivo da denuncia.', [
    { text: 'Cancelar', style: 'cancel' },
    ...reasonOptions.map((reason) => ({
      text: reason.label,
      onPress: async () => {
        try {
          await api.post('/moderation/reports', {
            targetType,
            targetId: Number(targetId),
            reason: reason.value,
          });

          Alert.alert('Obrigado', 'Sua denuncia foi registrada para analise.');
          onSuccess?.();
        } catch (error) {
          Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel registrar a denuncia.'));
        }
      },
    })),
  ]);
};

export const confirmBlockUser = ({ userId, username, onSuccess }) => {
  if (!userId) return;

  Alert.alert(
    'Bloquear usuario',
    `Bloquear ${username ? `@${username}` : 'este usuario'}? Voces nao verao mais conteudos um do outro.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/moderation/blocks/${userId}`);
            Alert.alert('Usuario bloqueado', 'O conteudo desse usuario sera ocultado.');
            onSuccess?.();
          } catch (error) {
            Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel bloquear o usuario.'));
          }
        },
      },
    ]
  );
};

export const confirmUnblockUser = ({ userId, username, onSuccess }) => {
  if (!userId) return;

  Alert.alert(
    'Desbloquear usuario',
    `Desbloquear ${username ? `@${username}` : 'este usuario'}?`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desbloquear',
        onPress: async () => {
          try {
            await api.delete(`/moderation/blocks/${userId}`);
            Alert.alert('Pronto', 'Usuario desbloqueado.');
            onSuccess?.();
          } catch (error) {
            Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel desbloquear o usuario.'));
          }
        },
      },
    ]
  );
};

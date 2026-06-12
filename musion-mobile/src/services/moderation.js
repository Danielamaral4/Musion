import { Alert } from 'react-native';
import api from './api';

const reasonOptions = [
  { label: 'Assédio ou ataque', value: 'HARASSMENT' },
  { label: 'Discurso de ódio', value: 'HATE' },
  { label: 'Spam ou golpe', value: 'SPAM' },
  { label: 'Conteúdo ofensivo', value: 'OFFENSIVE' },
  { label: 'Outro motivo', value: 'OTHER' },
];

const targetLabels = {
  USER: 'usuário',
  REVIEW: 'review',
  COMMENT: 'comentário',
};

const getErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;

  if (Array.isArray(message)) return message[0] || fallback;
  if (typeof message === 'string') return message;

  return fallback;
};

export const openReportPrompt = ({ targetType, targetId, onSuccess }) => {
  const targetLabel = targetLabels[targetType] || 'conteúdo';

  Alert.alert(`Denunciar ${targetLabel}`, 'Escolha o motivo da denúncia.', [
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

          Alert.alert('Obrigado', 'Sua denúncia foi registrada para análise.');
          onSuccess?.();
        } catch (error) {
          Alert.alert('Erro', getErrorMessage(error, 'Não foi possível registrar a denúncia.'));
        }
      },
    })),
  ]);
};

export const confirmBlockUser = ({ userId, username, onSuccess }) => {
  if (!userId) return;

  Alert.alert(
    'Bloquear usuário',
    `Bloquear ${username ? `@${username}` : 'este usuário'}? Vocês não verão mais conteúdos um do outro.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/moderation/blocks/${userId}`);
            Alert.alert('Usuário bloqueado', 'O conteúdo desse usuário será ocultado.');
            onSuccess?.();
          } catch (error) {
            Alert.alert('Erro', getErrorMessage(error, 'Não foi possível bloquear o usuário.'));
          }
        },
      },
    ]
  );
};

export const confirmUnblockUser = ({ userId, username, onSuccess }) => {
  if (!userId) return;

  Alert.alert(
    'Desbloquear usuário',
    `Desbloquear ${username ? `@${username}` : 'este usuário'}?`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desbloquear',
        onPress: async () => {
          try {
            await api.delete(`/moderation/blocks/${userId}`);
            Alert.alert('Pronto', 'Usuário desbloqueado.');
            onSuccess?.();
          } catch (error) {
            Alert.alert('Erro', getErrorMessage(error, 'Não foi possível desbloquear o usuário.'));
          }
        },
      },
    ]
  );
};

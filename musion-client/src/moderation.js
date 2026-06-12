import api from './api';

const reasons = [
  'Spam',
  'Assédio ou discurso de ódio',
  'Conteúdo ofensivo',
  'Informação falsa',
  'Outro',
];

export const reportTarget = async (targetType, targetId, targetLabel = 'conteúdo') => {
  const reason = window.prompt(
    `Denunciar ${targetLabel}\n\nMotivos sugeridos:\n${reasons.join('\n')}\n\nDigite o motivo:`,
    'Conteúdo ofensivo',
  );

  if (!reason?.trim()) return false;

  await api.post('/moderation/reports', {
    targetType,
    targetId: Number(targetId),
    reason: reason.trim(),
  });

  window.alert('Denúncia registrada para análise.');
  return true;
};

export const blockUser = async (userId, label = 'usuário') => {
  if (!window.confirm(`Bloquear ${label}? Vocês deixarão de interagir no Musion.`)) {
    return false;
  }

  await api.post(`/moderation/blocks/${userId}`);
  window.alert('Usuário bloqueado.');
  return true;
};

export const unblockUser = async (userId) => {
  await api.delete(`/moderation/blocks/${userId}`);
  return true;
};

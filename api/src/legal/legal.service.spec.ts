import { LegalService } from './legal.service';
import { privacyPage, termsPage, deleteAccountPage } from './legal.pages';

describe('LegalService', () => {
  it('normaliza e salva uma solicitação de exclusão de dados', async () => {
    const prisma = {
      dataDeletionRequest: {
        create: jest.fn(({ data }) => Promise.resolve({ id: 1, ...data })),
      },
    };
    const service = new LegalService(prisma as any);

    await expect(
      service.createDataDeletionRequest({
        email: '  USER@EMAIL.COM  ',
        username: ' daniel ',
        reason: ' Quero apagar meus dados. ',
      })
    ).resolves.toEqual({
      id: 1,
      email: 'user@email.com',
      username: 'daniel',
      reason: 'Quero apagar meus dados.',
    });

    expect(prisma.dataDeletionRequest.create).toHaveBeenCalledWith({
      data: {
        email: 'user@email.com',
        username: 'daniel',
        reason: 'Quero apagar meus dados.',
      },
    });
  });

  it('renderiza páginas legais com acentuação em português', () => {
    expect(privacyPage()).toContain('Política de Privacidade');
    expect(termsPage()).toContain('Conteúdo proibido');
    expect(deleteAccountPage()).toContain('Solicitar exclusão de dados');
  });
});

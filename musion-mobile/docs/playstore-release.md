# Play Store Release

Este arquivo concentra o fluxo de preparação do Musion para build Android e publicação.

## Parte 4: build de produção

1. Configure a URL pública da API no `eas.json`.
   - Para teste local, o perfil `preview` usa `http://192.168.15.3:3000`.
   - Para loja, troque `https://api.seu-dominio.com` pela URL HTTPS real do backend.

2. Faça login na Expo:

```bash
npx eas-cli@latest login
```

3. Inicialize o projeto no EAS, se ainda não tiver feito:

```bash
npx eas-cli@latest init
```

4. Gere um APK interno para teste:

```bash
npm run build:android:preview
```

5. Gere o AAB de produção para Play Store:

```bash
npm run build:android:production
```

## Parte 5: itens pendentes da Play Console

Esta parte depende de materiais externos e pode ficar para depois:

- Conta de desenvolvedor Google Play.
- Nome final do pacote Android, se `com.musion.app` precisar mudar.
- Screenshots, descrição curta, descrição completa e ícone final.
- URL pública HTTPS do backend.
- Conta de serviço do Google Play, caso queira submissão automática.

## Parte 6: submissão e checklist

Antes de enviar para a Play Store:

- `npm run validate` no app mobile.
- `npm test -- --runInBand` no backend.
- `npm run build` no backend.
- Testar login, cadastro, recuperação de senha e exclusão de conta.
- Testar política, termos e página pública de exclusão de dados.
- Testar denúncia, bloqueio e desbloqueio.
- Testar review, comentário, like, feed, trending e perfil.
- Testar Musion Glow em álbum e post.

Quando a conta da Play Console estiver pronta, envie para a faixa interna:

```bash
npm run submit:android:internal
```

O workflow manual `EAS Android Preview` também consegue disparar um build de preview pelo GitHub Actions quando o segredo `EXPO_TOKEN` estiver configurado no repositório.

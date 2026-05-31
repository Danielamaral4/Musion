# Play Store Release

Este arquivo concentra o fluxo de preparacao do Musion para build Android e publicacao.

## Parte 1: build de preview

1. Confirme a URL local ou publica da API.

Para teste local no celular fisico:

```text
EXPO_PUBLIC_API_URL="http://SEU_IP_LOCAL:3000"
```

2. Gere um APK interno:

```bash
cd musion-mobile
npx eas-cli@latest build -p android --profile preview --clear-cache
```

3. Antes de instalar uma build nova, desinstale o app antigo do celular.

## Parte 2: build de producao

1. Configure a URL publica HTTPS da API no `eas.json`.

Para loja, troque:

```text
https://api.seu-dominio.com
```

pela URL real do backend.

2. Faca login na Expo:

```bash
npx eas-cli@latest login
```

3. Inicialize o projeto no EAS, se ainda nao tiver feito:

```bash
npx eas-cli@latest init
```

4. Gere o AAB de producao para Play Store:

```bash
npm run build:android:production
```

## Parte 3: itens pendentes da Play Console

- Conta de desenvolvedor Google Play.
- Screenshots.
- Descricao curta.
- Descricao completa.
- Icone final.
- Politica de privacidade publica.
- URL publica HTTPS do backend.
- Conta de servico do Google Play, caso queira submissao automatica.

## Parte 4: checklist antes de publicar

- `npm run validate` no app mobile.
- `npm test -- --runInBand` no backend.
- `npm run build` no backend.
- Testar login.
- Testar cadastro.
- Testar recuperacao de senha.
- Testar exclusao de conta.
- Testar politica, termos e pagina publica de exclusao de dados.
- Testar denuncia, bloqueio e desbloqueio.
- Testar review, comentario, like, feed, trending e perfil.
- Testar busca de albuns e usuarios.
- Testar pagina de album, previews e link para Spotify.
- Testar chat entre usuarios.
- Testar compartilhamento de review.
- Testar sensor controlando nota na tela de review.

## Parte 5: submissao

Quando a conta da Play Console estiver pronta, envie para a faixa interna:

```bash
npm run submit:android:internal
```

O workflow manual `EAS Android Preview` tambem consegue disparar um build de preview pelo GitHub Actions quando o segredo `EXPO_TOKEN` estiver configurado no repositorio.

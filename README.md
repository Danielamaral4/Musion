# Musion

Musion e um app mobile de reviews musicais feito com React Native/Expo e uma API NestJS. O app permite avaliar albuns, comentar, curtir reviews, seguir usuarios, receber notificacoes, conversar com outros usuarios, descobrir recomendacoes personalizadas, ouvir previews quando disponiveis, compartilhar reviews como imagem, redefinir senha por email e controlar a nota da review com o acelerometro do celular.

## Estrutura

```text
api/            Backend NestJS + Prisma + MySQL
musion-mobile/  App mobile React Native/Expo
musion-client/  Cliente web legado/paralelo
.github/        Pipelines de CI/CD
```

## Rodar a API

```bash
cd api
npm install
npx prisma generate
npm run start:dev
```

API local:

```text
http://localhost:3000
```

Teste publico:

```text
http://localhost:3000/health
```

## Rodar o app mobile

```bash
cd musion-mobile
npm install
npx expo start
```

Se estiver usando celular fisico, configure `EXPO_PUBLIC_API_URL` no `musion-mobile/.env` ou ajuste a URL em `musion-mobile/src/services/api.js`.

## Build APK preview

```bash
cd musion-mobile
npx eas-cli@latest build -p android --profile preview --clear-cache
```

## Validacao

```bash
cd api
npm test -- --runInBand
npm run build

cd ../musion-mobile
npm run validate
```

## Documentacao

```text
musion-mobile/docs/relatorio-musion.md
musion-mobile/docs/roteiro-apresentacao-video.md
musion-mobile/docs/validacao-requisitos-musion.md
musion-mobile/docs/playstore-release.md
```

## Funcionalidades principais

- Login, cadastro e reset de senha.
- Feed social de reviews.
- Busca de albuns e usuarios.
- Criacao e edicao de reviews.
- Slider de nota controlado manualmente ou pelo acelerometro.
- Pagina de album com faixas, previews e link para Spotify.
- Trending com recomendacoes e lancamentos da semana.
- Perfil, seguidores e seguindo.
- Chat entre usuarios.
- Comentarios, curtidas e notificacoes.
- Compartilhamento de review como imagem.
- Bloqueio e denuncia.
- Configuracoes de conta e exclusao de dados.

## Observacoes

- Arquivos `.env`, `node_modules`, builds e caches nao devem ser enviados ao GitHub.
- Para enviar codigos reais de redefinicao por email, configure `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM` em `api/.env`.
- O login com Google exige Client IDs corretos no Google Cloud e uma build nativa/development build.

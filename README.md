# Musion

Musion e um app mobile de reviews musicais feito com React Native/Expo e uma API NestJS. O app permite avaliar albuns, comentar, curtir reviews, seguir usuarios, receber notificacoes, descobrir recomendacoes personalizadas e demonstrar um LED RGB virtual baseado na cor predominante da capa do album.

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

## Rodar o app mobile

```bash
cd musion-mobile
npm install
npx expo start
```

Se estiver usando celular fisico, ajuste a URL local em `musion-mobile/src/services/api.js` ou configure `EXPO_PUBLIC_API_URL`.

## Validacao

```bash
cd api
npm test -- --runInBand
npm run build

cd ../musion-mobile
npm run validate
```

## Documentacao

O relatorio tecnico completo esta em:

```text
musion-mobile/docs/relatorio-musion.md
```

## Observacoes

Arquivos `.env`, `node_modules`, builds e caches nao devem ser enviados ao GitHub.

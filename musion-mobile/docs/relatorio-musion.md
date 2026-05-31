# Relatorio tecnico do Musion

Este documento descreve o Musion no estado atual do projeto. Ele foi escrito para apoiar apresentacao academica, gravacao de video, defesa tecnica e continuidade do desenvolvimento.

## 1. Visao geral

O Musion e um aplicativo mobile de reviews musicais. A proposta e criar uma camada social sobre albuns: usuarios avaliam discos, escrevem reviews, comentam, curtem, seguem outros perfis, conversam por chat e recebem recomendacoes musicais com base no proprio historico e na atividade da comunidade.

O app combina:

- Rede social musical.
- Catalogo de albuns consumindo Spotify.
- Feed de reviews.
- Pagina de album com faixas, preview de musica quando disponivel, link para Spotify e reviews da comunidade.
- Recomendacoes personalizadas.
- Chat entre usuarios.
- Notificacoes.
- Moderacao com denuncia e bloqueio.
- Configuracoes de conta, troca de senha, exclusao de conta e paginas legais.
- Controle de nota por sensor do celular, usando acelerometro.

## 2. Publico-alvo e problema

Publico-alvo:

- Pessoas que escutam albuns completos e gostam de registrar opinioes.
- Usuarios que querem descobrir musica por recomendacao social.
- Comunidades que valorizam reviews, notas e rankings musicais.

Problema:

- Plataformas de streaming focam no consumo, mas nao em reviews detalhadas e historico pessoal de opiniao.
- Redes sociais comuns nao organizam discussoes por album.
- Recomendacoes musicais podem ser repetitivas quando dependem apenas de uma fonte.

Solucao:

- O Musion organiza reviews por usuario, album e comunidade.
- O app cria um feed social e paginas de album.
- A aba Trending traz recomendacoes e lancamentos.
- O historico de reviews vira insumo para recomendacoes personalizadas.

## 3. Estrutura do projeto

Raiz:

```text
C:\Users\Daniel\Desktop\Musion\musion
```

Pastas principais:

```text
api/            Backend NestJS + Prisma + MySQL
musion-mobile/  App mobile React Native/Expo
musion-client/  Cliente web legado/paralelo
.github/        Pipelines de CI/CD
```

## 4. Frontend mobile

Local:

```text
musion-mobile/
```

Tecnologias:

- React Native.
- Expo SDK 54.
- React Navigation.
- Axios.
- AsyncStorage.
- Expo Linear Gradient.
- Expo Image Picker.
- Expo Sensors, usando acelerometro.
- Expo AV, para tocar previews.
- React Native Keyboard Controller.
- View Shot e Expo Sharing para compartilhar review como imagem.
- Google Sign-In nativo.

Telas principais:

```text
LoginScreen.jsx
FeedScreen.jsx
SearchScreen.jsx
TrendingScreen.jsx
NotificationsScreen.jsx
ProfilePage.jsx
AddReviewScreen.jsx
AlbumDetailsScreen.jsx
PostScreen.jsx
SettingsScreen.jsx
ChatScreen.jsx
BlockedUsersScreen.jsx
```

### 4.1 Login, cadastro e conta

A tela de login permite:

- Login normal com email e senha.
- Cadastro com nome, username, email e senha.
- Mostrar ou ocultar senha.
- Redefinir senha por email/codigo.
- Login com Google via build nativa e Client IDs configurados.

A tela de configuracoes permite:

- Alterar senha.
- Sair da conta.
- Excluir conta.
- Acessar termos de uso, politica de privacidade e solicitacao publica de exclusao de dados.
- Gerenciar usuarios bloqueados.

### 4.2 Feed, posts e interacoes

O feed mostra reviews e permite:

- Abrir um post.
- Curtir review.
- Comentar.
- Abrir perfil do autor.
- Compartilhar review como imagem.
- Acessar notificacoes.

A tela de post mostra:

- Review completa.
- Comentarios.
- Campo fixo de comentario ajustado ao teclado.
- Opcoes de moderacao quando aplicavel.

### 4.3 Busca e reviews

A busca permite encontrar albuns ou usuarios.

A tela de adicionar review permite:

- Pesquisar album.
- Selecionar album.
- Escrever review.
- Dar nota de 0 a 10.
- Editar review existente.
- Controlar a nota inclinando o celular, usando acelerometro.

O uso do acelerometro ajuda a atender a parte de sensores do escopo mobile, demonstrando interacao com hardware do proprio dispositivo.

### 4.4 Pagina de album

A pagina de album mostra:

- Capa.
- Titulo.
- Artista.
- Ano, quantidade de faixas e duracao.
- Media da comunidade.
- Botao para avaliar ou editar review.
- Botao com icone do Spotify para abrir o album no Spotify.
- Lista de faixas.
- Botao de play por faixa.
- Preview quando o Spotify ou fallback externo disponibiliza trecho.
- Reviews da comunidade.

Quando a faixa nao possui preview, o sistema tenta buscar preview por fallback. Se nao encontrar, a experiencia segue com o link do Spotify.

### 4.5 Trending e recomendacoes

A tela Trending inclui:

- Em alta no Musion.
- Lancamentos da semana.
- Aclamacao da critica.
- Recomendacoes baseadas nas ultimas reviews relevantes do usuario.

O app pre-carrega dados de trending/recomendacao quando abre, reduzindo a espera ao entrar na aba.

### 4.6 Chat social

O chat atual e um chat entre usuarios:

- Buscar usuarios.
- Abrir conversa.
- Listar conversas recentes.
- Enviar mensagens.
- Carregar historico.

## 5. Backend

Local:

```text
api/
```

Tecnologias:

- NestJS.
- TypeScript.
- Prisma ORM.
- MySQL.
- JWT e Passport.
- Bcrypt.
- Nodemailer para reset de senha.
- Axios via Nest.
- Spotify Web API.
- Last.fm API.
- Deezer como fallback de preview.
- Cloudinary para imagens de avatar.

Modulos principais:

```text
auth
users
spotify
lastfm
dashboard
reviews
comments
notifications
chat
moderation
legal
prisma
```

### 5.1 Rotas principais

Autenticacao:

```text
POST /auth/register
POST /auth/login
POST /auth/google
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/profile
```

Usuarios:

```text
GET    /users/me
PATCH  /users/me
PATCH  /users/me/password
DELETE /users/me
PATCH  /users/me/avatar
GET    /users/search
GET    /users/profile/:id
POST   /users/:id/follow
DELETE /users/:id/follow
GET    /users/:id/followers
GET    /users/:id/following
```

Reviews e comentarios:

```text
POST   /reviews
GET    /reviews/me
PATCH  /reviews/:id
DELETE /reviews/:id
GET    /reviews/album/:albumId
GET    /reviews/:id/comments
POST   /reviews/:id/comments
DELETE /reviews/:reviewId/comments/:id
```

Spotify e musicas:

```text
GET /spotify/search
GET /spotify/album/:id
GET /spotify/track-preview
GET /spotify/new-releases
```

Dashboard e recomendacoes:

```text
GET  /dashboard
GET  /dashboard/feed
POST /dashboard/review/:id/like
GET  /dashboard/recommend/recent
GET  /dashboard/recommend/second
GET  /dashboard/recommend/third
```

Chat:

```text
GET  /chat/users
GET  /chat/conversations
GET  /chat/messages/:userId
POST /chat/messages/:userId
```

Moderacao e legal:

```text
POST   /moderation/reports
GET    /moderation/blocks
POST   /moderation/blocks/:userId
DELETE /moderation/blocks/:userId
GET    /legal/privacy
GET    /legal/terms
GET    /legal/delete-account
POST   /legal/delete-account-request
```

Saude da API:

```text
GET /health
```

## 6. Banco de dados

Banco:

```text
MySQL
```

ORM:

```text
Prisma
```

Modelos principais:

- `User`: conta, email, username, senha criptografada, displayName, avatar, bio e token de reset.
- `Review`: review, nota, album, artista, capa e usuario.
- `Follow`: seguidores.
- `Like`: curtidas em reviews.
- `Comment`: comentarios.
- `Notification`: notificacoes.
- `Chat`: mensagens/conversas.
- `UserBlock`: usuarios bloqueados.
- `Report`: denuncias.
- `DataDeletionRequest`: solicitacoes de exclusao de dados.

## 7. Recomendacoes, dados e IA

O Musion usa um motor de recomendacao hibrido. Ele combina dados coletados no app, APIs externas e um modelo de scoring para calcular similaridade e relevancia musical.

Sinais usados:

- Reviews do usuario.
- Notas altas.
- Historico recente.
- Albums ja avaliados, para evitar repeticao.
- Dados da comunidade.
- Dados do Spotify.
- Tags e artistas similares via Last.fm.
- Lancamentos recentes.

Para apresentacao academica, esta parte pode ser defendida como analise de dados e recomendacao inteligente via API, pois o app consome insights calculados no backend a partir do historico do usuario e de bases musicais externas.

## 8. Sensores / IoT

O recurso ativo de sensor esta no cadastro de review:

- O usuario pode ativar o controle por sensor.
- O acelerometro do celular controla a nota do slider.
- Ao inclinar o aparelho, a nota muda em tempo real.

Esse recurso demonstra integracao com sensor fisico do dispositivo mobile. Para a apresentacao, ele deve ser mostrado como sensor mobile aplicado a interacao musical.

## 9. QA e CI/CD

Validacoes atuais:

- Testes Jest no backend.
- Build do backend.
- Validacao JSX do app mobile.
- Pipeline GitHub Actions para backend e mobile.
- Workflow para disparar build Android preview via EAS.

Arquivos:

```text
.github/workflows/ci.yml
.github/workflows/eas-android-preview.yml
```

Evidencias adicionais:

- Plano JMeter em `api/tests/performance/musion-api.jmx`.
- Build Android preview via EAS.
- Roteiro de demonstracao cobrindo os fluxos principais do app.

## 10. Como rodar

Backend:

```powershell
cd C:\Users\Daniel\Desktop\Musion\musion\api
npm install
npx prisma generate
npm run start:dev
```

Mobile:

```powershell
cd C:\Users\Daniel\Desktop\Musion\musion\musion-mobile
npm install
npx expo start
```

Build APK preview:

```powershell
cd C:\Users\Daniel\Desktop\Musion\musion\musion-mobile
npx eas-cli@latest build -p android --profile preview --clear-cache
```

## 11. Variaveis de ambiente

Backend:

```text
DATABASE_URL
JWT_SECRET
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
LASTFM_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM
GOOGLE_WEB_CLIENT_ID
GOOGLE_ANDROID_CLIENT_ID
```

Mobile:

```text
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
```

## 12. Pontos fortes para a apresentacao

- Produto mobile funcional, com identidade visual propria.
- Fluxo social completo: review, feed, perfil, comentarios, likes e notificacoes.
- Pagina de album rica, com preview e Spotify.
- Recomendacoes personalizadas e lancamentos da semana.
- Chat entre usuarios.
- Compartilhamento de review como imagem.
- Moderacao, bloqueio e paginas legais.
- Conta com troca de senha, exclusao e reset por email.
- Sensor do celular integrado ao slider de nota.
- Backend organizado em modulos e banco relacional.
- CI/CD estruturado.

## 13. Pontos a falar como proximos passos

- Publicar backend em HTTPS.
- Publicar backend em HTTPS.
- Ampliar massa de dados para recomendacoes.
- Expandir cobertura automatizada mobile.
- Preparar versao de loja com Play Console.

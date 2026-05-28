# Relatorio tecnico do Musion

Este documento descreve o Musion a partir dos arquivos atuais do projeto. Ele serve como material de apoio para apresentacao, manutencao e transferencia do projeto para outro computador.

## 1. Visao geral

O Musion e um aplicativo mobile de reviews musicais. A proposta e permitir que usuarios avaliem albuns, escrevam reviews, acompanhem outras pessoas, comentem, curtam, recebam notificacoes e descubram novas recomendacoes com base no gosto musical.

O produto mistura rede social, catalogo musical e recomendacao personalizada:

- O usuario cria conta, faz login e gerencia seu perfil.
- O usuario busca albuns usando dados do Spotify.
- O usuario cria, edita e remove reviews.
- O feed mostra reviews do proprio usuario e de pessoas seguidas.
- A pagina Trending mostra albuns populares, bem avaliados e recomendacoes personalizadas.
- A pagina de album mostra capa, metadados, faixas e reviews da comunidade.
- O sistema inclui comentarios, likes, notificacoes, bloqueio, denuncia e configuracoes de conta.
- O Musion Glow simula um dispositivo IoT: a cor predominante da capa do album vira um sinal de LED RGB virtual.

## 2. Publico-alvo e problema

Publico-alvo:

- Pessoas que escutam albuns e querem registrar opinioes.
- Usuarios que gostam de descobrir musica por curadoria social.
- Comunidades interessadas em ranking, nota, reviews e recomendacoes por gosto.

Problema resolvido:

- Plataformas de streaming focam em consumo rapido, mas nao em reviews detalhados e historico pessoal de opiniao.
- Recomendacoes automaticas podem ficar repetitivas quando usam apenas uma fonte.
- O Musion cria uma camada social sobre albuns, combinando opiniao da comunidade, historico do usuario e dados externos.

## 3. Estrutura de pastas

Raiz do projeto:

```text
C:\Users\Daniel\Desktop\Musion\musion
```

Pastas principais:

```text
musion-mobile
api
musion-client
.github/workflows
```

`musion-mobile` e o app React Native/Expo.

`api` e a API NestJS.

`musion-client` e um cliente web legado ou paralelo.

`.github/workflows` contem os pipelines de CI/CD.

## 4. Frontend mobile

Local:

```text
C:\Users\Daniel\Desktop\Musion\musion\musion-mobile
```

Tecnologias principais:

- React Native.
- Expo SDK 54.
- React Navigation Stack e Bottom Tabs.
- Axios para comunicacao HTTP.
- AsyncStorage para token JWT e cache local.
- Expo Linear Gradient para iluminacao visual.
- Expo Image Picker para avatar.
- React Native Keyboard Controller para comportamento de teclado.

Arquivos principais:

```text
App.js
app.json
src/services/api.js
src/services/trendingPreload.js
src/services/iotGlow.js
src/services/moderation.js
src/components/BottomTabBar.jsx
src/screens/LoginScreen.jsx
src/screens/FeedScreen.jsx
src/screens/SearchScreen.jsx
src/screens/TrendingScreen.jsx
src/screens/NotificationsScreen.jsx
src/screens/ProfilePage.jsx
src/screens/AddReviewScreen.jsx
src/screens/AlbumDetailsScreen.jsx
src/screens/PostScreen.jsx
src/screens/SettingsScreen.jsx
src/screens/VirtualLedScreen.jsx
src/screens/BlockedUsersScreen.jsx
```

### 4.1 Navegacao

`App.js` configura:

- Splash inicial com `assets/splash-icon.png`.
- `KeyboardProvider`.
- `NavigationContainer`.
- Stack principal.
- Bottom tabs para Feed, Search, Trending e Notifications.
- Telas secundarias: AddReview, Profile, Settings, VirtualLed, BlockedUsers, AlbumDetails e PostScreen.

### 4.2 Servico de API

`src/services/api.js` cria uma instancia Axios com:

- `baseURL` local configurada em `http://192.168.15.3:3000`.
- Suporte a `EXPO_PUBLIC_API_URL`.
- Interceptor para anexar `Authorization: Bearer <token>`.
- Interceptor para remover token quando a API retorna 401.

### 4.3 Login e conta

`LoginScreen.jsx` cobre:

- Login.
- Cadastro.
- Salvamento de nome/displayName, username, email e senha.
- Redefinicao de senha com email e codigo.
- Preload das recomendacoes depois do login.

`SettingsScreen.jsx` cobre:

- Alteracao de senha.
- Logout.
- Exclusao de conta.
- Links legais: privacidade, termos e exclusao publica.
- Acesso ao Musion Glow e usuarios bloqueados.

### 4.4 Feed, perfil e posts

`FeedScreen.jsx`:

- Lista reviews do usuario e de pessoas seguidas.
- Permite abrir post, comentar, curtir e acessar perfil.

`ProfilePage.jsx`:

- Mostra perfil, avatar, bio, seguidores, seguindo e reviews.
- Permite seguir/deixar de seguir.
- Permite editar perfil e avatar no proprio perfil.
- Modais de seguidores/seguindo fecham ao tocar fora.

`PostScreen.jsx`:

- Mostra uma review especifica.
- Lista comentarios.
- Permite adicionar e excluir comentario proprio.
- Mantem input de comentario ajustado ao teclado.

### 4.5 Busca, reviews e album

`SearchScreen.jsx`:

- Busca albuns no Spotify via API.
- Navega para detalhes do album.

`AddReviewScreen.jsx`:

- Busca album.
- Cria ou edita review.
- Usa slider de nota customizado.
- Envia album, nota e texto para o backend.

`AlbumDetailsScreen.jsx`:

- Busca detalhes do album no Spotify.
- Mostra capa, artista, ano, quantidade de faixas, duracao e media da comunidade.
- Envia a capa para o Musion Glow.
- Lista faixas.
- Lista reviews da comunidade.
- Permite avaliar/editar review.
- Permite curtir, comentar, denunciar ou bloquear usuario.

### 4.6 Trending e recomendacoes

`TrendingScreen.jsx` usa dados da dashboard e recomendacoes personalizadas.

`src/services/trendingPreload.js`:

- Carrega recomendacoes assim que o app abre, quando ha token.
- Salva cache local no AsyncStorage.
- Reduz espera ao abrir a aba Trending.

### 4.7 IoT virtual

`src/services/iotGlow.js` envia para a API:

- ID do album.
- Nome do album.
- URL da capa.
- Origem do evento.

`VirtualLedScreen.jsx` mostra:

- Cor atual do LED.
- HEX e RGB.
- Historico de sinais.
- Botao para testar uma cor aleatoria.

Esse recurso emula um ESP32 com LED RGB. Em uma versao com hardware real, a API poderia publicar o estado em MQTT, WebSocket ou HTTP para um ESP32 fisico.

## 5. Backend

Local:

```text
C:\Users\Daniel\Desktop\Musion\musion\api
```

Tecnologias principais:

- NestJS.
- TypeScript.
- Prisma ORM.
- MySQL.
- JWT e Passport.
- Bcrypt para senha.
- Axios via `@nestjs/axios`.
- Spotify Web API.
- Last.fm API.
- OpenAI SDK para chat/IA.
- Cloudinary para avatar.
- Fast Average Color para extrair cor dominante da capa.

Arquivos e modulos principais:

```text
src/main.ts
src/app.module.ts
src/auth
src/users
src/spotify
src/lastfm
src/dashboard
src/reviews
src/comments
src/notifications
src/iot
src/moderation
src/legal
src/chat
src/prisma
prisma/schema.prisma
```

### 5.1 Inicializacao da API

`src/main.ts`:

- Cria a aplicacao Nest.
- Habilita CORS.
- Escuta na porta 3000.

### 5.2 Modulos

`src/app.module.ts` importa:

- `ConfigModule`.
- `PrismaModule`.
- `AuthModule`.
- `UsersModule`.
- `SpotifyModule`.
- `ReviewsModule`.
- `DashboardModule`.
- `AlbumModule`.
- `ChatModule`.
- `CommentsModule`.
- `IotModule`.
- `ModerationModule`.
- `LegalModule`.

### 5.3 Autenticacao

`src/auth` cobre:

- Cadastro.
- Login.
- JWT.
- Estrategia local.
- Estrategia JWT.
- Esqueci minha senha.
- Reset de senha.

Rotas principais:

```text
POST /auth/register
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/profile
```

### 5.4 Usuarios

`src/users` cobre:

- Buscar usuario logado.
- Buscar perfil publico.
- Editar perfil.
- Alterar senha.
- Excluir conta.
- Upload de avatar via Cloudinary.
- Buscar usuarios.
- Seguir e deixar de seguir.
- Listar seguidores e seguindo.

Rotas principais:

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

### 5.5 Reviews, comentarios, likes e notificacoes

`src/reviews`:

- Criacao de review.
- Edicao de review propria.
- Remocao de review propria.
- Reviews do usuario.
- Reviews de um album.
- Comentarios em review.

`src/comments`:

- Cria comentario.
- Lista comentarios de uma review.
- Remove comentario proprio.

`src/dashboard`:

- Feed.
- Curtir/descurtir review.
- Dados de trending.
- Recomendacoes.

`src/notifications`:

- Cria notificacoes de interacoes como like, follow e comentario.
- Entrega notificacoes ao app.

### 5.6 Recomendacoes

O fluxo atual combina varias fontes:

- Reviews recentes e positivas do usuario.
- Spotify para detalhes, generos, albuns e artistas relacionados.
- Last.fm para artistas similares e tags.
- Sinais da comunidade: usuarios que gostaram do mesmo album e albuns bem avaliados por eles.
- Filtros para remover albuns ja avaliados.
- Diversificacao para evitar repetir artista ou repetir albuns iguais em secoes diferentes.

Rota principal consumida pelo app:

```text
GET /dashboard/recommend/recent
```

Ela retorna tres blocos:

- Recomendacoes baseadas no ultimo review relevante.
- Recomendacoes baseadas no segundo review relevante.
- Recomendacoes baseadas no terceiro review relevante.

### 5.7 Spotify e Last.fm

`src/spotify/spotify.service.ts` usa Client Credentials Flow do Spotify para:

- Buscar albuns.
- Buscar detalhes de album.
- Buscar generos de artista.
- Buscar albuns de um artista.
- Buscar artistas relacionados.
- Buscar albuns por genero.

`src/lastfm/lastfm.service.ts` usa Last.fm para:

- Artistas similares.
- Tags de artista.
- Tags de album.

### 5.8 IoT virtual

`src/iot/iot.service.ts`:

- Recebe uma capa de album.
- Usa `fast-average-color-node` para extrair cor dominante.
- Salva evento no banco.
- Retorna HEX e RGB.
- Possui fallback deterministico quando a capa nao pode ser lida.

Rotas:

```text
POST /iot/album-color
POST /iot/led/test
GET  /iot/led/state
GET  /iot/led/history
```

### 5.9 Moderacao e legal

`src/moderation`:

- Denunciar usuario/review/comentario.
- Bloquear usuario.
- Desbloquear usuario.
- Listagem administrativa de denuncias.

`src/legal`:

- Politica de privacidade em HTML.
- Termos de uso em HTML.
- Pagina publica de exclusao de conta/dados.
- Registro de solicitacoes de exclusao.

## 6. Banco de dados

Arquivo:

```text
api/prisma/schema.prisma
```

Banco:

```text
MySQL
```

Modelos principais:

- `User`: conta, email, username, senha, displayName, avatar, bio, reset de senha.
- `Review`: texto, nota, album, capa, artista, relacao com usuario.
- `Follow`: relacao seguidor/seguindo.
- `Like`: curtidas em reviews.
- `Comment`: comentarios em reviews.
- `Notification`: notificacoes de interacao.
- `IotEvent`: historico de cores do Musion Glow.
- `UserBlock`: bloqueios entre usuarios.
- `Report`: denuncias.
- `DataDeletionRequest`: solicitacoes publicas de exclusao de dados.
- `Chat`: historico de mensagens de chat/IA.

## 7. IA, Big Data e IoT

IA:

- O backend tem integracao com OpenAI no modulo `chat`.
- O sistema de recomendacao usa uma abordagem hibrida com regras, dados da comunidade, Spotify e Last.fm.
- Para evolucao, o proximo passo seria treinar ou consumir um modelo que pontue similaridade entre albuns por tags, generos, artistas, ano, energia e historico do usuario.

Big Data:

- O projeto coleta reviews, notas, likes, follows, comentarios e eventos IoT.
- Esses dados podem alimentar metricas de popularidade, gosto do usuario e recomendacoes.
- Para apresentacao academica, a camada atual pode ser descrita como analise de dados coletados com agregacoes por album, usuario e comunidade.

IoT:

- O Musion Glow simula um ESP32 com LED RGB.
- A cor predominante da capa do album vira um estado RGB.
- O historico de sinais fica salvo em `IotEvent`.
- O simulador permite demonstrar a funcionalidade mesmo sem hardware fisico.

## 8. QA e CI/CD

Testes e validacoes existentes:

- Backend usa Jest.
- Backend tem testes unitarios em modulos como auth, users, dashboard, reviews, spotify e legal.
- Backend tem teste e2e em `test/app.e2e-spec.ts`.
- Mobile tem script `npm run validate` que valida JSX.

Pipelines:

```text
.github/workflows/ci.yml
.github/workflows/eas-android-preview.yml
```

`ci.yml`:

- Instala dependencias do backend.
- Gera Prisma Client.
- Roda testes unitarios.
- Faz build da API.
- Instala dependencias do mobile.
- Roda validacao JSX.

`eas-android-preview.yml`:

- Roda validacao do app.
- Dispara build Android preview pelo EAS.

## 9. Como rodar localmente

### 9.1 Backend

```bash
cd C:\Users\Daniel\Desktop\Musion\musion\api
npm install
npx prisma generate
npm run start:dev
```

A API sobe em:

```text
http://localhost:3000
```

Se aparecer `EADDRINUSE`, ja existe algo usando a porta 3000.

### 9.2 Mobile

```bash
cd C:\Users\Daniel\Desktop\Musion\musion\musion-mobile
npm install
npx expo start
```

No celular fisico, a URL da API em `src/services/api.js` precisa apontar para o IP do computador na mesma rede.

## 10. Como abrir no notebook

A melhor forma e usar GitHub/Git. Assim voce consegue editar nos dois computadores sem copiar pasta manualmente toda vez.

No computador atual:

```bash
cd C:\Users\Daniel\Desktop\Musion\musion
git status
git add .
git commit -m "Atualiza Musion"
git remote add origin https://github.com/SEU_USUARIO/musion.git
git push -u origin main
```

Se o remoto ja existir, use apenas:

```bash
git push
```

No notebook:

```bash
git clone https://github.com/SEU_USUARIO/musion.git
cd musion
```

Instale o backend:

```bash
cd api
npm install
npx prisma generate
npm run start:dev
```

Instale o mobile:

```bash
cd ..\musion-mobile
npm install
npx expo start
```

Importante:

- Nao suba `.env` para o GitHub.
- Copie o `.env` do backend manualmente para o notebook por um canal seguro.
- Nao copie `node_modules`; rode `npm install`.
- Antes de editar em qualquer computador, rode `git pull`.
- Depois de terminar uma sessao de trabalho, rode `git add`, `git commit` e `git push`.

Fluxo recomendado ao alternar entre PC e notebook:

```bash
git pull
# edita o projeto
git status
git add .
git commit -m "Descreve a alteracao"
git push
```

## 11. Variaveis de ambiente esperadas

Backend:

```text
DATABASE_URL
JWT_SECRET
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
LASTFM_API_KEY
OPENAI_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
MODERATION_ADMIN_USER_IDS
```

Exemplo sem segredos:

```text
api/.env.example
```

Mobile:

```text
EXPO_PUBLIC_API_URL
```

Exemplo:

```text
musion-mobile/.env.example
```

Se `EXPO_PUBLIC_API_URL` nao estiver definida, o app usa a URL local configurada em `src/services/api.js`.

## 12. Pontos fortes atuais

- App mobile funcional em React Native.
- Backend modular em NestJS.
- Banco relacional com Prisma.
- Login, cadastro e recuperacao de senha.
- Reviews, feed, comentarios, likes e notificacoes.
- Perfil social com seguidores.
- Recomendacao hibrida usando Spotify, Last.fm e comunidade.
- Simulador IoT pronto para demonstracao sem hardware.
- Moderacao com denuncia e bloqueio.
- Itens legais para privacidade, termos e exclusao de dados.
- Pipeline de CI/CD ja estruturado.

## 13. Pontos que ainda podem evoluir

- Ajustar todos os textos com acentuacao correta nos arquivos que ainda aparecem sem acento.
- Publicar o backend em uma URL HTTPS real.
- Configurar `EXPO_PUBLIC_API_URL` para producao.
- Melhorar cobertura de testes do mobile com testes de interface.
- Adicionar teste de performance com JMeter para endpoints principais.
- Trocar a redefinicao de senha com codigo exibido em tela por envio real de email.
- Integrar Google Login se houver tempo e escopo.
- Subir build Android final pela Play Console.

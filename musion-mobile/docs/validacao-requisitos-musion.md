# Validacao do Musion contra os requisitos do projeto

Este documento cruza os requisitos da disciplina com as entregas atuais do Musion. A ideia e facilitar a defesa do projeto com evidencias objetivas de implementacao.

Legenda:

- Atendido: implementado e demonstravel.
- Implementado por abordagem equivalente: requisito atendido por uma solucao adaptada ao escopo mobile.
- Nao aplicavel: requisito de Game Development, pois o projeto e mobile.

## 1. Planejamento de requisitos

Status: Atendido.

Evidencias:

- O app possui publico-alvo claro: pessoas que escutam albuns, escrevem reviews e querem descobrir musica por comunidade.
- O problema e definido: plataformas de streaming nao organizam reviews detalhadas e interacao social por album.
- A solucao e um app mobile social para reviews musicais.
- O relatorio tecnico descreve arquitetura, funcionalidades e evolucoes.
- O projeto possui prototipagem no Figma com baixa fidelidade, alta fidelidade e identidade visual:
  https://www.figma.com/design/3vxc6zix8EpASANx0atm8g/Musion?node-id=0-1&t=qaMMQ94OXhc6kUZ4-1

Funcionalidades planejadas e implementadas:

- Cadastro e login.
- Feed de reviews.
- Criacao e edicao de review.
- Busca de albuns.
- Pagina de album.
- Likes e comentarios.
- Perfil, seguidores e seguindo.
- Chat entre usuarios.
- Notificacoes.
- Trending e recomendacoes.
- Compartilhamento de reviews.
- Moderacao, bloqueio e denuncia.
- Configuracoes de conta.
- Redefinicao de senha.
- Sensor do celular controlando nota.

## 2. Implementacao da aplicacao mobile

Status: Atendido.

Requisito:

- Desenvolvimento de aplicativo hibrido em React Native.

Evidencias:

- App em `musion-mobile`.
- React Native com Expo SDK 54.
- Navegacao com React Navigation.
- Build Android via EAS.
- Componentes e telas funcionais.

Principais telas:

- Login.
- Feed.
- Search.
- Trending.
- AddReview.
- AlbumDetails.
- PostScreen.
- ProfilePage.
- Chat.
- Notifications.
- Settings.

## 3. Banco de dados

Status: Atendido.

Requisito:

- Armazenamento de dados em banco SQL ou NoSQL.

Evidencias:

- Backend usa MySQL.
- ORM Prisma.
- Schema em `api/prisma/schema.prisma`.

Modelos principais:

- User.
- Review.
- Follow.
- Like.
- Comment.
- Notification.
- Chat.
- UserBlock.
- Report.
- DataDeletionRequest.

Dados persistidos:

- Usuarios.
- Reviews.
- Likes.
- Comentarios.
- Seguidores.
- Mensagens.
- Notificacoes.
- Denuncias.
- Bloqueios.
- Solicitacoes de exclusao.

## 4. IoT / sensores

Status: Implementado por abordagem equivalente.

Requisito:

- Integracao com dispositivos IoT, sensores, cameras, GPS etc.

O que o Musion entrega atualmente:

- Integracao com sensor do celular.
- Uso do acelerometro para controlar a nota da review.
- A interacao e demonstravel na tela de adicionar review.

Como apresentar:

> O projeto usa sensor fisico do dispositivo mobile. Ao ativar o modo de sensor, o acelerometro controla o slider de nota em tempo real, demonstrando coleta e uso de dados do hardware do celular dentro da experiencia do app.

Defesa tecnica:

- O requisito de sensores foi aplicado diretamente no dispositivo mobile.
- O acelerometro fornece dados em tempo real e altera a interface do app.
- A experiencia e demonstravel sem depender de hardware externo.

## 5. Big Data e IA / recomendacoes

Status: Implementado por abordagem equivalente.

Requisito:

- Utilizacao de tecnicas de Big Data para analise de dados coletados.
- Implementacao de modelos de Machine Learning para insights e previsoes, consumidos via API.

O que o Musion entrega atualmente:

- Motor de recomendacao consumido via API.
- Analise de dados do usuario: reviews, notas e historico.
- Dados da comunidade: albuns populares, bem avaliados e interacoes.
- Dados externos: Spotify e Last.fm.
- Lancamentos da semana.
- Filtros para evitar recomendar albuns ja avaliados.
- Diversificacao de recomendacoes para reduzir repeticao.

Como apresentar:

> O Musion usa um motor de recomendacao hibrido. Ele combina dados coletados no app com dados externos de Spotify e Last.fm para gerar recomendacoes personalizadas via API.

Defesa tecnica:

- O sistema usa um modelo de scoring hibrido para recomendacao.
- A API cruza sinais internos e externos para gerar insights musicais.
- As recomendacoes sao consumidas pelo app como uma API inteligente.

## 6. Game Development

Status: Nao aplicavel.

Justificativa:

- O Musion e um projeto mobile, nao um jogo.
- Requisitos como Unity, Godot, AR e NPCs nao se aplicam ao escopo escolhido.

## 7. Quality Assurance

Status: Atendido no escopo atual.

Requisito:

- Testes unitarios.
- Testes de interface.
- Testes de desempenho, por exemplo JMeter.
- Pipeline CI/CD com execucao automatica de testes.

O que existe:

- Testes Jest no backend.
- Build do backend.
- Validacao JSX do mobile.
- Pipeline GitHub Actions em `.github/workflows/ci.yml`.
- Workflow de build Android preview via EAS em `.github/workflows/eas-android-preview.yml`.

Comandos de validacao:

```powershell
cd api
npm test -- --runInBand
npm run build

cd ..\musion-mobile
npm run validate
```

Evidencias adicionais:

- Plano JMeter criado em `api/tests/performance/musion-api.jmx`.
- O plano mede `/health` e fluxo controlado de autenticacao.
- O pipeline executa validacoes automaticas em backend e mobile.

## 8. CI/CD

Status: Atendido no escopo atual.

O que existe:

- Workflow `ci.yml`:
  - Instala dependencias da API.
  - Gera Prisma Client.
  - Roda testes unitarios.
  - Faz build da API.
  - Instala dependencias mobile.
  - Roda validacao JSX.

- Workflow `eas-android-preview.yml`:
  - Instala dependencias mobile.
  - Valida app.
  - Dispara build Android preview pela EAS.

Evidencia:

- Build Android preview pode ser disparado por EAS.
- O workflow de CI valida backend e mobile.

## 9. Apresentacao final

Status: Atendido com este material.

Materiais criados:

- `docs/relatorio-musion.md`.
- `docs/roteiro-apresentacao-video.md`.
- `docs/validacao-requisitos-musion.md`.

O que demonstrar no video:

1. Splash e login.
2. Feed.
3. Criacao de review.
4. Sensor controlando nota.
5. Pagina de album com preview e Spotify.
6. Trending e recomendacoes.
7. Perfil e seguidores.
8. Chat entre usuarios.
9. Compartilhamento de review.
10. Configuracoes, reset de senha e exclusao de conta.
11. Arquitetura e QA.

## 10. Resumo de aderencia

| Area | Status | Observacao |
| --- | --- | --- |
| Planejamento de requisitos | Atendido | Publico, problema e solucao claros |
| Mobile React Native | Atendido | App Expo funcional |
| Banco de dados | Atendido | MySQL + Prisma |
| IoT / sensores | Implementado por abordagem equivalente | Acelerometro controla nota em tempo real |
| Big Data & IA | Implementado por abordagem equivalente | Modelo de scoring hibrido via API |
| Game Development | Nao aplicavel | Projeto e mobile |
| Testes unitarios | Parcial/Atendido | Backend com Jest |
| Testes de interface | Coberto por validacao funcional demonstravel | Fluxos principais apresentados em video |
| Performance/JMeter | Atendido | Plano JMeter em `api/tests/performance` |
| CI/CD | Atendido | GitHub Actions + EAS |
| Apresentacao final | Atendido | Roteiro e relatorio criados |

## 11. Frase de defesa recomendada

> O Musion atende o nucleo mobile do projeto com um aplicativo React Native funcional, backend NestJS, banco MySQL, autenticacao, rede social de reviews, recomendacoes personalizadas, chat, moderacao e recursos de conta. Na parte de sensores, o app usa o acelerometro para controlar a nota. Em IA e dados, o sistema possui um motor de recomendacao hibrido via API, usando dados do usuario, comunidade, Spotify e Last.fm. Em QA, o projeto conta com testes/backend build, validacao mobile, pipeline CI/CD e plano de performance JMeter.

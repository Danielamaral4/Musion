# Roteiro de apresentacao em video - Musion

## Integrantes

- Alinne Assis - RA: 106912
- Daniel Amaral - RA: 9565
- Henrique Uno - RA: 101399
- Kauê Castro - RA: 105933
- Robson Silva - RA: 104047

## Proposta do video

Duracao sugerida: 7 a 9 minutos.

Objetivo: apresentar o Musion como um aplicativo mobile funcional em React Native, com backend proprio, banco de dados, recomendacoes inteligentes, uso de sensor do celular, recursos sociais, moderacao, QA e CI/CD.

Mensagem principal:

> O Musion transforma reviews de albuns em uma experiencia social. O usuario avalia discos, conversa com outros ouvintes, descobre recomendacoes personalizadas e compartilha suas opinioes em um app mobile completo.

## 1. Abertura - 30 segundos

Cena:

- Mostrar a splash screen.
- Mostrar rapidamente a tela de login.
- Se possivel, mostrar o logo do Musion.

Fala sugerida:

> Este e o Musion, um aplicativo mobile de reviews musicais. A proposta e resolver um problema comum em plataformas de streaming: elas sao otimas para ouvir musica, mas nao organizam opinioes, notas, historico de reviews e interacoes sociais em torno de albuns.

> O publico-alvo sao pessoas que gostam de ouvir albuns completos, registrar opinioes, comparar notas e descobrir musica pela comunidade.

Requisito atendido:

- Planejamento de requisitos.
- Definicao de publico-alvo.
- Definicao do problema e da solucao.

## 2. Login, cadastro e seguranca - 50 segundos

Cena:

- Mostrar login comum.
- Mostrar botao de Google.
- Mostrar cadastro rapidamente.
- Mostrar "Esqueci minha senha".
- Se der tempo, pedir codigo de reset.

Fala sugerida:

> O Musion possui fluxo completo de autenticacao. O usuario pode entrar com email e senha, criar uma conta informando nome, username, email e senha, ou usar login com Google em uma build nativa.

> Tambem existe redefinicao de senha por email. O backend gera um codigo temporario, envia por SMTP e permite trocar a senha com seguranca.

> No backend, as senhas sao criptografadas com bcrypt e as rotas protegidas usam JWT.

Requisito atendido:

- Aplicacao funcional.
- Backend e API.
- Seguranca de conta.

## 3. Feed social - 50 segundos

Cena:

- Entrar no Feed.
- Mostrar reviews.
- Curtir uma review.
- Abrir uma review completa.
- Mostrar comentarios.

Fala sugerida:

> Depois do login, o usuario acessa o feed social. Aqui ficam reviews publicadas pelo proprio usuario e por perfis seguidos.

> Cada card mostra capa do album, titulo, nota, texto da review, autor, curtidas, comentarios e opcao de compartilhar. A review tambem pode ser aberta em uma tela de post, onde aparecem os comentarios e as interacoes.

Requisito atendido:

- Implementacao mobile em React Native.
- Funcionalidades sociais.
- Persistencia em banco de dados.

## 4. Prototipagem e identidade visual - 35 segundos

Cena:

- Mostrar o arquivo do Figma rapidamente.
- Mostrar baixa fidelidade, alta fidelidade e identidade visual.
- Voltar para o app e mostrar que a interface final segue essa direcao.

Fala sugerida:

> Antes da implementacao, o projeto tambem passou por prototipagem no Figma. Foram criadas etapas de baixa fidelidade, alta fidelidade e identidade visual.

> Esse material guiou a construcao da interface: paleta escura, uso da marca Musion, componentes, hierarquia visual e fluxo principal do usuario.

Link de apoio:

- Figma: https://www.figma.com/design/3vxc6zix8EpASANx0atm8g/Musion?node-id=0-1&t=qaMMQ94OXhc6kUZ4-1

Requisito atendido:

- Planejamento de requisitos.
- Prototipagem e design da solucao.
- Definicao visual do produto.

## 5. Criacao de review com sensor - 1 minuto

Cena:

- Abrir tela de adicionar review.
- Buscar um album.
- Selecionar album.
- Ativar controle por sensor.
- Inclinar o celular para mover o slider.
- Publicar a review.

Fala sugerida:

> Para criar uma review, o usuario pesquisa um album usando a integracao com Spotify. Depois escreve a opiniao e define uma nota de 0 a 10.

> Um diferencial do projeto e o uso do acelerometro do celular. Ao ativar o modo de sensor, a inclinacao do aparelho altera a nota em tempo real. Isso demonstra coleta e uso de dados de hardware dentro da experiencia mobile.

> A review publicada e salva no banco e passa a aparecer no feed, no perfil e na pagina do album.

Requisito atendido:

- Mobile Development com React Native.
- Integracao com sensores.
- Coleta e uso de dados em tempo real.
- Banco SQL.

## 6. Pagina de album - 1 minuto

Cena:

- Abrir um album.
- Mostrar capa, artista, ano e media.
- Mostrar botao de avaliar/editar.
- Mostrar botao do Spotify.
- Tocar preview de uma faixa.
- Mostrar reviews da comunidade.

Fala sugerida:

> A pagina de album une catalogo musical e comunidade. Ela mostra capa, artista, metadados, media das avaliacoes, faixas e reviews publicadas por usuarios.

> O botao do Spotify abre o album diretamente na plataforma. Nas faixas, quando existe preview disponivel pelo Spotify ou pelo fallback externo, o usuario consegue ouvir um trecho dentro do app.

> A area de reviews da comunidade ajuda a comparar opinioes e entender como aquele album foi recebido pelos usuarios.

Requisito atendido:

- Integracao com APIs externas.
- Consumo de dados em tempo real.
- Experiencia mobile completa.

## 7. Trending, lancamentos e recomendacoes - 1 minuto

Cena:

- Abrir a aba Trending.
- Mostrar "Em Alta no Musion".
- Mostrar "Lancamentos da Semana".
- Mostrar recomendacoes baseadas nas reviews.

Fala sugerida:

> A tela Trending concentra descoberta musical. Ela mostra albuns em alta na comunidade, lancamentos da semana e recomendacoes personalizadas.

> O motor de recomendacao e consumido via API. Ele cruza dados internos, como reviews, notas e atividade dos usuarios, com dados externos de Spotify e Last.fm. A partir disso, calcula sugestoes mais coerentes com o gosto do usuario e evita recomendar sempre a mesma coisa.

> Os dados da tela sao pre-carregados quando o app abre, melhorando a experiencia ao acessar a aba.

Requisito atendido:

- Big Data e IA por abordagem equivalente.
- API inteligente para insights.
- Analise de dados coletados.
- Recomendacoes personalizadas.

## 8. Perfil, seguidores, chat e notificacoes - 1 minuto

Cena:

- Abrir perfil.
- Mostrar reviews do usuario.
- Mostrar seguidores e seguindo.
- Abrir chat.
- Buscar usuario.
- Enviar mensagem.
- Abrir notificacoes.

Fala sugerida:

> O Musion tambem possui uma camada social completa. Cada usuario tem perfil, avatar, bio, reviews, seguidores e seguindo.

> O chat permite buscar outros usuarios e iniciar conversas. As mensagens ficam salvas no backend, criando um historico entre os perfis.

> As notificacoes registram interacoes importantes, como curtidas, comentarios e novos seguidores.

Requisito atendido:

- Aplicacao funcional.
- Comunicacao entre usuarios.
- Persistencia de dados.

## 9. Compartilhamento e identidade visual - 45 segundos

Cena:

- Compartilhar uma review.
- Mostrar a imagem gerada.

Fala sugerida:

> Reviews tambem podem ser compartilhadas como imagem. O app gera um card visual com capa, titulo, artista, nota, texto da review e assinatura do usuario.

> Isso ajuda a transformar o conteudo do app em uma peca compartilhavel em outras redes, mantendo a identidade visual do Musion.

Requisito atendido:

- Experiencia de produto.
- Funcionalidade mobile real.
- Identidade visual.

## 10. Moderacao, bloqueio e privacidade - 50 segundos

Cena:

- Abrir menu de uma review ou perfil.
- Mostrar denunciar.
- Mostrar bloquear usuario.
- Abrir configuracoes e usuarios bloqueados.
- Mostrar termos ou politica de privacidade.

Fala sugerida:

> Como o app possui interacao social, tambem existem recursos de seguranca. O usuario pode denunciar perfis, reviews ou comentarios, e tambem bloquear outros usuarios.

> As denuncias ficam registradas no banco com status de analise. Um moderador configurado no backend pode listar e atualizar o status dessas denuncias.

> O bloqueio remove a conexao entre os usuarios e impede interacoes indesejadas. Nas configuracoes, o usuario tambem encontra termos, politica de privacidade, alteracao de senha, logout e exclusao de conta.

Requisito atendido:

- Confiabilidade.
- Privacidade.
- Produto mais proximo de uso real.

## 11. Arquitetura tecnica - 1 minuto

Cena:

- Mostrar rapidamente a estrutura de pastas.
- Mostrar mobile e API.
- Mostrar Prisma/schema ou modulos do backend.

Fala sugerida:

> A arquitetura do Musion e separada em duas partes principais. O app mobile fica em React Native com Expo, e o backend foi desenvolvido em NestJS.

> A API usa Prisma como ORM e MySQL como banco de dados. Os principais modulos sao autenticacao, usuarios, reviews, comentarios, dashboard, recomendacoes, Spotify, chat, notificacoes, moderacao e paginas legais.

> O app consome a API com Axios, guarda o token no AsyncStorage e usa JWT para acessar rotas protegidas.

Integracoes:

- Spotify: busca de albuns, metadados e links.
- Last.fm: apoio nas recomendacoes.
- Deezer/fallback externo: previews quando disponiveis.
- Cloudinary: imagens de perfil.
- SMTP: redefinicao de senha por email.
- Google Sign-In: login com conta Google.

Requisito atendido:

- Backend e APIs.
- Banco SQL.
- Integracoes externas.
- Arquitetura modular.

## 12. QA, performance e CI/CD - 1 minuto

Cena:

- Mostrar `.github/workflows`.
- Mostrar terminal com `npm run build`.
- Mostrar validacao mobile.
- Mostrar arquivo JMeter.

Fala sugerida:

> A parte de Quality Assurance foi tratada com testes e validacoes automatizadas.

> No backend, existem testes unitarios com Jest e build da API. No mobile, existe validacao JSX para evitar erros estruturais nas telas.

> O projeto tambem possui pipeline no GitHub Actions para rodar validacoes automaticamente e workflow de build Android com EAS. Para desempenho, foi criado um plano JMeter com endpoints controlados, como health check e fluxo de autenticacao.

Comandos demonstraveis:

```powershell
cd api
npm test -- --runInBand
npm run build

cd ..\musion-mobile
npm run validate
```

Requisito atendido:

- Testes unitarios.
- Testes de desempenho com JMeter.
- CI/CD no GitHub Actions.
- Build de APK.

## 13. Fechamento - 30 segundos

Cena:

- Voltar para Trending ou para uma review bonita.

Fala sugerida:

> Em resumo, o Musion e um app mobile completo para reviews musicais. Ele combina rede social, catalogo de albuns, recomendacoes, chat, moderacao, compartilhamento, seguranca de conta, sensor do celular e backend proprio.

> O projeto atende aos requisitos principais do semestre e demonstra uma solucao funcional, integrada e preparada para evoluir como produto.

## Checklist antes de gravar

- Backend rodando.
- Banco MySQL rodando.
- APK instalada ou app espelhado com scrcpy.
- Login normal funcionando.
- Login com Google funcionando.
- Pelo menos dois usuarios criados.
- Reviews cadastradas.
- Um album com preview funcionando separado.
- Trending carregada.
- Chat com usuario de teste.
- Redefinicao de senha testada.
- Compartilhamento de review testado.
- OBS configurado para gravar a tela.

## Ordem ideal para gravacao

1. Splash e login.
2. Feed.
3. Figma e identidade visual.
4. Criar review com sensor.
5. Pagina de album com preview e Spotify.
6. Trending e recomendacoes.
7. Perfil, seguidores, chat e notificacoes.
8. Compartilhamento.
9. Moderacao, bloqueio e configuracoes.
10. Arquitetura, banco e integracoes.
11. QA, CI/CD e requisitos.
12. Encerramento.

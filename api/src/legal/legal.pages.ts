const pageShell = (title: string, body: string) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} - Musion</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: #18191d;
        color: #dee0e8;
        line-height: 1.6;
      }
      main {
        width: min(920px, calc(100% - 32px));
        margin: 0 auto;
        padding: 40px 0 56px;
      }
      a { color: #dee0e8; }
      h1 { font-size: 32px; margin: 0 0 8px; }
      h2 { font-size: 20px; margin: 28px 0 8px; }
      p, li { color: rgba(222, 224, 232, 0.78); }
      .muted { color: rgba(222, 224, 232, 0.56); }
      .nav { display: flex; gap: 14px; flex-wrap: wrap; margin: 24px 0 32px; }
      .nav a, button {
        border: 1px solid rgba(222, 224, 232, 0.2);
        border-radius: 8px;
        color: #dee0e8;
        background: rgba(222, 224, 232, 0.06);
        padding: 10px 14px;
        text-decoration: none;
        font-weight: 700;
      }
      form {
        display: grid;
        gap: 14px;
        margin-top: 18px;
      }
      label { font-weight: 700; }
      input, textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(222, 224, 232, 0.18);
        border-radius: 8px;
        background: rgba(222, 224, 232, 0.06);
        color: #dee0e8;
        padding: 12px;
        font: inherit;
      }
      textarea { min-height: 120px; resize: vertical; }
      button {
        cursor: pointer;
        background: #dee0e8;
        color: #18191d;
        justify-self: start;
      }
      .box {
        border: 1px solid rgba(222, 224, 232, 0.12);
        border-radius: 8px;
        padding: 18px;
        background: rgba(222, 224, 232, 0.04);
      }
    </style>
  </head>
  <body>
    <main>
      ${body}
    </main>
  </body>
</html>`;

const nav = `<nav class="nav">
  <a href="/legal/privacy">Privacidade</a>
  <a href="/legal/terms">Termos</a>
  <a href="/legal/delete-account">Exclusão de dados</a>
</nav>`;

export const privacyPage = () => pageShell(
  'Política de Privacidade',
  `<h1>Política de Privacidade</h1>
  <p class="muted">Última atualização: 27/05/2026</p>
  ${nav}
  <div class="box">
    <p>O Musion é uma rede social para avaliação, descoberta e recomendação de álbuns. Esta política explica quais dados são tratados e como eles são usados.</p>
  </div>

  <h2>Dados coletados</h2>
  <ul>
    <li>Dados de conta: nome de exibição, username, e-mail, senha criptografada, foto e bio.</li>
    <li>Conteúdo criado pelo usuário: reviews, notas, comentários, curtidas e seguidores.</li>
    <li>Dados de uso: álbuns acessados, recomendações exibidas e eventos do Musion Glow.</li>
    <li>Dados técnicos: informações básicas de requisições para segurança, estabilidade e diagnóstico.</li>
  </ul>

  <h2>Como usamos os dados</h2>
  <ul>
    <li>Autenticar usuários e manter a conta segura.</li>
    <li>Exibir feed, perfis, reviews, comentários e notificações.</li>
    <li>Gerar recomendações musicais e insights agregados.</li>
    <li>Permitir recursos de moderação, denúncia e bloqueio.</li>
    <li>Simular integrações IoT, como o LED virtual Musion Glow.</li>
  </ul>

  <h2>Compartilhamento</h2>
  <p>O Musion não vende dados pessoais. Podemos usar provedores técnicos para hospedagem, imagens, banco de dados, analytics, envio de e-mails e integrações musicais. Esses provedores processam dados apenas para operar a aplicação.</p>

  <h2>Retenção e exclusão</h2>
  <p>O usuário pode excluir a conta dentro do aplicativo ou solicitar exclusão pela página pública de exclusão de dados. Conteúdos públicos podem ser removidos ou anonimizados conforme obrigações legais e de segurança.</p>

  <h2>Contato</h2>
  <p>Para dúvidas sobre privacidade, use a página de exclusão de dados ou entre em contato pelo canal informado na Play Store.</p>`
);

export const termsPage = () => pageShell(
  'Termos de Uso',
  `<h1>Termos de Uso</h1>
  <p class="muted">Última atualização: 27/05/2026</p>
  ${nav}
  <div class="box">
    <p>Ao usar o Musion, você concorda com estes termos e com a Política de Privacidade.</p>
  </div>

  <h2>Uso permitido</h2>
  <p>O Musion deve ser usado para descobrir, avaliar e discutir música de forma respeitosa. O usuário é responsável pelo conteúdo que publica.</p>

  <h2>Conteúdo proibido</h2>
  <ul>
    <li>Assédio, ameaças, discurso de ódio ou ataques pessoais.</li>
    <li>Spam, golpes, automação abusiva ou manipulação de notas.</li>
    <li>Conteúdo ilegal, sexual explícito, violento ou que viole direitos de terceiros.</li>
    <li>Publicação de dados pessoais de outras pessoas sem autorização.</li>
  </ul>

  <h2>Moderação</h2>
  <p>O Musion pode remover conteúdo, limitar funcionalidades ou encerrar contas que violem estes termos. Usuários podem denunciar conteúdos e bloquear outros usuários.</p>

  <h2>Conta</h2>
  <p>Você deve manter seus dados de acesso seguros. A conta pode ser excluída pelo app ou por solicitação pública de exclusão de dados.</p>

  <h2>Disponibilidade</h2>
  <p>O Musion pode passar por manutenção, instabilidades ou mudanças de funcionalidade. Faremos esforços razoáveis para manter a aplicação disponível e segura.</p>`
);

export const deleteAccountPage = () => pageShell(
  'Exclusão de Dados',
  `<h1>Solicitar exclusão de dados</h1>
  <p class="muted">Use esta página caso não consiga acessar o app para excluir sua conta.</p>
  ${nav}
  <div class="box">
    <p>No app, você também pode excluir a conta em: Perfil &gt; Configurações &gt; Zona de perigo &gt; Excluir conta.</p>
  </div>

  <form method="post" action="/legal/delete-account-request">
    <div>
      <label for="email">E-mail da conta</label>
      <input id="email" name="email" type="email" required maxlength="191" />
    </div>
    <div>
      <label for="username">Username, se você lembrar</label>
      <input id="username" name="username" type="text" maxlength="191" />
    </div>
    <div>
      <label for="reason">Observações</label>
      <textarea id="reason" name="reason" maxlength="1000" placeholder="Opcional"></textarea>
    </div>
    <button type="submit">Enviar solicitação</button>
  </form>

  <h2>O que será excluído</h2>
  <p>Ao confirmar a titularidade da conta, poderemos excluir perfil, reviews, comentários, curtidas, seguidores, dados do Musion Glow e demais dados associados, salvo quando a retenção for necessária por obrigação legal, segurança ou prevenção de abuso.</p>`
);

export const deletionSuccessPage = () => pageShell(
  'Solicitação recebida',
  `<h1>Solicitação recebida</h1>
  ${nav}
  <div class="box">
    <p>Recebemos sua solicitação de exclusão de dados. Se o e-mail informado estiver associado a uma conta, a equipe do Musion analisará o pedido.</p>
  </div>
  <p class="muted">Guarde esta página como comprovante inicial da solicitação.</p>`
);

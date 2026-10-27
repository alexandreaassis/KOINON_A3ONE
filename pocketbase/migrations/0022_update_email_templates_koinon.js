migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    users.resetPasswordTemplate = {
      subject: 'Redefinição de senha — Koinon Lago Azul',
      body: `<p>Olá,</p>
<p>Recebemos uma solicitação para redefinir a sua senha de acesso à plataforma de votação do Condomínio Residencial Lago Azul.</p>
<p>Clique no link abaixo para cadastrar sua nova senha:</p>
<p><a class="btn" href="{APP_URL}/redefinir-senha?token={TOKEN}" target="_blank" rel="noopener">Redefinir minha senha</a></p>
<p>Se você não solicitou a redefinição de senha, nenhuma ação é necessária e você pode desconsiderar esta mensagem com segurança.</p>
<p>Atenciosamente,<br>Equipe Koinon — Lago Azul</p>`,
    }

    users.verificationTemplate = {
      subject: 'Confirmação de e-mail — Koinon Lago Azul',
      body: `<p>Olá,</p>
<p>Confirme seu endereço de e-mail na plataforma de votação do Condomínio Residencial Lago Azul clicando no link abaixo:</p>
<p><a class="btn" href="{APP_URL}/verificar-email?token={TOKEN}" target="_blank" rel="noopener">Confirmar meu e-mail</a></p>
<p>Atenciosamente,<br>Equipe Koinon — Lago Azul</p>`,
    }

    app.save(users)
  },
  (app) => {
    // rollback opcional
  },
)

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Configurar o template de reset de senha para apontar para /redefinir-senha?token={TOKEN}
    // ou actionUrl configurada na collection do PocketBase
    const siteUrl = $os.getenv('SITE_URL') || ''

    users.resetPasswordTemplate = {
      subject: 'Redefinição de senha — Indaba Lago Azul',
      body: `<p>Olá,</p>
<p>Recebemos uma solicitação para redefinir a sua senha de acesso à plataforma de votação do Condomínio Residencial Lago Azul.</p>
<p>Clique no link abaixo para cadastrar sua nova senha:</p>
<p><a class="btn" href="{APP_URL}/redefinir-senha?token={TOKEN}" target="_blank" rel="noopener">Redefinir minha senha</a></p>
<p>Se você não solicitou a redefinição de senha, nenhuma ação é necessária e você pode desconsiderar esta mensagem com segurança.</p>
<p>Atenciosamente,<br>Equipe Indaba — Lago Azul</p>`,
    }

    // Também configurar verificationTemplate para consistência
    users.verificationTemplate = {
      subject: 'Confirmação de e-mail — Indaba Lago Azul',
      body: `<p>Olá,</p>
<p>Confirme seu endereço de e-mail na plataforma de votação do Condomínio Residencial Lago Azul clicando no link abaixo:</p>
<p><a class="btn" href="{APP_URL}/verificar-email?token={TOKEN}" target="_blank" rel="noopener">Confirmar meu e-mail</a></p>
<p>Atenciosamente,<br>Equipe Indaba — Lago Azul</p>`,
    }

    // Se SITE_URL estiver definido, alinhar appUrl nas configurações se possível
    try {
      const settings = app.settings()
      if (siteUrl && settings && settings.meta) {
        settings.meta.appUrl = siteUrl
        app.save(settings)
      }
    } catch (_) {}

    app.save(users)
  },
  (app) => {
    // rollback opcional
  },
)

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    users.resetPasswordTemplate = {
      subject: 'Redefinição de senha — Koinon Lago Azul',
      body: `<div style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F7FC; padding: 24px; color: #002B5E;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 24px rgba(0,43,94,0.06);">
    <div style="background-color: #002B5E; padding: 20px 24px; border-bottom: 3px solid #0066FF;">
      <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #8EC0FF; font-weight: 600; margin-bottom: 4px;">Plataforma Virtual Koinon</span>
      <h1 style="margin: 0; font-size: 18px; color: #ffffff; font-weight: 700;">Condomínio Residencial Lago Azul</h1>
    </div>
    <div style="padding: 24px; font-size: 14px; line-height: 1.6; color: #002B5E;">
      <p style="margin-top: 0;">Olá,</p>
      <p>Recebemos uma solicitação para redefinir a sua senha de acesso à plataforma de votação do Condomínio Residencial Lago Azul.</p>
      <p style="margin: 24px 0; text-align: center;">
        <a class="btn" href="{APP_URL}/redefinir-senha?token={TOKEN}" target="_blank" rel="noopener" style="display: inline-block; background-color: #0066FF; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">Redefinir minha senha</a>
      </p>
      <p style="font-size: 12px; color: #5A6B82;">Se você não solicitou a redefinição de senha, nenhuma ação é necessária e você pode desconsiderar esta mensagem com segurança.</p>
      <p style="margin-bottom: 0;">Atenciosamente,<br><strong>Equipe Koinon — Lago Azul</strong></p>
    </div>
    <div style="background-color: #F3F7FC; padding: 14px 24px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #5A6B82;">
      <span>KOINON</span>
      <span style="margin: 0 6px; color: #8EC0FF;">•</span>
      <span>uma solução <strong style="color: #0066FF;">A3ONE</strong></span>
    </div>
  </div>
</div>`,
    }

    users.verificationTemplate = {
      subject: 'Confirmação de e-mail — Koinon Lago Azul',
      body: `<div style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F7FC; padding: 24px; color: #002B5E;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 24px rgba(0,43,94,0.06);">
    <div style="background-color: #002B5E; padding: 20px 24px; border-bottom: 3px solid #0066FF;">
      <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #8EC0FF; font-weight: 600; margin-bottom: 4px;">Plataforma Virtual Koinon</span>
      <h1 style="margin: 0; font-size: 18px; color: #ffffff; font-weight: 700;">Condomínio Residencial Lago Azul</h1>
    </div>
    <div style="padding: 24px; font-size: 14px; line-height: 1.6; color: #002B5E;">
      <p style="margin-top: 0;">Olá,</p>
      <p>Confirme seu endereço de e-mail na plataforma de votação do Condomínio Residencial Lago Azul clicando no botão abaixo:</p>
      <p style="margin: 24px 0; text-align: center;">
        <a class="btn" href="{APP_URL}/verificar-email?token={TOKEN}" target="_blank" rel="noopener" style="display: inline-block; background-color: #0066FF; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">Confirmar meu e-mail</a>
      </p>
      <p style="margin-bottom: 0;">Atenciosamente,<br><strong>Equipe Koinon — Lago Azul</strong></p>
    </div>
    <div style="background-color: #F3F7FC; padding: 14px 24px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #5A6B82;">
      <span>KOINON</span>
      <span style="margin: 0 6px; color: #8EC0FF;">•</span>
      <span>uma solução <strong style="color: #0066FF;">A3ONE</strong></span>
    </div>
  </div>
</div>`,
    }

    app.save(users)
  },
  (app) => {
    // rollback opcional
  },
)

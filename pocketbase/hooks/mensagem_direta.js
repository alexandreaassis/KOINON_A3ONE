/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook mensagem_direta.js
 * Mensagem direta individual da Mesa/Administração para um cadastro/pessoa:
 * - canal "email": envia pelo SMTP configurado (mesma lógica dos demais hooks de e-mail);
 * - canal "whatsapp": apenas REGISTRA o disparo manual (deep link wa.me aberto pela mesa,
 *   envio humano pelo WhatsApp Oficial do Condomínio — nenhuma integração de API).
 *
 * Todo envio (canal, modelo usado, destinatário, data/hora, tela de origem) é gravado
 * na collection `historico_alteracoes` (Histórico de Configurações › Canais de Envio).
 *
 * Todas as auxiliares são INLINE no callback (modelo de pool JSVM do Skip Cloud).
 *
 * Endpoint:
 * - POST /backend/v1/admin/mensagem-direta (mesa/admin)
 *   Body: { canal: 'email'|'whatsapp', destinatario, destinatario_nome, unidade,
 *           mensagem, modelo, tela, assunto? }
 */

routerAdd('POST', '/backend/v1/admin/mensagem-direta', (e) => {
  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = (e.requestInfo().headers && e.requestInfo().headers['authorization']) || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && e.app) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }
  if (!operador) {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito à Mesa Diretora e Administradores.',
    })
  }
  const role = operador.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message: 'Acesso restrito à Mesa Diretora e Administradores.',
    })
  }

  const body = e.requestInfo().body || {}
  const canal = String(body.canal || '').trim()
  if (canal !== 'email' && canal !== 'whatsapp') {
    return e.json(400, { success: false, message: 'Canal inválido (use "email" ou "whatsapp").' })
  }
  const mensagem = String(body.mensagem || '').trim()
  if (!mensagem) {
    return e.json(400, { success: false, message: 'A mensagem não pode ficar vazia.' })
  }
  const destinatario = String(body.destinatario || '').trim()
  const destinatarioNome = String(body.destinatario_nome || '').trim()
  const unidadeTxt = String(body.unidade || '').trim()
  const modeloRotulo = String(body.modelo || 'mensagem livre').trim()
  const tela = String(body.tela || '').trim()
  const assuntoSolicitado = String(body.assunto || '')
    .trim()
    .substring(0, 150)

  if (canal === 'email' && (!destinatario || !destinatario.includes('@'))) {
    return e.json(400, {
      success: false,
      message: 'E-mail do destinatário ausente ou inválido.',
    })
  }
  if (canal === 'whatsapp' && !destinatario) {
    return e.json(400, {
      success: false,
      message: 'Telefone do destinatário ausente.',
    })
  }

  let nomeCondo = 'Condomínio Residencial Lago Azul'
  try {
    const configs = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (configs && configs.length > 0) {
      nomeCondo = configs[0].getString('nome_condominio') || nomeCondo
    }
  } catch (_) {}

  // ---------- Envio por e-mail (SMTP da plataforma) ----------
  let sucesso = true
  let erroMsg = ''
  let canalDescricao = 'WhatsApp Oficial do Condomínio (envio manual via wa.me)'

  if (canal === 'email') {
    canalDescricao = 'E-mail transacional (SMTP da plataforma)'
    try {
      let emailOficial = ''
      let nomeRemetente = ''
      let smtpAtivo = false
      let smtpHost = ''
      let smtpPort = 587
      let smtpUser = ''
      let smtpEncryption = 'starttls'

      try {
        const configs = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
        if (configs && configs.length > 0) {
          const cfg = configs[0]
          emailOficial = (cfg.getString('email_oficial') || '').trim()
          nomeRemetente = (cfg.getString('nome_remetente') || '').trim()
          smtpAtivo = cfg.getBool('smtp_ativo')
          smtpHost = (cfg.getString('smtp_host') || '').trim()
          smtpPort = cfg.getInt('smtp_port') || 587
          smtpUser = (cfg.getString('smtp_user') || '').trim()
          smtpEncryption = cfg.getString('smtp_encryption') || 'starttls'
        }
      } catch (_) {}

      let smtpPass = ''
      if (smtpAtivo && smtpHost) {
        try {
          const sec = e.app.findFirstRecordByData('configuracoes_backend', 'chave', 'SMTP_SENHA')
          if (sec) {
            smtpPass = sec.getString('valor') || ''
          }
        } catch (_) {}
      }

      const settings = e.app.settings()
      const fallbackAddr =
        (settings && settings.meta && settings.meta.senderAddress) || 'nao-responda@lagoazul.condo'
      const fallbackName = (settings && settings.meta && settings.meta.senderName) || nomeCondo
      const senderAddr = emailOficial || fallbackAddr
      const senderName = nomeRemetente || fallbackName
      const assunto = assuntoSolicitado || `Mensagem da Mesa Diretora — ${nomeCondo}`

      const escapeHtmlInline = (s) =>
        String(s)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')

      const htmlBody =
        `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>` +
        `<body style="margin:0;padding:0;background:#F3F7FC;font-family:'Poppins',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#002B5E;">` +
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F7FC;padding:30px 10px;"><tr><td align="center">` +
        `<table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #E2E8F0;">` +
        `<tr><td style="background:#002B5E;padding:22px 30px;border-bottom:3px solid #0066FF;">` +
        `<span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#8EC0FF;font-weight:600;">Plataforma Virtual Koinon</span>` +
        `<h1 style="margin:4px 0 0 0;font-size:20px;color:#ffffff;font-weight:700;">${escapeHtmlInline(nomeCondo)}</h1>` +
        `</td></tr>` +
        `<tr><td style="padding:30px;background:#ffffff;">` +
        `<h2 style="margin:0 0 14px 0;font-size:17px;color:#002B5E;">${escapeHtmlInline(assunto)}</h2>` +
        `<div style="font-size:14px;color:#002B5E;line-height:1.7;white-space:pre-line;">${escapeHtmlInline(mensagem)}</div>` +
        `</td></tr>` +
        `<tr><td style="background:#F3F7FC;padding:20px 30px;border-top:1px solid #E2E8F0;font-size:11px;color:#5A6B82;text-align:center;">` +
        `<p style="margin:0;">${escapeHtmlInline(nomeCondo)} — mensagem enviada pela Mesa Diretora via Koinon • uma solução <strong style="color:#0066FF;">A3ONE</strong></p>` +
        `</td></tr></table></td></tr></table></body></html>`

      const message = new MailerMessage({
        from: { address: senderAddr, name: senderName },
        to: [{ address: destinatario }],
        subject: assunto,
        html: htmlBody,
      })

      const usarSmtpProprio = Boolean(smtpAtivo && smtpHost)
      if (usarSmtpProprio) {
        const origSmtp = settings.smtp
          ? {
              enabled: settings.smtp.enabled,
              host: settings.smtp.host,
              port: settings.smtp.port,
              username: settings.smtp.username,
              password: settings.smtp.password,
              tls: settings.smtp.tls,
            }
          : null

        let usarTlsImplicito = false
        const enc = (smtpEncryption || '').toLowerCase().trim()
        if (enc === 'ssl') {
          usarTlsImplicito = true
        } else if (enc === 'starttls' || enc === 'none') {
          usarTlsImplicito = false
        } else {
          usarTlsImplicito = Number(smtpPort) === 465
        }

        try {
          settings.smtp.enabled = true
          settings.smtp.host = smtpHost
          settings.smtp.port = smtpPort
          settings.smtp.username = smtpUser
          settings.smtp.password = smtpPass
          settings.smtp.tls = usarTlsImplicito

          const client = e.app.newMailClient()
          client.send(message)
        } finally {
          if (origSmtp) {
            settings.smtp.enabled = origSmtp.enabled
            settings.smtp.host = origSmtp.host
            settings.smtp.port = origSmtp.port
            settings.smtp.username = origSmtp.username
            settings.smtp.password = origSmtp.password
            settings.smtp.tls = origSmtp.tls
          }
        }
      } else {
        e.app.newMailClient().send(message)
      }
    } catch (sendErr) {
      sucesso = false
      erroMsg = String(sendErr && sendErr.message ? sendErr.message : sendErr).substring(0, 400)
      console.log('Falha ao enviar mensagem direta por e-mail:', sendErr)
    }
  }

  // ---------- Registro no Histórico de Alterações (todo envio) ----------
  const dataHora = new Date().toISOString().replace('T', ' ').substring(0, 19)
  try {
    const reqInfo = e.requestInfo() || {}
    let ip = ''
    let userAgent = ''
    if (reqInfo.headers) {
      const xf = reqInfo.headers['x-forwarded-for'] || reqInfo.headers['x-real-ip'] || ''
      ip = typeof xf === 'string' ? xf.split(',')[0].trim() : ''
      userAgent = reqInfo.headers['user-agent'] || ''
    }

    const histCol = e.app.findCollectionByNameOrId('historico_alteracoes')
    const histRec = new Record(histCol)
    histRec.set('user', operador.id)
    histRec.set('user_nome', operador.getString('name') || 'Mesa / Administrador')
    histRec.set('user_email', operador.getString('email') || '')
    histRec.set('user_role', operador.getString('role') || 'admin')
    histRec.set('acao', 'envio')
    histRec.set('entidade', 'configuracoes')
    histRec.set('registro_id', canal === 'email' ? destinatario.toLowerCase() : 'mensagem_whatsapp')
    histRec.set(
      'registro_rotulo',
      `Mensagem direta por ${canal === 'email' ? 'e-mail' : 'WhatsApp'} — ${destinatarioNome || destinatario}`,
    )
    histRec.set('campos_alterados', [
      {
        campo: 'mensagem_direta',
        anterior: null,
        novo: {
          canal: canal,
          canal_descricao: canalDescricao,
          modelo: modeloRotulo,
          destinatario: destinatario,
          destinatario_nome: destinatarioNome,
          unidade: unidadeTxt,
          tela_origem: tela,
          operador: operador.getString('name') || '',
          sucesso: sucesso,
          erro: erroMsg || null,
          data_hora: dataHora,
        },
      },
    ])
    histRec.set('ip', ip)
    histRec.set('user_agent', userAgent)
    histRec.set('data_hora', dataHora)
    e.app.save(histRec)
  } catch (hErr) {
    console.log('Aviso ao registrar histórico da mensagem direta:', hErr)
  }

  if (!sucesso) {
    return e.json(400, {
      success: false,
      message: `Não foi possível enviar o e-mail: ${erroMsg}`,
    })
  }

  return e.json(200, {
    success: true,
    message:
      canal === 'email'
        ? `E-mail enviado para ${destinatario} e registrado no Histórico.`
        : `Disparo manual por WhatsApp registrado no Histórico.`,
    data: { canal: canal, data_hora: dataHora },
  })
})

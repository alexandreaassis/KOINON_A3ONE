/**
 * Hook canais_envio.js
 * Gerenciamento seguro dos canais de envio do condomínio (E-mail, WhatsApp e SMTP próprio),
 * armazenamento confidencial de senha SMTP em configuracoes_backend e rota de e-mail de teste.
 *
 * Todas as funções e lógicas são mantidas INLINE dentro de cada routerAdd para cumprir o modelo
 * de pool JSVM do PocketBase / Skip Cloud.
 *
 * Endpoints:
 * - GET  /backend/v1/admin/canais-envio (mesa/admin: dados visíveis + tem_senha_smtp)
 * - POST /backend/v1/admin/canais-envio (mesa/admin: salva configs e senha segura)
 * - POST /backend/v1/admin/canais-envio/testar (mesa/admin: envia e-mail de teste com identidade Koinon)
 */

// 1. GET /backend/v1/admin/canais-envio
routerAdd('GET', '/backend/v1/admin/canais-envio', (e) => {
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

  let config = null
  try {
    const list = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (list && list.length > 0) {
      config = list[0]
    }
  } catch (err) {
    console.log('Aviso ao buscar configuracoes:', err)
  }

  // Verificar se há senha SMTP salva em configuracoes_backend (sem nunca expor o valor)
  let temSenhaSmtp = false
  try {
    const secRec = e.app.findFirstRecordByData('configuracoes_backend', 'chave', 'SMTP_SENHA')
    if (secRec && (secRec.getString('valor') || '').trim().length > 0) {
      temSenhaSmtp = true
    }
  } catch (_) {
    temSenhaSmtp = false
  }

  return e.json(200, {
    success: true,
    data: {
      email_oficial: config ? config.getString('email_oficial') || '' : '',
      nome_remetente: config ? config.getString('nome_remetente') || '' : '',
      whatsapp_oficial: config ? config.getString('whatsapp_oficial') || '' : '',
      smtp_host: config ? config.getString('smtp_host') || '' : '',
      smtp_port: config ? config.getInt('smtp_port') || 587 : 587,
      smtp_user: config ? config.getString('smtp_user') || '' : '',
      smtp_encryption: config ? config.getString('smtp_encryption') || 'starttls' : 'starttls',
      smtp_ativo: config ? config.getBool('smtp_ativo') : false,
      tem_senha_smtp: temSenhaSmtp,
    },
  })
})

// 2. POST /backend/v1/admin/canais-envio
routerAdd('POST', '/backend/v1/admin/canais-envio', (e) => {
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
  const emailOficial = (body.email_oficial || '').trim()
  const nomeRemetente = (body.nome_remetente || '').trim()
  const whatsappOficial = (body.whatsapp_oficial || '').trim()
  const smtpHost = (body.smtp_host || '').trim()
  const smtpPort = Number(body.smtp_port) || 587
  const smtpUser = (body.smtp_user || '').trim()
  const smtpEncryption = ['ssl', 'none'].includes(body.smtp_encryption)
    ? body.smtp_encryption
    : 'starttls'
  const smtpAtivo = Boolean(body.smtp_ativo)
  const novaSenha = typeof body.smtp_pass === 'string' ? body.smtp_pass : ''
  const limparSenha = Boolean(body.limpar_senha_smtp)

  // Validações básicas de formato se preenchido
  if (emailOficial && !emailOficial.includes('@')) {
    return e.json(400, {
      success: false,
      message: 'O e-mail oficial informado é inválido.',
    })
  }

  if (smtpAtivo) {
    if (!smtpHost) {
      return e.json(400, {
        success: false,
        message: 'Para ativar o SMTP próprio, informe o Host do servidor SMTP.',
      })
    }
  }

  // 1. Atualizar ou criar registro em `configuracoes`
  let configRec = null
  let diffHistorico = []
  try {
    const list = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (list && list.length > 0) {
      configRec = list[0]
    } else {
      const col = e.app.findCollectionByNameOrId('configuracoes')
      configRec = new Record(col)
      configRec.set('nome_condominio', 'Condomínio Residencial Lago Azul')
    }

    const mapaValores = {
      email_oficial: emailOficial,
      nome_remetente: nomeRemetente,
      whatsapp_oficial: whatsappOficial,
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_user: smtpUser,
      smtp_encryption: smtpEncryption,
      smtp_ativo: smtpAtivo,
    }

    const chaves = Object.keys(mapaValores)
    for (let i = 0; i < chaves.length; i++) {
      const campo = chaves[i]
      const val = mapaValores[campo]
      const anterior = configRec.get(campo)
      if (String(anterior ?? '') !== String(val ?? '')) {
        diffHistorico.push({
          campo: campo,
          anterior: anterior ?? null,
          novo: val,
        })
        configRec.set(campo, val)
      }
    }

    e.app.save(configRec)
  } catch (err) {
    console.log('Erro ao salvar configuracoes de canais de envio:', err)
    return e.json(500, {
      success: false,
      message: 'Não foi possível gravar as configurações do condomínio.',
    })
  }

  // 2. Tratar a senha em `configuracoes_backend` (regra estrita de segurança)
  try {
    let secRec = null
    try {
      secRec = e.app.findFirstRecordByData('configuracoes_backend', 'chave', 'SMTP_SENHA')
    } catch (_) {}

    if (limparSenha) {
      if (secRec) {
        secRec.set('valor', '')
        e.app.save(secRec)
        diffHistorico.push({
          campo: 'smtp_senha',
          anterior: '[SENHA DEFINIDA]',
          novo: '[SENHA REMOVIDA]',
        })
      }
    } else if (novaSenha && novaSenha.trim().length > 0) {
      if (!secRec) {
        const backendCol = e.app.findCollectionByNameOrId('configuracoes_backend')
        secRec = new Record(backendCol)
        secRec.set('chave', 'SMTP_SENHA')
      }
      secRec.set('valor', novaSenha)
      e.app.save(secRec)
      diffHistorico.push({
        campo: 'smtp_senha',
        anterior: '[DADO PROTEGIDO]',
        novo: '[SENHA ATUALIZADA]',
      })
    }
  } catch (secErr) {
    console.log('Erro ao salvar senha SMTP em configuracoes_backend:', secErr)
    return e.json(500, {
      success: false,
      message: 'Não foi possível armazenar a senha SMTP de forma segura.',
    })
  }

  // 3. Registrar no Histórico de Alterações se houve mudanças
  if (diffHistorico.length > 0) {
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
      histRec.set('acao', 'atualizacao')
      histRec.set('entidade', 'configuracoes')
      histRec.set('registro_id', configRec.id)
      histRec.set('registro_rotulo', 'Canais de envio do condomínio')
      histRec.set('campos_alterados', diffHistorico)
      histRec.set('ip', ip)
      histRec.set('user_agent', userAgent)
      histRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
      e.app.save(histRec)
    } catch (hErr) {
      console.log('Aviso ao registrar histórico de alteração de canais de envio:', hErr)
    }
  }

  // Verificar status final da senha
  let temSenhaSmtp = false
  try {
    const sec = e.app.findFirstRecordByData('configuracoes_backend', 'chave', 'SMTP_SENHA')
    temSenhaSmtp = Boolean(sec && (sec.getString('valor') || '').trim().length > 0)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Canais de envio atualizados com sucesso.',
    data: {
      email_oficial: configRec.getString('email_oficial') || '',
      nome_remetente: configRec.getString('nome_remetente') || '',
      whatsapp_oficial: configRec.getString('whatsapp_oficial') || '',
      smtp_host: configRec.getString('smtp_host') || '',
      smtp_port: configRec.getInt('smtp_port') || 587,
      smtp_user: configRec.getString('smtp_user') || '',
      smtp_encryption: configRec.getString('smtp_encryption') || 'starttls',
      smtp_ativo: configRec.getBool('smtp_ativo'),
      tem_senha_smtp: temSenhaSmtp,
    },
  })
})

// 3. POST /backend/v1/admin/canais-envio/testar
routerAdd('POST', '/backend/v1/admin/canais-envio/testar', (e) => {
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
  const destinatario = (body.destinatario || operador.getString('email') || '').trim().toLowerCase()

  if (!destinatario || !destinatario.includes('@')) {
    return e.json(400, {
      success: false,
      message: 'Informe um endereço de e-mail válido para receber o teste.',
    })
  }

  // Carregar configurações atuais
  let config = null
  let nomeCondo = 'Condomínio Residencial Lago Azul'
  try {
    const list = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (list && list.length > 0) {
      config = list[0]
      nomeCondo = config.getString('nome_condominio') || nomeCondo
    }
  } catch (_) {}

  const emailOficial = config ? (config.getString('email_oficial') || '').trim() : ''
  const nomeRemetente = config ? (config.getString('nome_remetente') || '').trim() : ''
  const smtpAtivo = config ? config.getBool('smtp_ativo') : false
  const smtpHost = config ? (config.getString('smtp_host') || '').trim() : ''
  const smtpPort = config ? config.getInt('smtp_port') || 587 : 587
  const smtpUser = config ? (config.getString('smtp_user') || '').trim() : ''
  const smtpEncryption = config ? config.getString('smtp_encryption') || 'starttls' : 'starttls'

  // Buscar senha salva
  let smtpPass = ''
  try {
    const secRec = e.app.findFirstRecordByData('configuracoes_backend', 'chave', 'SMTP_SENHA')
    if (secRec) {
      smtpPass = secRec.getString('valor') || ''
    }
  } catch (_) {}

  // Determinar canal e remetente efetivo
  const usarSmtpProprio = Boolean(smtpAtivo && smtpHost)
  const remetenteNomeEfetivo = nomeRemetente || nomeCondo || 'Condomínio Lago Azul — Assembleia'
  const remetenteEmailEfetivo = emailOficial || 'nao-responda@lagoazul.condo'
  const canalDescricao = usarSmtpProprio
    ? `SMTP Próprio do Condomínio (${smtpHost}:${smtpPort})`
    : `Padrão da Plataforma Koinon (Fallback ativo)`

  // Validação preventiva se o usuário ativou o SMTP próprio mas falta configuração
  if (smtpAtivo && (!smtpHost || !smtpPort)) {
    return e.json(400, {
      success: false,
      message: 'SMTP próprio está marcado como ativo, mas o Host ou Porta não foram preenchidos.',
      canal: canalDescricao,
    })
  }

  const dataHoraFormatada = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'full',
    timeStyle: 'medium',
  })

  // Template HTML no padrão oficial Koinon (Poppins, azul #0066FF, marinho #002B5E, endosso A3ONE)
  const htmlBody = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Teste de Canal de Envio — ${nomeCondo}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F3F7FC; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #002B5E; line-height: 1.6;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F3F7FC; padding: 32px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 24px rgba(0,43,94,0.08);">
              <!-- Cabeçalho Marinho com ponto Azul -->
              <tr>
                <td style="background-color: #002B5E; padding: 26px 32px; text-align: left; border-bottom: 4px solid #0066FF;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="left">
                        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.6px; color: #8EC0FF; font-weight: 600; margin-bottom: 4px;">Plataforma Virtual Koinon</span>
                        <h1 style="margin: 0; font-size: 22px; color: #ffffff; font-weight: 700; letter-spacing: -0.3px;">${nomeCondo}</h1>
                      </td>
                      <td align="right" valign="middle" style="width: 52px;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #0066FF; text-align: center; line-height: 44px; color: #ffffff; font-size: 22px; font-weight: 700; box-shadow: 0 2px 8px rgba(0,102,255,0.4);">K</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Conteúdo Principal -->
              <tr>
                <td style="padding: 34px 32px; background-color: #ffffff;">
                  <div style="display: inline-block; padding: 4px 12px; background-color: #E6F0FF; border: 1px solid #B8D5FF; border-radius: 999px; font-size: 11px; font-weight: 600; color: #0052CC; margin-bottom: 16px;">
                    Verificação de Canal de Comunicação
                  </div>

                  <h2 style="margin: 0 0 14px 0; font-size: 20px; color: #002B5E; font-weight: 700;">
                    E-mail de Teste Homologado
                  </h2>

                  <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155; line-height: 1.7;">
                    Olá, <strong>${operador.getString('name') || 'Membro da Administração'}</strong>!<br>
                    Este é um e-mail de verificação disparado a partir das Configurações da plataforma para conferir o remetente oficial antes da realização das assembleias do <strong>${nomeCondo}</strong>.
                  </p>

                  <!-- Card com Parâmetros Ativos -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin: 20px 0; padding: 18px 20px;">
                    <tr>
                      <td>
                        <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #002B5E; text-transform: uppercase; letter-spacing: 0.8px;">
                          Diagnóstico da Configuração de Envio
                        </p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="4" style="font-size: 13px; color: #334155;">
                          <tr>
                            <td style="width: 150px; font-weight: 600; color: #5A6B82;">Canal Ativo:</td>
                            <td style="font-weight: 600; color: ${usarSmtpProprio ? '#0066FF' : '#002B5E'};">${canalDescricao}</td>
                          </tr>
                          <tr>
                            <td style="font-weight: 600; color: #5A6B82;">Remetente (From):</td>
                            <td style="font-weight: 600; color: #002B5E;">${remetenteNomeEfetivo} &lt;${remetenteEmailEfetivo}&gt;</td>
                          </tr>
                          <tr>
                            <td style="font-weight: 600; color: #5A6B82;">Responder para:</td>
                            <td>${remetenteEmailEfetivo}</td>
                          </tr>
                          <tr>
                            <td style="font-weight: 600; color: #5A6B82;">Destinatário do Teste:</td>
                            <td>${destinatario}</td>
                          </tr>
                          <tr>
                            <td style="font-weight: 600; color: #5A6B82;">Data e Horário:</td>
                            <td>${dataHoraFormatada}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748B; line-height: 1.6;">
                    Se você recebeu esta mensagem corretamente na sua caixa de entrada, significa que a rota de envio está operacional e pronta para enviar convocações de editais, links de cadastro de condôminos e confirmações de voto.
                  </p>
                </td>
              </tr>

              <!-- Rodapé com Endosso A3ONE -->
              <tr>
                <td style="background-color: #F3F7FC; padding: 24px 32px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #5A6B82; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-weight: 600; color: #002B5E;">${nomeCondo} — Plataforma Virtual Koinon</p>
                  <p style="margin: 0 0 14px 0; line-height: 1.5;">
                    Ambiente seguro para deliberações e assembleias digitais.<br>
                    Em conformidade com o Código Civil Brasileiro e a LGPD (Lei 13.709/2018).
                  </p>
                  <div style="display: inline-block; padding: 7px 16px; background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 999px; font-size: 11px; color: #5A6B82; letter-spacing: 0.3px;">
                    <span style="font-weight: 700; color: #002B5E; letter-spacing: 0.5px;">KOINON</span>
                    <span style="margin: 0 8px; color: #0066FF;">•</span>
                    <span>uma solução <strong style="color: #0066FF;">A3ONE</strong></span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  let envioSucesso = false
  let mensagemErro = ''

  try {
    const message = new MailerMessage({
      from: {
        address: remetenteEmailEfetivo,
        name: remetenteNomeEfetivo,
      },
      to: [{ address: destinatario }],
      subject: `[TESTE] ${remetenteNomeEfetivo} — Verificação de Canal de Envio`,
      html: htmlBody,
    })

    // Se SMTP próprio estiver ativo, configurar temporariamente o mailer da aplicação
    if (usarSmtpProprio) {
      const settings = e.app.settings()
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

      // Resolução correta da segurança SMTP no PocketBase:
      // settings.smtp.tls = true  => TLS implícito direto (dial TLS, porta 465)
      // settings.smtp.tls = false => Conexão em texto puro com comando STARTTLS negociado após EHLO (porta 587/25)
      let usarTlsImplicito = false
      const enc = (smtpEncryption || '').toLowerCase().trim()
      if (enc === 'ssl') {
        usarTlsImplicito = true
      } else if (enc === 'starttls') {
        usarTlsImplicito = false
      } else if (enc === 'none') {
        usarTlsImplicito = false
      } else {
        // Campos ambíguos: deduzir pela porta
        usarTlsImplicito = Number(smtpPort) === 465
      }

      try {
        settings.smtp.enabled = true
        settings.smtp.host = smtpHost
        settings.smtp.port = smtpPort
        settings.smtp.username = smtpUser || ''
        settings.smtp.password = smtpPass || ''
        settings.smtp.tls = usarTlsImplicito

        const client = e.app.newMailClient()
        client.send(message)
        envioSucesso = true
      } finally {
        // Restaurar configurações originais do sistema
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
      // Fallback padrão da plataforma
      const client = e.app.newMailClient()
      client.send(message)
      envioSucesso = true
    }
  } catch (sendErr) {
    console.log('Falha no envio do e-mail de teste:', sendErr)
    mensagemErro = String(sendErr && sendErr.message ? sendErr.message : sendErr)
    envioSucesso = false
  }

  // Registrar resultado no Histórico de Alterações e Trilha de Auditoria
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
    histRec.set('acao', 'atualizacao')
    histRec.set('entidade', 'configuracoes')
    histRec.set('registro_id', config ? config.id : 'teste_email')
    histRec.set(
      'registro_rotulo',
      `Disparo de teste de e-mail (${envioSucesso ? 'Sucesso' : 'Falha'})`,
    )
    histRec.set('campos_alterados', [
      {
        campo: 'email_teste',
        anterior: null,
        novo: {
          destinatario: destinatario,
          remetente_utilizado: remetenteNomeEfetivo + ' <' + remetenteEmailEfetivo + '>',
          canal: canalDescricao,
          sucesso: envioSucesso,
          erro: mensagemErro || null,
        },
      },
    ])
    histRec.set('ip', ip)
    histRec.set('user_agent', userAgent)
    histRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    e.app.save(histRec)
  } catch (hErr) {
    console.log('Aviso ao registrar auditoria de e-mail de teste:', hErr)
  }

  if (!envioSucesso) {
    // Diagnosticar erro comum para mensagem amigável
    let dicaLegivel = mensagemErro
    const lower = mensagemErro.toLowerCase()
    if (
      lower.includes('sender') ||
      lower.includes('from') ||
      lower.includes('553') ||
      lower.includes('550 5.7') ||
      lower.includes('550 5.1') ||
      lower.includes('not owned') ||
      lower.includes('send-as') ||
      lower.includes('relay')
    ) {
      dicaLegivel =
        'O servidor SMTP recusou o endereço de remetente configurado. Em provedores como Google Workspace/Gmail, configure o e-mail real do condomínio (igual ou autorizado pelo Usuário SMTP) nos campos "E-mail oficial" e "Usuário SMTP".'
    } else if (
      lower.includes('authentication') ||
      lower.includes('535') ||
      lower.includes('auth failed') ||
      lower.includes('badcredentials') ||
      lower.includes('username and password not accepted')
    ) {
      dicaLegivel =
        'Autenticação recusada pelo servidor SMTP. Verifique o usuário e a senha informados. No Google Workspace/Gmail, utilize uma Senha de App dedicada.'
    } else if (
      lower.includes('connection refused') ||
      lower.includes('dial tcp') ||
      lower.includes('timeout') ||
      lower.includes('i/o timeout')
    ) {
      dicaLegivel =
        'Conexão recusada ou expirada pelo servidor SMTP. Verifique o Host e a Porta (geralmente 587 para STARTTLS ou 465 para SSL).'
    } else if (
      lower.includes('certificate') ||
      lower.includes('tls') ||
      lower.includes('handshake')
    ) {
      dicaLegivel =
        'Falha na negociação de segurança TLS/SSL. Verifique a opção de criptografia selecionada.'
    }

    return e.json(400, {
      success: false,
      message: `Não foi possível enviar o e-mail de teste: ${dicaLegivel}`,
      detalhe: mensagemErro,
      canal: canalDescricao,
      remetente: `${remetenteNomeEfetivo} <${remetenteEmailEfetivo}>`,
    })
  }

  return e.json(200, {
    success: true,
    message: `E-mail de teste enviado com sucesso para ${destinatario}!`,
    canal: canalDescricao,
    remetente: `${remetenteNomeEfetivo} <${remetenteEmailEfetivo}>`,
  })
})

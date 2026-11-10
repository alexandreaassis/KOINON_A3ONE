/**
 * Hook para envio de e-mails transacionais a partir da collection `notificacoes`.
 * No Skip Cloud / PocketBase, todas as funções devem ser INLINE dentro dos callbacks
 * para evitar problemas de scoping do pool de JSVM.
 */

// 1. Hook disparado após criação de registro na collection `notificacoes`
onRecordCreate((e) => {
  e.next()
  try {
    const rec = e.record
    if (rec.getString('status') !== 'pendente') return

    const dest = rec.getString('destinatario')
    const canal = rec.getString('canal')
    const titulo = rec.getString('titulo') || 'Notificação da Assembleia'
    const corpo = rec.getString('corpo') || ''

    if (canal !== 'email' || !dest) {
      rec.set('status', 'falha')
      rec.set('mensagem_erro', 'Canal inválido ou destinatário ausente')
      e.app.save(rec)
      return
    }

    let nomeCondo = 'Condomínio Residencial Lago Azul'
    try {
      const configs = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
      if (configs && configs.length > 0) {
        nomeCondo = configs[0].getString('nome_condominio') || nomeCondo
      }
    } catch (_) {}

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${titulo}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F3F7FC; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #002B5E; line-height: 1.6;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F3F7FC; padding: 30px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 24px rgba(0,43,94,0.06);">
                <tr>
                  <td style="background-color: #002B5E; padding: 24px 30px; text-align: left; border-bottom: 3px solid #0066FF;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left">
                          <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8EC0FF; font-weight: 600; margin-bottom: 4px;">Plataforma Virtual Koinon</span>
                          <h1 style="margin: 0; font-size: 20px; color: #ffffff; font-weight: 700;">${nomeCondo}</h1>
                        </td>
                        <td align="right" valign="middle" style="width: 48px;">
                          <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #0066FF; text-align: center; line-height: 40px; color: #ffffff; font-size: 20px; font-weight: 700;">K</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 30px; background-color: #ffffff;">
                    <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #002B5E; font-weight: 700;">${titulo}</h2>
                    <div style="font-size: 14px; color: #002B5E; line-height: 1.7; white-space: pre-line;">
                      ${corpo}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #F3F7FC; padding: 22px 30px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #5A6B82; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-weight: 600; color: #002B5E;">${nomeCondo} — Koinon</p>
                    <p style="margin: 0 0 12px 0; line-height: 1.4;">
                      Esta é uma notificação oficial da assembleia condominial. Não responda diretamente a este e-mail.<br>
                      Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
                    </p>
                    <div style="display: inline-block; padding: 6px 14px; background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 999px; font-size: 10px; color: #5A6B82; letter-spacing: 0.3px;">
                      <span style="font-weight: 700; color: #002B5E; letter-spacing: 0.5px;">KOINON</span>
                      <span style="margin: 0 6px; color: #8EC0FF;">•</span>
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

    try {
      // Verificar se o condomínio possui remetente próprio ou SMTP configurado
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

      const message = new MailerMessage({
        from: {
          address: senderAddr,
          name: senderName,
        },
        to: [{ address: dest }],
        subject: `[${nomeCondo}] ${titulo}`,
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
        // Fallback padrão da plataforma
        e.app.newMailClient().send(message)
      }

      rec.set('status', 'enviada')
      rec.set('enviada_em', new Date().toISOString().replace('T', ' ').substring(0, 19))
      rec.set('mensagem_erro', '')
      e.app.save(rec)
    } catch (sendErr) {
      console.log('Erro ao enviar e-mail via mailer:', sendErr)
      rec.set('status', 'falha')
      rec.set(
        'mensagem_erro',
        String(sendErr && sendErr.message ? sendErr.message : sendErr).substring(0, 500),
      )
      e.app.save(rec)
    }
  } catch (err) {
    console.log('Erro no hook onRecordCreate(notificacoes):', err)
  }
}, 'notificacoes')

// 2. Hook disparado quando um credenciamento é criado (notificar mesa)
onRecordCreate((e) => {
  e.next()
  try {
    const cred = e.record
    const nomeTitular = cred.getString('titular_nome') || 'Condômino'
    const cpf = cred.getString('cpf') || ''
    const unidadeId = cred.getString('unidade')
    let identUnidade = ''
    try {
      const uRec = e.app.findRecordById('unidades', unidadeId)
      identUnidade = uRec.getString('identificador') || ''
    } catch (_) {}

    const notifCol = e.app.findCollectionByNameOrId('notificacoes')

    const mesaUsers = e.app.findRecordsByFilter(
      'users',
      "role = 'mesa' || role = 'admin' || email = 'alexandre@a3one.com.br'",
      '',
      20,
      0,
    )
    const emailsEnviados = new Set()

    for (let u of mesaUsers) {
      const email = u.getString('email')
      if (email && !emailsEnviados.has(email)) {
        emailsEnviados.add(email)
        const notif = new Record(notifCol)
        notif.set('destinatario', email)
        notif.set('canal', 'email')
        notif.set('tipo', 'credenciamento_pendente_mesa')
        notif.set('titulo', `Novo credenciamento submetido: Unidade ${identUnidade}`)
        notif.set(
          'corpo',
          `Um novo pedido de credenciamento eleitoral foi submetido e aguarda homologação da mesa diretora:\n\n` +
            `• Titular: ${nomeTitular}\n` +
            `• CPF: ${cpf}\n` +
            `• Unidade: ${identUnidade}\n\n` +
            `Acesse a Plataforma Virtual Koinon no módulo da mesa para analisar a documentação comprobatória.`,
        )
        notif.set('status', 'pendente')
        e.app.save(notif)
      }
    }
  } catch (err) {
    console.log('Erro ao notificar mesa sobre novo credenciamento:', err)
  }
}, 'credenciamentos')

// 3. Hook disparado quando credenciamento é atualizado (aprovado/rejeitado)
onRecordUpdate((e) => {
  e.next()
  try {
    const cred = e.record
    const originalStatus = cred.original().getString('status')
    const novoStatus = cred.getString('status')

    if (
      originalStatus !== novoStatus &&
      (novoStatus === 'aprovado' || novoStatus === 'rejeitado')
    ) {
      const unidadeId = cred.getString('unidade')
      let emailDest = ''
      let identUnidade = ''
      try {
        const uRec = e.app.findRecordById('unidades', unidadeId)
        emailDest = uRec.getString('contato_email')
        identUnidade = uRec.getString('identificador')
      } catch (_) {}

      if (!emailDest) {
        try {
          const uList = e.app.findRecordsByFilter('users', 'unidade = {:unid}', '', 1, 0, {
            unid: unidadeId,
          })
          if (uList && uList.length > 0) {
            emailDest = uList[0].getString('email')
          }
        } catch (_) {}
      }

      if (emailDest) {
        const notifCol = e.app.findCollectionByNameOrId('notificacoes')
        const notif = new Record(notifCol)
        notif.set('destinatario', emailDest)
        notif.set('canal', 'email')

        if (novoStatus === 'aprovado') {
          notif.set('tipo', 'credenciamento_aprovado')
          notif.set('titulo', `Credenciamento Aprovado — Unidade ${identUnidade}`)
          notif.set(
            'corpo',
            `Prezado(a) ${cred.getString('titular_nome')},\n\n` +
              `Seu credenciamento para a Unidade ${identUnidade} foi HOMOLOGADO com sucesso pela mesa diretora.\n\n` +
              `Você está apto(a) a participar e exercer seu direito de voto nas deliberações ativas da assembleia.\n` +
              `Ao abrir a votação, acesse a cabine utilizando o CPF cadastrado.`,
          )
        } else {
          const motivo =
            cred.getString('motivo_rejeicao') || 'Documentação não confere com os registros'
          notif.set('tipo', 'credenciamento_rejeitado')
          notif.set('titulo', `Credenciamento Pendente de Ajuste — Unidade ${identUnidade}`)
          notif.set(
            'corpo',
            `Prezado(a) ${cred.getString('titular_nome')},\n\n` +
              `Seu pedido de credenciamento para a Unidade ${identUnidade} NÃO foi homologado pela mesa diretora.\n\n` +
              `Motivo informado pela mesa: "${motivo}".\n\n` +
              `Por favor, acesse novamente o sistema, revise as informações e envie a documentação comprobatória correta.`,
          )
        }

        notif.set('status', 'pendente')
        e.app.save(notif)
      }
    }
  } catch (err) {
    console.log('Erro ao notificar morador sobre credenciamento:', err)
  }
}, 'credenciamentos')

// 4. Endpoint customizado para disparar edital de convocação a todos os moradores ativos
routerAdd('POST', '/backend/v1/notificacoes/disparar-edital', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'mesa' && role !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas membros da Mesa ou Administradores podem disparar o edital.',
    })
  }

  const body = e.requestInfo().body || {}
  const deliberacaoId = body.deliberacaoId
  const tituloEdital = body.tituloEdital || 'Convocação para Assembleia Geral'
  const resumoPauta = body.resumoPauta || ''
  const dataAssembleia = body.dataAssembleia || ''
  const linkApp = body.linkApp || ''
  // Prova de envio (Fase 2C): PDF assinado + hash embarcados na convocação
  const pdfBase64 = body.pdfBase64 || ''
  const pdfNome = (body.pdfNome || 'edital-assinado.pdf').substring(0, 200)
  const hashDocumento = (body.hashDocumento || '').substring(0, 128)
  const canalWhatsApp = Array.isArray(body.whatsappLinks) ? body.whatsappLinks : []

  if (!deliberacaoId) {
    return e.json(400, { success: false, message: 'deliberacaoId é obrigatório' })
  }

  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação não encontrada' })
  }

  let nomeCondo = 'Condomínio Residencial Lago Azul'
  try {
    const configs = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (configs && configs.length > 0) {
      nomeCondo = configs[0].getString('nome_condominio') || nomeCondo
    }
  } catch (_) {}

  const notifCol = e.app.findCollectionByNameOrId('notificacoes')
  const emailsDest = new Set()

  try {
    const unidades = e.app.findRecordsByFilter('unidades', 'ativo = true', '', 1000, 0)
    for (let u of unidades) {
      const email = (u.getString('contato_email') || '').trim()
      if (email && email.includes('@')) {
        emailsDest.add(email)
      }
    }
  } catch (err) {
    console.log('Erro ao buscar emails de unidades:', err)
  }

  // Notificar ambos os cadastros da unidade (proprietário e morador/locatário) quando existirem
  try {
    const cadastros = e.app.findRecordsByFilter('cadastros_unidade', 'ativo = true', '', 2000, 0)
    for (let c of cadastros) {
      const email = (c.getString('email') || '').trim()
      if (email && email.includes('@')) {
        emailsDest.add(email)
      }
    }
  } catch (err) {
    console.log('Erro ao buscar emails de cadastros_unidade:', err)
  }

  try {
    const moradores = e.app.findRecordsByFilter('users', 'ativo = true', '', 1000, 0)
    for (let m of moradores) {
      const email = (m.getString('email') || '').trim()
      if (email && email.includes('@')) {
        emailsDest.add(email)
      }
    }
  } catch (err) {
    console.log('Erro ao buscar emails de moradores:', err)
  }

  let totalCriados = 0

  const corpoEdital =
    `Prezado(a) Condômino(a),\n\n` +
    `Fica Vossa Senhoria formalmente convocado(a) para participar da assembleia condominial: "${delib.getString('titulo')}".\n\n` +
    (dataAssembleia ? `• Data/Período: ${dataAssembleia}\n` : '') +
    (resumoPauta ? `• Pauta resumida:\n${resumoPauta}\n\n` : '') +
    `Acesse o aplicativo de votação para consultar o Edital na íntegra, os documentos da pauta e realizar seu credenciamento prévio.\n` +
    (linkApp ? `Link de acesso: ${linkApp}\n` : '') +
    (hashDocumento
      ? `\nIntegridade do documento: hash SHA-256 ${hashDocumento}. O PDF assinado acompanha este e-mail em anexo.`
      : '')

  // Registro do hash do documento assinado na deliberação (prova de envio Fase 2C)
  if (hashDocumento && delib.getString('hash_edital_enviado') !== hashDocumento) {
    try {
      delib.set('hash_edital_enviado', hashDocumento)
      e.app.save(delib)
    } catch (err) {
      console.log('Erro ao registrar hash do edital na deliberação:', err)
    }
  }

  for (let dest of emailsDest) {
    try {
      const notif = new Record(notifCol)
      notif.set('destinatario', dest)
      notif.set('canal', 'email')
      notif.set('tipo', 'edital_convocado')
      notif.set('titulo', `[CONVOCAÇÃO] ${delib.getString('titulo')}`)
      notif.set('corpo', corpoEdital)
      notif.set('deliberacao', deliberacaoId)
      notif.set('status', 'pendente')
      // Prova de envio (Fase 2C)
      notif.set('prova_canal', 'email')
      notif.set('prova_status', 'pendente')
      notif.set('prova_data_hora', new Date().toISOString())
      notif.set('prova_hash_documento', hashDocumento || '')
      notif.set('prova_deliberacao', deliberacaoId)
      notif.set(
        'prova_payload',
        JSON.stringify({
          tipo: 'convocacao_edital',
          anexo: pdfNome,
          anexo_presente: Boolean(pdfBase64),
          hash_documento: hashDocumento,
        }),
      )
      e.app.save(notif)
      totalCriados++
    } catch (err) {
      console.log('Erro ao criar notificação de edital para ' + dest + ':', err)
    }
  }

  // Anexos: PDF assinado (e-mail) e registro dos links WhatsApp (sem integração)
  if (pdfBase64 && totalCriados > 0) {
    try {
      const settings = e.app.settings()
      const fallbackAddr =
        (settings && settings.meta && settings.meta.senderAddress) || 'nao-responda@lagoazul.condo'
      const subject = `[CONVOCAÇÃO] ${delib.getString('titulo')} — ${nomeCondo}`
      const binario = $security.base64Decode(pdfBase64)
      for (let dest of emailsDest) {
        try {
          const msg = new MailerMessage({
            from: { address: fallbackAddr, name: nomeCondo },
            to: [{ address: dest }],
            subject: subject,
            html:
              `<p>Segue em anexo o Edital de Convocação assinado eletronicamente.</p>` +
              `<p>Hash SHA-256 do documento: <code>${hashDocumento}</code></p>`,
            attachments: [{ filename: pdfNome, data: binario, contentType: 'application/pdf' }],
          })
          e.app.newMailClient().send(msg)
        } catch (err) {
          console.log('Erro ao enviar anexo do edital para ' + dest + ':', err)
        }
      }
    } catch (err) {
      console.log('Erro ao preparar anexos do edital:', err)
    }
  }

  // WhatsApp — apenas link, sem integração (prova formal de entrega fica no e-mail)
  if (canalWhatsApp.length > 0) {
    try {
      const waCol = e.app.findCollectionByNameOrId('notificacoes')
      for (let wa of canalWhatsApp) {
        const destino = (wa && wa.telefone) || ''
        const link = (wa && wa.link) || ''
        if (!destino || !link) continue
        try {
          const notifWa = new Record(waCol)
          notifWa.set('destinatario', 'whatsapp-disparo@koinon.local')
          notifWa.set('canal', 'email')
          notifWa.set('tipo', 'edital_convocado')
          notifWa.set('titulo', `[CONVOCAÇÃO via WhatsApp] ${delib.getString('titulo')}`)
          notifWa.set(
            'corpo',
            'Link de convocação enviado por WhatsApp (sem prova formal de entrega): ' + link,
          )
          notifWa.set('deliberacao', deliberacaoId)
          notifWa.set('status', 'enviada')
          notifWa.set('enviada_em', new Date().toISOString().replace('T', ' ').substring(0, 19))
          notifWa.set('prova_canal', 'whatsapp_link')
          notifWa.set('prova_status', 'disparado')
          notifWa.set('prova_data_hora', new Date().toISOString())
          notifWa.set('prova_hash_documento', hashDocumento || '')
          notifWa.set('prova_deliberacao', deliberacaoId)
          notifWa.set(
            'prova_payload',
            JSON.stringify({ tipo: 'convocacao_whatsapp_link', telefone: destino, link }),
          )
          e.app.save(notifWa)
        } catch (err) {
          console.log('Erro ao registrar disparo WhatsApp:', err)
        }
      }
    } catch (err) {
      console.log('Erro ao registrar disparos WhatsApp do edital:', err)
    }
  }

  // Gravar na auditoria encadeada
  try {
    const audCol = e.app.findCollectionByNameOrId('auditoria_events')
    let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
    let proximoSeq = 1
    const ultimos = e.app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
    if (ultimos && ultimos.length > 0) {
      ultimoHash = ultimos[0].getString('hash_evento') || ultimoHash
      proximoSeq = (ultimos[0].getInt('sequencial') || 0) + 1
    }

    const payload = JSON.stringify({
      evento: 'edital_publicado',
      data_hora: new Date().toISOString(),
      deliberacao: deliberacaoId,
      total_notificados: totalCriados,
      fator: 'Mesa: ' + authRecord.getString('name'),
      sequencial: proximoSeq,
      hash_anterior: ultimoHash,
    })

    const hashEvento = $security.sha256(ultimoHash + ':' + payload)
    const audRec = new Record(audCol)
    audRec.set('evento', 'edital_publicado')
    audRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    audRec.set(
      'fator',
      `Mesa: ${authRecord.getString('name')} disparou convocação de edital para ${totalCriados} destinatários`,
    )
    audRec.set('dispositivo', e.requestInfo().headers['user-agent'] || 'servidor')
    audRec.set('sequencial', proximoSeq)
    audRec.set('hash_evento', hashEvento)
    audRec.set('hash_anterior', ultimoHash)
    e.app.save(audRec)
  } catch (err) {
    console.log('Erro ao gravar auditoria do edital:', err)
  }

  return e.json(200, {
    success: true,
    totalDestinatarios: emailsDest.size,
    totalCriados: totalCriados,
    message: `Edital disparado com sucesso para ${totalCriados} moradores. Notificações enfileiradas para envio.`,
  })
})

// 5. Endpoint customizado para reenviar notificação com falha
routerAdd('POST', '/backend/v1/notificacoes/reenviar', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'mesa' && role !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas membros da Mesa podem reenviar notificações.',
    })
  }

  const body = e.requestInfo().body || {}
  const notificacaoId = body.notificacaoId

  if (!notificacaoId) {
    return e.json(400, { success: false, message: 'notificacaoId é obrigatório' })
  }

  let notif
  try {
    notif = e.app.findRecordById('notificacoes', notificacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Notificação não encontrada' })
  }

  const dest = notif.getString('destinatario')
  const titulo = notif.getString('titulo') || 'Notificação da Assembleia'
  const corpo = notif.getString('corpo') || ''

  let nomeCondo = 'Condomínio Residencial Lago Azul'
  try {
    const configs = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (configs && configs.length > 0) {
      nomeCondo = configs[0].getString('nome_condominio') || nomeCondo
    }
  } catch (_) {}

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="utf-8"><title>${titulo}</title></head>
    <body style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #F3F7FC; padding: 20px; color: #002B5E;">
      <div style="max-width: 600px; margin: auto; background: #fff; padding: 24px; border-radius: 14px; border: 1px solid #E2E8F0; box-shadow: 0 4px 24px rgba(0,43,94,0.06);">
        <div style="border-bottom: 2px solid #0066FF; padding-bottom: 12px; margin-bottom: 16px;">
          <span style="display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #0066FF; font-weight: 600;">Plataforma Virtual Koinon</span>
          <h2 style="color: #002B5E; margin: 4px 0 0 0; font-size: 18px;">${nomeCondo}</h2>
        </div>
        <h3 style="color: #0066FF; font-size: 16px; margin-top: 0;">${titulo}</h3>
        <p style="white-space: pre-line; color: #002B5E; font-size: 14px; line-height: 1.6;">${corpo}</p>
        <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 10px; color: #5A6B82;">
          <span style="font-weight: 700; color: #002B5E;">KOINON</span>
          <span style="margin: 0 6px; color: #8EC0FF;">•</span>
          <span>uma solução <strong style="color: #0066FF;">A3ONE</strong></span>
        </div>
      </div>
    </body>
    </html>
  `

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

    const message = new MailerMessage({
      from: { address: senderAddr, name: senderName },
      to: [{ address: dest }],
      subject: `[${nomeCondo}] ${titulo}`,
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

    notif.set('status', 'enviada')
    notif.set('enviada_em', new Date().toISOString().replace('T', ' ').substring(0, 19))
    notif.set('mensagem_erro', '')
    e.app.save(notif)

    return e.json(200, {
      success: true,
      message: 'E-mail reenviado com sucesso',
    })
  } catch (err) {
    notif.set('status', 'falha')
    notif.set('mensagem_erro', String(err && err.message ? err.message : err).substring(0, 500))
    e.app.save(notif)

    return e.json(400, {
      success: false,
      message: 'Falha ao reenviar: ' + (err && err.message ? err.message : err),
    })
  }
})

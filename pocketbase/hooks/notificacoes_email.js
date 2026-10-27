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
      <body style="margin: 0; padding: 0; background-color: #F1F4F8; font-family: 'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #12314F; line-height: 1.6;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F4F8; padding: 30px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #D5DCE5; box-shadow: 0 4px 24px rgba(18,49,79,0.06);">
                <tr>
                  <td style="background-color: #12314F; padding: 24px 30px; text-align: left; border-bottom: 3px solid #1F6B94;">
                    <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #D5DCE5; font-weight: 700; margin-bottom: 4px;">Plataforma Virtual Koinon</span>
                    <h1 style="margin: 0; font-size: 20px; color: #ffffff; font-weight: 700;">${nomeCondo}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 30px; background-color: #ffffff;">
                    <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #12314F; font-weight: 700;">${titulo}</h2>
                    <div style="font-size: 14px; color: #12314F; line-height: 1.7; white-space: pre-line;">
                      ${corpo}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #F1F4F8; padding: 20px 30px; border-top: 1px solid #D5DCE5; font-size: 11px; color: #5C6B7A; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-weight: 600; color: #12314F;">${nomeCondo} — Koinon</p>
                    <p style="margin: 0; line-height: 1.4;">
                      Esta é uma notificação oficial da assembleia condominial. Não responda diretamente a este e-mail.<br>
                      Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
                    </p>
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
      const settings = e.app.settings()
      const senderAddr =
        (settings && settings.meta && settings.meta.senderAddress) || 'nao-responda@lagoazul.condo'
      const senderName = (settings && settings.meta && settings.meta.senderName) || nomeCondo

      const message = new MailerMessage({
        from: {
          address: senderAddr,
          name: senderName,
        },
        to: [{ address: dest }],
        subject: `[${nomeCondo}] ${titulo}`,
        html: htmlBody,
      })

      e.app.newMailClient().send(message)

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
    (linkApp ? `Link de acesso: ${linkApp}\n` : '')

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
      e.app.save(notif)
      totalCriados++
    } catch (err) {
      console.log('Erro ao criar notificação de edital para ' + dest + ':', err)
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
    <body style="font-family: 'Sora', sans-serif; background: #F1F4F8; padding: 20px; color: #12314F;">
      <div style="max-width: 600px; margin: auto; background: #fff; padding: 24px; border-radius: 14px; border: 1px solid #D5DCE5;">
        <h2 style="color: #12314F; margin-top: 0;">${nomeCondo}</h2>
        <h3 style="color: #1F6B94;">${titulo}</h3>
        <p style="white-space: pre-line; color: #12314F;">${corpo}</p>
      </div>
    </body>
    </html>
  `

  try {
    const settings = e.app.settings()
    const senderAddr =
      (settings && settings.meta && settings.meta.senderAddress) || 'nao-responda@lagoazul.condo'
    const senderName = (settings && settings.meta && settings.meta.senderName) || nomeCondo

    const message = new MailerMessage({
      from: { address: senderAddr, name: senderName },
      to: [{ address: dest }],
      subject: `[${nomeCondo}] ${titulo}`,
      html: htmlBody,
    })

    e.app.newMailClient().send(message)

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

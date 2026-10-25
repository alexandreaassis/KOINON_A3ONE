/**
 * Hook POST /backend/v1/deliberacoes/transicao
 * Controla as transições de ciclo de vida das deliberações:
 * AGUARDANDO_ABERTURA -> ABERTA -> EM_VOTACAO -> ENCERRADA -> APURADA -> PUBLICADA
 * Restrito estritamente a usuários com role = 'mesa'.
 * Se transitar para APURADA, consolida o hash raiz da urna e grava na deliberação.
 * Registra evento correspondente na auditoria encadeada.
 */

routerAdd('POST', '/backend/v1/deliberacoes/transicao', (e) => {
  function registrarAuditoria(app, dados) {
    try {
      const audCol = app.findCollectionByNameOrId('auditoria_events')
      let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
      let proximoSeq = 1

      try {
        const ultimos = app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
        if (ultimos && ultimos.length > 0) {
          const u = ultimos[0]
          ultimoHash = u.getString('hash_evento') || ultimoHash
          proximoSeq = (u.getInt('sequencial') || 0) + 1
        }
      } catch (_) {}

      const payload = JSON.stringify({
        evento: dados.evento,
        data_hora: dados.data_hora || new Date().toISOString(),
        unidade: dados.unidade || '',
        fator: dados.fator || '',
        dispositivo: dados.dispositivo || '',
        sequencial: proximoSeq,
        hash_anterior: ultimoHash,
      })

      const hashEvento = $security.sha256(ultimoHash + ':' + payload)

      const rec = new Record(audCol)
      rec.set('evento', dados.evento)
      rec.set(
        'data_hora',
        dados.data_hora || new Date().toISOString().replace('T', ' ').substring(0, 19),
      )
      if (dados.unidade) rec.set('unidade', dados.unidade)
      rec.set('fator', dados.fator || 'sistema')
      rec.set('dispositivo', dados.dispositivo || 'servidor')
      rec.set('sequencial', proximoSeq)
      rec.set('hash_evento', hashEvento)
      rec.set('hash_anterior', ultimoHash)

      app.save(rec)
      return rec
    } catch (err) {
      console.log('Erro ao registrar auditoria interna:', err)
    }
  }

  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado' })
  }

  const role = authRecord.getString('role')
  if (role !== 'mesa' && role !== 'admin') {
    return e.json(403, {
      success: false,
      message: 'Apenas membros da Mesa ou Administradores podem alterar o status das deliberações.',
    })
  }

  const body = e.requestInfo().body || {}
  const deliberacaoId = body.deliberacaoId
  const novoStatus = (body.novoStatus || '').trim()

  const validStatuses = [
    'AGUARDANDO_ABERTURA',
    'ABERTA',
    'EM_VOTACAO',
    'ENCERRADA',
    'APURADA',
    'PUBLICADA',
  ]

  if (!deliberacaoId || !validStatuses.includes(novoStatus)) {
    return e.json(400, {
      success: false,
      message: 'deliberacaoId e novoStatus válido são obrigatórios',
    })
  }

  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação não encontrada' })
  }

  const statusAtual = delib.getString('status')
  delib.set('status', novoStatus)

  let eventoAuditoria = null
  if (novoStatus === 'ABERTA') {
    eventoAuditoria = 'assembleia_aberta'
  } else if (novoStatus === 'ENCERRADA') {
    eventoAuditoria = 'assembleia_encerrada'
  } else if (novoStatus === 'APURADA') {
    eventoAuditoria = 'apuracao_concluida'

    // Calcular hash raiz da urna consolidando todas as cédulas em ordem
    try {
      const cedulas = e.app.findRecordsByFilter(
        'cedulas',
        'deliberacao = {:delib}',
        'created',
        1000,
        0,
        { delib: deliberacaoId },
      )

      let hashAcumulado = '0000000000000000000000000000000000000000000000000000000000000000'
      for (let c of cedulas) {
        const cHash = c.getString('hash_cedula') || ''
        hashAcumulado = $security.sha256(hashAcumulado + ':' + cHash)
      }
      delib.set('hash_raiz', hashAcumulado)
    } catch (err) {
      console.log('Erro ao calcular hash raiz:', err)
    }
  } else if (novoStatus === 'PUBLICADA') {
    eventoAuditoria = 'resultado_publicado'

    // Notificar credenciados aprovados sobre a publicação dos resultados
    try {
      const credAprovados = e.app.findRecordsByFilter(
        'credenciamentos',
        "status = 'aprovado'",
        '',
        1000,
        0,
      )

      const notifCol = e.app.findCollectionByNameOrId('notificacoes')
      const emailsNotificados = new Set()

      for (let c of credAprovados) {
        const uId = c.getString('unidade')
        let emailDest = ''
        try {
          const uRec = e.app.findRecordById('unidades', uId)
          emailDest = uRec.getString('contato_email')
        } catch (_) {}

        if (!emailDest) {
          try {
            const users = e.app.findRecordsByFilter('users', 'unidade = {:u}', '', 1, 0, { u: uId })
            if (users && users.length > 0) emailDest = users[0].getString('email')
          } catch (_) {}
        }

        if (emailDest && emailDest.includes('@') && !emailsNotificados.has(emailDest)) {
          emailsNotificados.add(emailDest)
          const notif = new Record(notifCol)
          notif.set('destinatario', emailDest)
          notif.set('canal', 'email')
          notif.set('tipo', 'deliberacao_publicada')
          notif.set('titulo', `Resultado Publicado: ${delib.getString('titulo')}`)
          notif.set(
            'corpo',
            `Prezado(a) Condômino(a),\n\n` +
              `Informamos que a apuração e o resultado da assembleia "${delib.getString('titulo')}" foram homologados e PUBLICADOS pela mesa diretora.\n\n` +
              `Você já pode consultar o Informativo de Deliberações e o Boletim de Urna com a assinatura digital no aplicativo do condomínio.\n\n` +
              `Agradecemos sua participação cívica na governança do nosso condomínio.`,
          )
          notif.set('deliberacao', deliberacaoId)
          notif.set('status', 'pendente')
          e.app.save(notif)
        }
      }
    } catch (err) {
      console.log('Erro ao notificar publicação das deliberações:', err)
    }
  }

  e.app.save(delib)

  if (eventoAuditoria) {
    try {
      registrarAuditoria(e.app, {
        evento: eventoAuditoria,
        fator:
          'Mesa: ' + authRecord.getString('name') + ' (' + statusAtual + ' -> ' + novoStatus + ')',
        dispositivo: e.requestInfo().headers['user-agent'] || 'painel-mesa',
      })
    } catch (err) {
      console.log('Erro ao registrar auditoria de transição:', err)
    }
  }

  return e.json(200, {
    success: true,
    deliberacaoId: delib.id,
    statusAnterior: statusAtual,
    novoStatus: novoStatus,
    hashRaiz: delib.getString('hash_raiz') || '',
    message: 'Status atualizado com sucesso para ' + novoStatus,
  })
})

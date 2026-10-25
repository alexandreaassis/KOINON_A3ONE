/**
 * Hook POST /backend/v1/otp/send
 * Valida vínculo aprovado do CPF + unidade, gera OTP de 6 dígitos (validade 5 min),
 * guarda hash do OTP na sessão, registra evento otp_enviado.
 */

routerAdd('POST', '/backend/v1/otp/send', (e) => {
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

  const body = e.requestInfo().body || {}
  const unidadeId = body.unidadeId || body.unidade
  const cpf = (body.cpf || '').trim().replace(/[.\-\s]/g, '')
  const deliberacaoId = body.deliberacaoId || body.deliberacao

  if (!unidadeId || !cpf || !deliberacaoId) {
    return e.json(400, {
      success: false,
      message: 'unidadeId, cpf e deliberacaoId são obrigatórios',
    })
  }

  // 1. Validar unidade
  let unidadeRec
  try {
    unidadeRec = e.app.findRecordById('unidades', unidadeId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Unidade não encontrada' })
  }

  // 2. Validar deliberação
  let delibRec
  try {
    delibRec = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação não encontrada' })
  }

  if (delibRec.getString('status') !== 'EM_VOTACAO') {
    return e.json(400, {
      success: false,
      message: 'Esta deliberação não está com votação em andamento.',
    })
  }

  // 3. Verificar se já votou (comparecimentos)
  try {
    const comps = e.app.findRecordsByFilter(
      'comparecimentos',
      'deliberacao = {:delib} && unidade = {:unidade}',
      '',
      1,
      0,
      { delib: deliberacaoId, unidade: unidadeId },
    )
    if (comps && comps.length > 0) {
      return e.json(400, {
        success: false,
        message: 'O voto desta unidade já foi registrado nesta deliberação.',
      })
    }
  } catch (err) {
    if (err && err.message && err.message.includes('já foi registrado')) {
      return e.json(400, { success: false, message: err.message })
    }
  }

  // 4. Verificar se possui presença física registrada (reconciliação presencial/remoto)
  try {
    const presencas = e.app.findRecordsByFilter(
      'presencas',
      "deliberacao = {:delib} && unidade = {:unidade} && tipo = 'presencial'",
      '',
      1,
      0,
      { delib: deliberacaoId, unidade: unidadeId },
    )
    if (presencas && presencas.length > 0) {
      return e.json(400, {
        success: false,
        message:
          'Esta unidade foi registrada presencialmente na assembleia. O canal online está bloqueado.',
      })
    }
  } catch (err) {
    if (err && err.message && err.message.includes('bloqueado')) {
      return e.json(400, { success: false, message: err.message })
    }
  }

  // 5. Validar credenciamento aprovado com o CPF
  let credAprovado = null
  const creds = e.app.findRecordsByFilter(
    'credenciamentos',
    "unidade = {:unidade} && status = 'aprovado'",
    '-created',
    10,
    0,
    { unidade: unidadeId },
  )

  for (let c of creds) {
    const cleanCpfCred = (c.getString('cpf') || '').replace(/[.\-\s]/g, '')
    if (cleanCpfCred === cpf) {
      credAprovado = c
      break
    }
  }

  if (!credAprovado) {
    return e.json(400, {
      success: false,
      message: 'Credenciamento não encontrado ou não aprovado para este CPF nesta unidade.',
    })
  }

  // 6. Gerar OTP de 6 dígitos aleatório
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
  const otpHash = $security.sha256(otpCode)
  const now = new Date()
  const expiraOtp = new Date(now.getTime() + 5 * 60 * 1000) // 5 min
  const expiraSessao = new Date(now.getTime() + 30 * 60 * 1000) // 30 min

  // 7. Revogar qualquer sessão ativa anterior da mesma unidade e deliberação
  try {
    const sessoesAntigas = e.app.findRecordsByFilter(
      'sessoes',
      "unidade = {:unidade} && deliberacao = {:delib} && status = 'ativa'",
      '',
      50,
      0,
      { unidade: unidadeId, delib: deliberacaoId },
    )
    for (let s of sessoesAntigas) {
      s.set('status', 'revogada')
      e.app.save(s)
    }
  } catch (_) {}

  // 8. Criar nova sessão
  const sessoesCol = e.app.findCollectionByNameOrId('sessoes')
  const sessaoRec = new Record(sessoesCol)
  sessaoRec.set('user', authRecord.id)
  sessaoRec.set('unidade', unidadeId)
  sessaoRec.set('deliberacao', deliberacaoId)
  sessaoRec.set('otp_codigo_hash', otpHash)
  sessaoRec.set('otp_expira_em', expiraOtp.toISOString().replace('T', ' ').substring(0, 19))
  sessaoRec.set('expira_em', expiraSessao.toISOString().replace('T', ' ').substring(0, 19))
  sessaoRec.set('tentativas_falhas', 0)
  sessaoRec.set('status', 'ativa')
  e.app.save(sessaoRec)

  // 9. Registrar evento na auditoria
  try {
    registrarAuditoria(e.app, {
      evento: 'otp_enviado',
      unidade: unidadeId,
      fator: 'SMS/WhatsApp OTP gerado',
      dispositivo: e.requestInfo().headers['user-agent'] || 'navegador',
    })
  } catch (err) {
    console.log('Erro ao registrar auditoria otp_enviado:', err)
  }

  const celular = unidadeRec.getString('contato_celular') || ''
  let celularMascara = '•••• •••• ' + (celular.slice(-4) || '0000')

  return e.json(200, {
    success: true,
    sessaoId: sessaoRec.id,
    celularMascara: celularMascara,
    expiraEmSegundos: 300,
    devOtpCode: otpCode,
    message: 'Enviamos um código de verificação para o número cadastrado da unidade.',
  })
})

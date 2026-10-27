/**
 * Hook POST /backend/v1/votos/registrar
 * Valida e consome ATOMICAMENTE o token de voto de uso único.
 * Verifica unicidade deliberação + unidade.
 * Grava cédulas + comparecimentos.
 * Encadeia o hash de cada cédula ao hash anterior (SHA-256).
 * Cria comprovante com código de conferência de 8 caracteres.
 * Registra evento cedula_registrada na auditoria.
 * Bloqueia se houver presença física registrada (reconciliação).
 */

routerAdd('POST', '/backend/v1/votos/registrar', (e) => {
  function calcularSha256(str) {
    return $security.sha256(str || '')
  }

  function gerarCodigoConferencia() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      const idx = Math.floor(Math.random() * chars.length)
      code += chars.charAt(idx)
    }
    return code
  }

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
  const tokenVoto = (body.tokenVoto || '').trim()
  const deliberacaoId = body.deliberacaoId
  const votos = body.votos || [] // array de { itemId, opcao }
  const dispositivoId = body.dispositivoId || e.requestInfo().headers['user-agent'] || 'web-browser'

  if (!tokenVoto || !deliberacaoId || !Array.isArray(votos) || votos.length === 0) {
    return e.json(400, {
      success: false,
      message: 'tokenVoto, deliberacaoId e lista de votos são obrigatórios',
    })
  }

  // 1. Validar deliberação
  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação não encontrada' })
  }

  if (delib.getString('status') !== 'EM_VOTACAO') {
    return e.json(400, {
      success: false,
      message: 'Esta deliberação não está aberta para votação.',
    })
  }

  // 2. Validar token de voto na sessão
  let sessao
  try {
    const sessoes = e.app.findRecordsByFilter(
      'sessoes',
      "token_voto = {:token} && deliberacao = {:delib} && status = 'ativa'",
      '-created',
      1,
      0,
      { token: tokenVoto, delib: deliberacaoId },
    )
    if (!sessoes || sessoes.length === 0) {
      return e.json(400, {
        success: false,
        message: 'Token de voto inválido, expirado ou já consumido.',
      })
    }
    sessao = sessoes[0]
  } catch (err) {
    return e.json(400, {
      success: false,
      message: 'Erro ao verificar token de voto: ' + (err?.message || ''),
    })
  }

  const unidadeId = sessao.getString('unidade')

  // 3. Reconciliação: verificar se a unidade possui presença física registrada
  try {
    const presencasFisicas = e.app.findRecordsByFilter(
      'presencas',
      "deliberacao = {:delib} && unidade = {:unidade} && tipo = 'presencial'",
      '',
      1,
      0,
      { delib: deliberacaoId, unidade: unidadeId },
    )
    if (presencasFisicas && presencasFisicas.length > 0) {
      return e.json(400, {
        success: false,
        message:
          'A unidade possui presença presencial registrada. O voto eletrônico está bloqueado.',
      })
    }
  } catch (err) {
    if (err && err.message && err.message.includes('presencial registrada')) {
      return e.json(400, { success: false, message: err.message })
    }
  }

  // 4. Verificar se a unidade já compareceu nesta deliberação
  try {
    const compJaExiste = e.app.findRecordsByFilter(
      'comparecimentos',
      'deliberacao = {:delib} && unidade = {:unidade}',
      '',
      1,
      0,
      { delib: deliberacaoId, unidade: unidadeId },
    )
    if (compJaExiste && compJaExiste.length > 0) {
      return e.json(400, {
        success: false,
        message: 'Voto já computado para esta unidade nesta deliberação.',
      })
    }
  } catch (err) {
    if (err && err.message && err.message.includes('já computado')) {
      return e.json(400, { success: false, message: err.message })
    }
  }

  // Determinar o vínculo da pessoa que está votando a partir do credenciamento aprovado ou cadastro
  let vinculoVotante = 'proprietario' // default seguro
  try {
    const creds = e.app.findRecordsByFilter(
      'credenciamentos',
      "unidade = {:unidade} && status = 'aprovado'",
      '-created',
      10,
      0,
      { unidade: unidadeId },
    )
    // Tentar localizar credenciamento pelo usuário autenticado ou pelo CPF associado
    const userCpf = (authRecord.getString('cpf') || '').replace(/[.\-\s]/g, '')
    let credMatch = null
    for (let c of creds) {
      const cCpf = (c.getString('cpf') || '').replace(/[.\-\s]/g, '')
      if (userCpf && cCpf === userCpf) {
        credMatch = c
        break
      }
    }
    if (!credMatch && creds.length > 0) {
      credMatch = creds[0]
    }
    if (credMatch) {
      const tv = credMatch.getString('tipo_vinculo')
      if (tv === 'locatario') vinculoVotante = 'locatario'
      else if (tv === 'condomino') vinculoVotante = 'condomino'
      else vinculoVotante = 'proprietario'
    } else {
      // Buscar nos cadastros_unidade
      const cads = e.app.findRecordsByFilter(
        'cadastros_unidade',
        'unidade = {:unidade} && ativo = true',
        '-created',
        5,
        0,
        { unidade: unidadeId },
      )
      for (let cad of cads) {
        const cadCpf = (cad.getString('cpf') || '').replace(/[.\-\s]/g, '')
        if (userCpf && cadCpf === userCpf) {
          const cv = cad.getString('vinculo')
          if (cv === 'locatario') vinculoVotante = 'locatario'
          else if (cv === 'condomino') vinculoVotante = 'condomino'
          else vinculoVotante = 'proprietario'
          break
        }
      }
    }
  } catch (err) {
    console.log('Aviso ao determinar vínculo do votante:', err)
  }

  const isMorador = vinculoVotante === 'condomino' || vinculoVotante === 'locatario'

  // Validar regra_locatario para cada item de pauta antes da gravação
  const delibDefaultLocatario = delib.getBool('locatario_pode_votar')
  const defaultRegraDelib = delibDefaultLocatario ? 'morador_vota_sempre' : 'somente_proprietario'

  for (let v of votos) {
    let itemRec
    try {
      itemRec = e.app.findRecordById('itens_pauta', v.itemId)
    } catch (_) {
      return e.json(400, { success: false, message: 'Item de pauta não encontrado: ' + v.itemId })
    }

    const regraItem = itemRec.getString('regra_locatario') || defaultRegraDelib

    if (vinculoVotante === 'locatario') {
      if (regraItem === 'somente_proprietario') {
        return e.json(400, {
          success: false,
          message: `O item "${itemRec.getString('titulo')}" permite apenas o voto de proprietários. Voto de locatário não admitido para esta matéria.`,
        })
      }

      if (regraItem === 'morador_substitui_ausente') {
        // Verificar se o proprietário daquela unidade credenciou e está presente/votou
        // 1. Verificar se há credenciamento de proprietário aprovado
        const credsProp = e.app.findRecordsByFilter(
          'credenciamentos',
          "unidade = {:unidade} && status = 'aprovado' && (tipo_vinculo = 'proprietario' || tipo_vinculo = 'promitente' || tipo_vinculo = 'usufrutuario')",
          '',
          5,
          0,
          { unidade: unidadeId },
        )
        // Se houver presença registrada ou credenciamento com sessão do proprietário, morador não substitui
        if (credsProp && credsProp.length > 0) {
          // Checar se o proprietário participou de alguma forma
          const sessoesProp = e.app.findRecordsByFilter(
            'sessoes',
            "unidade = {:unidade} && deliberacao = {:delib} && status = 'consumida'",
            '',
            1,
            0,
            { unidade: unidadeId, delib: deliberacaoId },
          )
          if (sessoesProp && sessoesProp.length > 0) {
            return e.json(400, {
              success: false,
              message: `O proprietário desta unidade já participou desta assembleia. Na regra "morador substitui ausente", o locatário não pode votar caso o proprietário tenha participado.`,
            })
          }
        }
      }
    }
  }

  // Obter hash anônimo da unidade (salteado com a deliberação para sigilo de voto em cédula secreta)
  const isNominal = delib.getString('tipo_cedula') === 'nominal'
  const unidadeHash = isNominal
    ? 'UNIDADE_' + unidadeId
    : $security.sha256('SIGILO:' + deliberacaoId + ':' + unidadeId)

  // Executar transação atômica
  let reciboCodigo = ''
  let comprovanteId = ''
  let dataHoraAgora = new Date().toISOString().replace('T', ' ').substring(0, 19)
  let hashAbreviado = ''

  e.app.runInTransaction((txApp) => {
    // A) Consumir atomicamente o token
    sessao.set('status', 'consumida')
    sessao.set('token_voto', '')
    txApp.save(sessao)

    // B) Gerar código de conferência do recibo
    reciboCodigo = gerarCodigoConferencia()

    // C) Registrar comparecimento (quem votou)
    const compCol = txApp.findCollectionByNameOrId('comparecimentos')
    const compRec = new Record(compCol)
    compRec.set('deliberacao', deliberacaoId)
    compRec.set('unidade', unidadeId)
    compRec.set('data_hora', dataHoraAgora)
    compRec.set('fator_usado', '2FA (Conhecimento + OTP)')
    compRec.set('dispositivo_id', dispositivoId)
    txApp.save(compRec)

    // Registrar presença remota se ainda não tiver
    try {
      const presCol = txApp.findCollectionByNameOrId('presencas')
      const presRec = new Record(presCol)
      presRec.set('deliberacao', deliberacaoId)
      presRec.set('unidade', unidadeId)
      presRec.set('tipo', 'remoto')
      presRec.set('data_hora', dataHoraAgora)
      txApp.save(presRec)
    } catch (_) {
      // já existe presença
    }

    // D) Gravar cada cédula encadeada
    const cedulasCol = txApp.findCollectionByNameOrId('cedulas')

    // Buscar o último hash de cédula nesta deliberação
    let ultimoHashCedula = '0000000000000000000000000000000000000000000000000000000000000000'
    try {
      const ultimasCedulas = txApp.findRecordsByFilter(
        'cedulas',
        'deliberacao = {:delib}',
        '-created',
        1,
        0,
        { delib: deliberacaoId },
      )
      if (ultimasCedulas && ultimasCedulas.length > 0) {
        ultimoHashCedula = ultimasCedulas[0].getString('hash_cedula') || ultimoHashCedula
      }
    } catch (_) {}

    let hashesCedulas = []

    for (let v of votos) {
      const opcao = (v.opcao || '').toLowerCase()
      if (!['favoravel', 'contrario', 'abstencao', 'nulo', 'branco'].includes(opcao)) {
        throw new BadRequestError('Opção inválida: ' + opcao)
      }

      const cedulaPayload = JSON.stringify({
        deliberacao: deliberacaoId,
        item: v.itemId,
        unidade_hash: unidadeHash,
        opcao: opcao,
        timestamp: dataHoraAgora,
        recibo_codigo: reciboCodigo,
      })

      const hashCedula = calcularSha256(ultimoHashCedula + ':' + cedulaPayload)
      ultimoHashCedula = hashCedula
      hashesCedulas.push(hashCedula)

      // Obter regra do item para auditoria da cédula
      let regraAplicadaItem = defaultRegraDelib
      try {
        const itemRecord = txApp.findRecordById('itens_pauta', v.itemId)
        regraAplicadaItem = itemRecord.getString('regra_locatario') || defaultRegraDelib
      } catch (_) {}

      const cedRec = new Record(cedulasCol)
      cedRec.set('deliberacao', deliberacaoId)
      cedRec.set('item', v.itemId)
      cedRec.set('unidade_hash', unidadeHash)
      cedRec.set('opcao', opcao)
      cedRec.set('timestamp', dataHoraAgora)
      cedRec.set('hash_anterior', ultimoHashCedula)
      cedRec.set('hash_cedula', hashCedula)
      cedRec.set('recibo_codigo', reciboCodigo)
      cedRec.set('vinculo_votante', vinculoVotante)
      cedRec.set('regra_aplicada', regraAplicadaItem)
      txApp.save(cedRec)
    }

    hashAbreviado = (hashesCedulas[hashesCedulas.length - 1] || '').substring(0, 12)

    // E) Gravar comprovante
    const comprovantesCol = txApp.findCollectionByNameOrId('comprovantes')
    const comprovanteRec = new Record(comprovantesCol)
    comprovanteRec.set('deliberacao', deliberacaoId)
    comprovanteRec.set('unidade', unidadeId)
    comprovanteRec.set('codigo_conferencia', reciboCodigo)
    comprovanteRec.set('hash_abreviado', hashAbreviado)
    comprovanteRec.set('data_hora', dataHoraAgora)
    txApp.save(comprovanteRec)
    comprovanteId = comprovanteRec.id

    // F) Auditoria: cedula_registrada
    registrarAuditoria(txApp, {
      evento: 'cedula_registrada',
      unidade: unidadeId,
      fator: 'Urna Criptográfica SHA-256',
      dispositivo: dispositivoId,
    })
  })

  return e.json(200, {
    success: true,
    reciboCodigo: reciboCodigo,
    comprovanteId: comprovanteId,
    hashAbreviado: hashAbreviado,
    dataHora: dataHoraAgora,
    deliberacaoId: deliberacaoId,
    message: 'Voto registrado com sucesso com prova de integridade e recibo gerado.',
  })
})

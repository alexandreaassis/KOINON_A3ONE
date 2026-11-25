/// <reference path="../pb_data/types.d.ts" />
/**
 * Estação de voto presencial (tablet no salão) — autenticada por login da mesa.
 *
 * POST /backend/v1/estacao/login
 *   body: { deliberacaoId, cpf, senha?, codigo? }
 *   - modo senha: CPF + senha própria da plataforma (PocketBase users auth)
 *   - modo código: CPF + código de uso único gerado pela mesa p/ aquela unidade
 *   retorno: { success, tokenVoto, unidadeId, unidadeIdentificador, nomeTitular, modo }
 *
 * POST /backend/v1/estacao/registrar-voto
 *   body: { tokenVoto, deliberacaoId, votos: [{ itemId, opcao }] , dispositivoId? }
 *   - grava na MESMA urna criptográfica (cedulas + comprovante), sigilo preservado
 *   - marca o código de uso único como usado (se for o caso) e grava auditoria
 */

routerAdd('POST', '/backend/v1/estacao/login', (e) => {
  // ---- auxiliares inline (JSVM: nada em top-level) ----
  function sanitizarCpf(str) {
    return (str || '').replace(/[^\d]/g, '')
  }

  function mascararCpf(cpf) {
    const d = sanitizarCpf(cpf)
    if (d.length !== 11) return d
    return d.substring(0, 3) + '.***.***-' + d.substring(9)
  }

  function validarFormatoCpf(digitos) {
    if (!digitos || digitos.length !== 11) return false
    if (/^(\d)\1{10}$/.test(digitos)) return false
    let soma = 0
    for (let i = 0; i < 9; i++) soma += parseInt(digitos.charAt(i), 10) * (10 - i)
    let resto = (soma * 10) % 11
    if (resto === 10) resto = 0
    if (resto !== parseInt(digitos.charAt(9), 10)) return false
    soma = 0
    for (let i = 0; i < 10; i++) soma += parseInt(digitos.charAt(i), 10) * (11 - i)
    resto = (soma * 10) % 11
    if (resto === 10) resto = 0
    return resto === parseInt(digitos.charAt(10), 10)
  }

  function erro(e, status, msg) {
    return e.json(status, { success: false, message: msg })
  }

  // ---- corpo ----
  const body = e.requestInfo().body || {}
  const deliberacaoId = (body.deliberacaoId || '').toString()
  const cpfDigitado = sanitizarCpf(body.cpf)
  const senha = (body.senha || '').toString()
  const codigo = (body.codigo || '').toString().trim().toUpperCase()

  if (!deliberacaoId || !cpfDigitado) {
    return erro(e, 400, 'Deliberação e CPF são obrigatórios.')
  }
  if (!validarFormatoCpf(cpfDigitado)) {
    return erro(e, 400, 'CPF inválido. Verifique os dígitos informados.')
  }
  if (!senha && !codigo) {
    return erro(
      e,
      400,
      'Informe a senha da plataforma ou o código de uso único fornecido pela Mesa.',
    )
  }

  // Deliberação aberta em modo estação
  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return erro(e, 404, 'Deliberação não encontrada.')
  }
  if (delib.getString('status') !== 'EM_VOTACAO') {
    return erro(e, 400, 'Esta deliberação não está aberta para votação.')
  }
  const modalidade = delib.getString('modalidade_presencial') || 'manual'
  if (modalidade !== 'estacao') {
    return erro(e, 400, 'Esta deliberação não está configurada para a estação de voto presencial.')
  }

  // Unidade pelo CPF (credenciamento aprovado ou cadastro ativo)
  let unidadeId = ''
  let unidadeIdentificador = ''
  let nomeTitular = ''
  let vinculoVotante = 'proprietario'
  try {
    const creds = e.app.findRecordsByFilter(
      'credenciamentos',
      "cpf = {:cpf} && status = 'aprovado'",
      '-created',
      10,
      0,
      { cpf: cpfDigitado },
    )
    if (creds && creds.length > 0) {
      // Preferir credenciamento da deliberação corrente, se informado
      let escolhido = null
      for (let c of creds) {
        try {
          const vinc = c.getString('tipo_vinculo') || 'proprietario'
          const tv = Array.isArray(vinc) ? vinc[0] : String(vinc)
          if (tv === 'procurador') continue
          escolhido = c
          vinculoVotante =
            tv === 'condomino' ? 'condomino' : tv === 'locatario' ? 'locatario' : 'proprietario'
          break
        } catch (_) {
          escolhido = c
          break
        }
      }
      if (!escolhido) escolhido = creds[0]
      unidadeId = escolhido.getString('unidade')
      nomeTitular = escolhido.getString('titular_nome') || ''
      if (!vinculoVotante || vinculoVotante === 'proprietario') {
        const tv = escolhido.getString('tipo_vinculo') || 'proprietario'
        const t = Array.isArray(tv) ? tv[0] : String(tv)
        vinculoVotante =
          t === 'condomino' ? 'condomino' : t === 'locatario' ? 'locatario' : 'proprietario'
      }
    }
  } catch (_) {}

  if (!unidadeId) {
    try {
      const cads = e.app.findRecordsByFilter(
        'cadastros_unidade',
        'cpf = {:cpf} && ativo = true',
        '-created',
        5,
        0,
        { cpf: cpfDigitado },
      )
      if (cads && cads.length > 0) {
        unidadeId = cads[0].getString('unidade')
        nomeTitular = cads[0].getString('responsavel_nome') || cads[0].getString('nome') || ''
        const cv = cads[0].getString('vinculo') || 'proprietario'
        vinculoVotante =
          cv === 'condomino' ? 'condomino' : cv === 'locatario' ? 'locatario' : 'proprietario'
      }
    } catch (_) {}
  }

  if (!unidadeId) {
    return erro(
      e,
      403,
      'CPF sem credenciamento aprovado nesta assembleia. Procure a Mesa Diretora.',
    )
  }

  let unidade
  try {
    unidade = e.app.findRecordById('unidades', unidadeId)
    unidadeIdentificador = unidade.getString('identificador') || ''
  } catch (_) {
    return erro(e, 404, 'Unidade do credenciamento não encontrada.')
  }

  // Credencial: senha própria OU código de uso único
  let modo = ''
  let authUser = null

  if (senha) {
    // users.cpf não é indexável como auth identificador: localiza o usuário pela
    // coleção de cadastros (cpf normalizado) e valida a senha contra a conta dele.
    let cpfConta = cpfDigitado
    try {
      const vincUsers = e.app.findRecordsByFilter(
        'cadastros_unidade',
        'cpf = {:cpf} && user_vinculado != ""',
        '-created',
        1,
        0,
        { cpf: cpfDigitado },
      )
      if (vincUsers && vincUsers.length > 0) {
        const uv = vincUsers[0].getString('user_vinculado')
        if (uv) cpfConta = e.app.findRecordById('users', uv).getString('cpf') || cpfDigitado
      }
    } catch (_) {}
    try {
      authUser = e.app.findFirstRecordByFilter('users', 'cpf = {:cpf}', { cpf: cpfConta })
    } catch (_) {
      authUser = null
    }
    if (!authUser) {
      return erro(
        e,
        401,
        'Não existe conta com este CPF. Use o código de uso único fornecido pela Mesa.',
      )
    }
    let senhaOk = false
    try {
      if (typeof authUser.validatePassword === 'function')
        senhaOk = authUser.validatePassword(senha)
    } catch (_) {
      senhaOk = false
    }
    if (!senhaOk) {
      return erro(e, 401, 'Senha incorreta para este CPF.')
    }
    if (authUser.getBool('ativo') === false) {
      return erro(e, 403, 'Conta desativada. Procure a Mesa Diretora.')
    }
    modo = 'senha'
  } else {
    // modo código — compara hash do código informado com os códigos ativos da unidade
    const codigoHash = $security.sha256('KCUU:' + deliberacaoId + ':' + unidadeId + ':' + codigo)
    let codigoRec = null
    try {
      const candidatos = e.app.findRecordsByFilter(
        'codigos_uso_unico',
        "deliberacao = {:d} && unidade = {:u} && status = 'ativo'",
        '-created',
        10,
        0,
        { d: deliberacaoId, u: unidadeId },
      )
      for (let c of candidatos) {
        if ((c.getString('codigo_hash') || '') === codigoHash) {
          codigoRec = c
          break
        }
      }
    } catch (_) {}

    if (!codigoRec) {
      return erro(e, 401, 'Código de uso único inválido ou já utilizado. Solicite um novo à Mesa.')
    }
    const expiraEm = codigoRec.getDateTime('expira_em')
    if (expiraEm && new Date(expiraEm.string()) < new Date()) {
      try {
        codigoRec.set('status', 'expirado')
        e.app.save(codigoRec)
      } catch (_) {}
      return erro(e, 401, 'Código expirado. Solicite um novo à Mesa.')
    }
    try {
      codigoRec.set('status', 'usado')
      codigoRec.set('usado_em', new Date().toISOString().replace('T', ' ').substring(0, 19))
      codigoRec.set('usado_por_cpf_mascara', mascararCpf(cpfDigitado))
      e.app.save(codigoRec)
    } catch (err) {
      console.log('Aviso ao marcar código como usado:', err)
    }
    modo = 'codigo'
  }

  // Regra 1 unidade = 1 voto: bloqueia se a unidade já compareceu (online ou estação)
  try {
    const comp = e.app.findRecordsByFilter(
      'comparecimentos',
      'deliberacao = {:d} && unidade = {:u}',
      '',
      1,
      0,
      { d: deliberacaoId, u: unidadeId },
    )
    if (comp && comp.length > 0) {
      return erro(e, 400, 'Esta unidade já registrou voto nesta deliberação (1 unidade = 1 voto).')
    }
  } catch (_) {}

  // Regra de sessões remotas ativas: se já houver token remoto ativo, revoga para garantir exclusividade
  try {
    const ativas = e.app.findRecordsByFilter(
      'sessoes',
      "unidade = {:u} && deliberacao = {:d} && status = 'ativa'",
      '-created',
      5,
      0,
      { u: unidadeId, d: deliberacaoId },
    )
    for (let s of ativas) {
      s.set('status', 'revogada')
      e.app.save(s)
    }
  } catch (_) {}

  // Presença presencial: se ainda não registrada, registra (alimenta o quórum ao vivo)
  try {
    const presencas = e.app.findRecordsByFilter(
      'presencas',
      "deliberacao = {:d} && unidade = {:u} && tipo = 'presencial'",
      '',
      1,
      0,
      { d: deliberacaoId, u: unidadeId },
    )
    if (!presencas || presencas.length === 0) {
      const presCol = e.app.findCollectionByNameOrId('presencas')
      const presRec = new Record(presCol)
      presRec.set('deliberacao', deliberacaoId)
      presRec.set('unidade', unidadeId)
      presRec.set('tipo', 'presencial')
      presRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
      e.app.save(presRec)
    }
  } catch (_) {}

  // Emite token de voto de uso único (mesma mecânica do canal remoto)
  const tokenVoto = $security.randomString(64)
  try {
    const sessCol = e.app.findCollectionByNameOrId('sessoes')
    const sessRec = new Record(sessCol)
    if (authUser) sessRec.set('user', authUser.id)
    sessRec.set('unidade', unidadeId)
    sessRec.set('deliberacao', deliberacaoId)
    sessRec.set('token_voto', tokenVoto)
    sessRec.set('status', 'ativa')
    sessRec.set('expira_em', new Date(Date.now() + 15 * 60 * 1000).toISOString())
    e.app.save(sessRec)
  } catch (err) {
    return erro(e, 500, 'Falha ao abrir sessão de voto: ' + (err?.message || ''))
  }

  return e.json(200, {
    success: true,
    tokenVoto: tokenVoto,
    unidadeId: unidadeId,
    unidadeIdentificador: unidadeIdentificador,
    nomeTitular: nomeTitular,
    vinculoVotante: vinculoVotante,
    modo: modo,
    message: 'Identidade confirmada. Cabine de voto presencial liberada.',
  })
})

routerAdd('POST', '/backend/v1/estacao/registrar-voto', (e) => {
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

  function registrarAuditoria(txApp, dados) {
    try {
      const audCol = txApp.findCollectionByNameOrId('auditoria_events')
      let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
      let proximoSeq = 1
      try {
        const ultimos = txApp.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
        if (ultimos && ultimos.length > 0) {
          ultimoHash = ultimos[0].getString('hash_evento') || ultimoHash
          proximoSeq = (ultimos[0].getInt('sequencial') || 0) + 1
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
      txApp.save(rec)
    } catch (err) {
      console.log('Erro ao registrar auditoria interna:', err)
    }
  }

  const body = e.requestInfo().body || {}
  const tokenVoto = (body.tokenVoto || '').trim()
  const deliberacaoId = (body.deliberacaoId || '').toString()
  const votos = body.votos || []
  const dispositivoId =
    body.dispositivoId || e.requestInfo().headers['user-agent'] || 'estacao-presencial'

  if (!tokenVoto || !deliberacaoId || !Array.isArray(votos) || votos.length === 0) {
    return e.json(400, {
      success: false,
      message: 'tokenVoto, deliberacaoId e votos são obrigatórios.',
    })
  }

  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação não encontrada.' })
  }
  if (delib.getString('status') !== 'EM_VOTACAO') {
    return e.json(400, {
      success: false,
      message: 'Esta deliberação não está aberta para votação.',
    })
  }
  if ((delib.getString('modalidade_presencial') || 'manual') !== 'estacao') {
    return e.json(400, {
      success: false,
      message: 'Deliberação não configurada para a estação de voto presencial.',
    })
  }

  // Token de uso único emitido pelo login da estação
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
        message: 'Sessão de voto inválida ou já consumida. Faça a autenticação novamente.',
      })
    }
    sessao = sessoes[0]
  } catch (err) {
    return e.json(400, {
      success: false,
      message: 'Erro ao verificar sessão: ' + (err?.message || ''),
    })
  }

  const unidadeId = sessao.getString('unidade')

  // Exclusividade do canal: já houve comparecimento (online ou estação)?
  try {
    const comp = e.app.findRecordsByFilter(
      'comparecimentos',
      'deliberacao = {:d} && unidade = {:u}',
      '',
      1,
      0,
      { d: deliberacaoId, u: unidadeId },
    )
    if (comp && comp.length > 0) {
      return e.json(400, {
        success: false,
        message: 'Esta unidade já registrou voto nesta deliberação (1 unidade = 1 voto).',
      })
    }
  } catch (_) {}

  // Vínculo do votante (mesma lógica do canal remoto)
  let vinculoVotante = 'proprietario'
  try {
    const cads = e.app.findRecordsByFilter(
      'cadastros_unidade',
      'unidade = {:u} && ativo = true',
      '-created',
      5,
      0,
      { u: unidadeId },
    )
    if (cads && cads.length > 0) {
      const cv = cads[0].getString('vinculo') || 'proprietario'
      vinculoVotante =
        cv === 'condomino' ? 'condomino' : cv === 'locatario' ? 'locatario' : 'proprietario'
    }
  } catch (_) {}

  const isNominal = delib.getString('tipo_cedula') === 'nominal'
  const unidadeHash = isNominal
    ? 'UNIDADE_' + unidadeId
    : $security.sha256('SIGILO:' + deliberacaoId + ':' + unidadeId)

  let reciboCodigo = ''
  let comprovanteId = ''
  let dataHoraAgora = new Date().toISOString().replace('T', ' ').substring(0, 19)
  let hashAbreviado = ''

  e.app.runInTransaction((txApp) => {
    // A) Consumir o token da sessão da estação
    sessao.set('status', 'consumida')
    sessao.set('token_voto', '')
    txApp.save(sessao)

    reciboCodigo = gerarCodigoConferencia()

    // B) Comparecimento da unidade (bloqueia o canal online pelo mesmo critério
    //    que o voto remoto usa para bloquear a estação)
    const compCol = txApp.findCollectionByNameOrId('comparecimentos')
    const compRec = new Record(compCol)
    compRec.set('deliberacao', deliberacaoId)
    compRec.set('unidade', unidadeId)
    compRec.set('data_hora', dataHoraAgora)
    compRec.set('fator_usado', 'Estação presencial (CPF + credencial própria)')
    compRec.set('dispositivo_id', dispositivoId)
    txApp.save(compRec)

    // C) Presença presencial (alimenta o quórum ao vivo)
    try {
      const presencas = txApp.findRecordsByFilter(
        'presencas',
        "deliberacao = {:d} && unidade = {:u} && tipo = 'presencial'",
        '',
        1,
        0,
        { d: deliberacaoId, u: unidadeId },
      )
      if (!presencas || presencas.length === 0) {
        const presCol = txApp.findCollectionByNameOrId('presencas')
        const presRec = new Record(presCol)
        presRec.set('deliberacao', deliberacaoId)
        presRec.set('unidade', unidadeId)
        presRec.set('tipo', 'presencial')
        presRec.set('data_hora', dataHoraAgora)
        txApp.save(presRec)
      }
    } catch (_) {}

    // D) Cédulas encadeadas na MESMA urna SHA-256 do voto remoto
    const cedulasCol = txApp.findCollectionByNameOrId('cedulas')
    let ultimoHashCedula = '0000000000000000000000000000000000000000000000000000000000000000'
    try {
      const ultimas = txApp.findRecordsByFilter('cedulas', 'deliberacao = {:d}', '-created', 1, 0, {
        d: deliberacaoId,
      })
      if (ultimas && ultimas.length > 0) {
        ultimoHashCedula = ultimas[0].getString('hash_cedula') || ultimoHashCedula
      }
    } catch (_) {}

    const hashesCedulas = []
    for (let v of votos) {
      const ultimoHashAntesDoItem = ultimoHashCedula
      const opcao = (v.opcao || '').toLowerCase()
      if (!['favoravel', 'contrario', 'abstencao'].includes(opcao)) {
        throw new BadRequestError('Opção de voto inválida: ' + opcao)
      }
      let itemRec
      try {
        itemRec = txApp.findRecordById('itens_pauta', v.itemId)
      } catch (_) {
        throw new BadRequestError('Item de pauta não encontrado: ' + v.itemId)
      }
      const cedulaPayload = JSON.stringify({
        deliberacao: deliberacaoId,
        item: v.itemId,
        unidade_hash: unidadeHash,
        opcao: opcao,
        timestamp: dataHoraAgora,
        recibo_codigo: reciboCodigo,
        canal: 'estacao_presencial',
      })
      const hashCedula = calcularSha256(ultimoHashCedula + ':' + cedulaPayload)
      ultimoHashCedula = hashCedula
      hashesCedulas.push(hashCedula)

      const cedRec = new Record(cedulasCol)
      cedRec.set('deliberacao', deliberacaoId)
      cedRec.set('item', v.itemId)
      cedRec.set('unidade_hash', unidadeHash)
      cedRec.set('opcao', opcao)
      cedRec.set('timestamp', dataHoraAgora)
      cedRec.set('hash_anterior', ultimoHashAntesDoItem)
      cedRec.set('hash_cedula', hashCedula)
      cedRec.set('recibo_codigo', reciboCodigo)
      cedRec.set('vinculo_votante', vinculoVotante)
      cedRec.set('regra_aplicada', itemRec.getString('regra_locatario') || '')
      cedRec.set('declaracao_representante_legal', false)
      txApp.save(cedRec)
    }

    hashAbreviado = (hashesCedulas[hashesCedulas.length - 1] || '').substring(0, 12)

    // E) Comprovante com código de conferência (igual ao do voto remoto)
    const comprovantesCol = txApp.findCollectionByNameOrId('comprovantes')
    const comprovanteRec = new Record(comprovantesCol)
    comprovanteRec.set('deliberacao', deliberacaoId)
    comprovanteRec.set('unidade', unidadeId)
    comprovanteRec.set('codigo_conferencia', reciboCodigo)
    comprovanteRec.set('hash_abreviado', hashAbreviado)
    comprovanteRec.set('data_hora', dataHoraAgora)
    txApp.save(comprovanteRec)
    comprovanteId = comprovanteRec.id

    // F) Auditoria
    registrarAuditoria(txApp, {
      evento: 'cedula_registrada_estacao_presencial',
      unidade: unidadeId,
      fator: 'Estação presencial (CPF + credencial própria)',
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
    unidadeId: unidadeId,
    message: 'Voto presencial registrado na urna criptográfica com recibo.',
  })
})

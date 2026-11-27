/// <reference path="../pb_data/types.d.ts" />
/**
 * Hook de lançamento manual pela mesa
 *
 * - GET  /backend/v1/votos/lancamento-fisico/:deliberacaoId → lista lançamentos
 * - POST /backend/v1/votos/lancamento-fisico               → cria/atualiza lançamento
 *
 * Regras:
 * - Só mesa/admin (via auth).
 * - Deliberação deve estar EM_VOTACAO ou APURADA (permitido corrigir até publicar).
 * - Trilha de auditoria: guarda valores anteriores em valores_anteriores (JSON)
 *   e registra evento lancamento_fisico na auditoria_events (com hash encadeado).
 * - A consolidação digital + físico é feita na leitura (boletim): soma das cédulas
 *   da urna + lancamentos_fisicos do item.
 * - Migration 0055 (modo eleição 0054): item de eleição lança contagem por
 *   candidato em votos_por_candidato (array de números, índice = candidato).
 */

routerAdd('GET', '/backend/v1/votos/lancamento-fisico/{deliberacaoId}', (e) => {
  const auth = e.auth
  if (!auth || !['mesa', 'admin'].includes(auth.getString('role'))) {
    return e.json(403, { success: false, message: 'Acesso restrito à mesa/admin.' })
  }
  const deliberacaoId = e.request.pathValue('deliberacaoId')
  let lancamentos
  try {
    lancamentos = e.app.findRecordsByFilter(
      'lancamentos_fisicos',
      'deliberacao = {:delib}',
      '-created',
      500,
      0,
      { delib: deliberacaoId },
    )
  } catch (err) {
    return e.json(500, {
      success: false,
      message: 'Erro ao buscar lançamentos: ' + (err?.message || ''),
    })
  }
  // Helper inline: lê votos_por_candidato (JSON array de números, 0055)
  function lerPorCandidato(l) {
    try {
      const arr = JSON.parse(l.getString('votos_por_candidato') || '[]')
      return Array.isArray(arr) ? arr : []
    } catch (_) {
      return []
    }
  }
  const lista = lancamentos.map((l) => ({
    id: l.id,
    deliberacao: l.getString('deliberacao'),
    item: l.getString('item'),
    favoraveis: l.getInt('favoraveis'),
    contrarios: l.getInt('contrarios'),
    abstencoes: l.getInt('abstencoes'),
    votos_por_candidato: lerPorCandidato(l),
    lancado_por: l.getString('lancado_por'),
    valores_anteriores: l.getString('valores_anteriores') || '',
    observacao: l.getString('observacao') || '',
    created: l.getString('created'),
    updated: l.getString('updated'),
  }))
  return e.json(200, { success: true, lancamentos: lista })
})

routerAdd('POST', '/backend/v1/votos/lancamento-fisico', (e) => {
  function registrarAuditoriaLanc(app, dados) {
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
    } catch (err) {
      console.log('Erro ao registrar auditoria interna:', err)
    }
  }

  const auth = e.auth
  if (!auth || !['mesa', 'admin'].includes(auth.getString('role'))) {
    return e.json(403, { success: false, message: 'Acesso restrito à mesa/admin.' })
  }

  const body = e.requestInfo().body || {}
  const deliberacaoId = (body.deliberacaoId || '').trim()
  const itemId = (body.itemId || '').trim()
  const favoraveis = Number(body.favoraveis || 0)
  const contrarios = Number(body.contrarios || 0)
  const abstencoes = Number(body.abstencoes || 0)
  const observacao = (body.observacao || '').trim()

  // Migration 0055: contagem por candidato (item do modo eleição, 0054)
  let votosPorCandidato = []
  if (body.votosPorCandidato !== undefined && body.votosPorCandidato !== null) {
    if (!Array.isArray(body.votosPorCandidato)) {
      return e.json(400, {
        success: false,
        message: 'votosPorCandidato deve ser um array de números inteiros não negativos.',
      })
    }
    votosPorCandidato = body.votosPorCandidato
    for (let vc of votosPorCandidato) {
      const n = Number(vc || 0)
      if (!Number.isInteger(n) || n < 0) {
        return e.json(400, {
          success: false,
          message: 'votosPorCandidato deve conter apenas inteiros não negativos.',
        })
      }
    }
    votosPorCandidato = votosPorCandidato.map((vc) => Number(vc || 0))
  }

  if (!deliberacaoId || !itemId) {
    return e.json(400, { success: false, message: 'deliberacaoId e itemId são obrigatórios.' })
  }
  if (
    !Number.isInteger(favoraveis) ||
    !Number.isInteger(contrarios) ||
    !Number.isInteger(abstencoes) ||
    favoraveis < 0 ||
    contrarios < 0 ||
    abstencoes < 0
  ) {
    return e.json(400, { success: false, message: 'Totais devem ser inteiros não negativos.' })
  }

  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação não encontrada.' })
  }
  const status = delib.getString('status')
  if (!['EM_VOTACAO', 'APURADA', 'ABERTA'].includes(status)) {
    return e.json(400, {
      success: false,
      message:
        'Lançamento só é permitido com deliberação aberta, em votação ou apurada (antes de publicar).',
    })
  }

  let itemRec
  try {
    itemRec = e.app.findRecordById('itens_pauta', itemId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Item de pauta não encontrado.' })
  }
  if (itemRec.getString('deliberacao') !== deliberacaoId) {
    return e.json(400, { success: false, message: 'Item não pertence a esta deliberação.' })
  }

  // Validação eleição: array deve ter um valor por candidato
  let candidatosItem = []
  if (itemRec.getString('tipo_eleicao') === 'eleicao') {
    try {
      candidatosItem = JSON.parse(itemRec.getString('candidatos_eleicao') || '[]') || []
    } catch (_) {
      candidatosItem = []
    }
    if (!Array.isArray(candidatosItem)) candidatosItem = []
    if (votosPorCandidato.length > 0 && votosPorCandidato.length !== candidatosItem.length) {
      return e.json(400, {
        success: false,
        message:
          'votosPorCandidato deve ter exatamente ' +
          candidatosItem.length +
          ' valores (um por candidato).',
      })
    }
  } else if (votosPorCandidato.length > 0) {
    return e.json(400, {
      success: false,
      message: 'votosPorCandidato só é permitido em item do modo eleição.',
    })
  }

  let lancExistente = null
  try {
    const existentes = e.app.findRecordsByFilter(
      'lancamentos_fisicos',
      'deliberacao = {:delib} && item = {:item}',
      '-created',
      1,
      0,
      { delib: deliberacaoId, item: itemId },
    )
    if (existentes && existentes.length > 0) lancExistente = existentes[0]
  } catch (_) {}

  // Helper inline: lê votos_por_candidato anteriores (auditoria, 0055)
  function lerPorCandidatoAnterior(lanc) {
    try {
      const arr = JSON.parse(lanc.getString('votos_por_candidato') || '[]')
      return Array.isArray(arr) ? arr : []
    } catch (_) {
      return []
    }
  }

  const valoresAnteriores = lancExistente
    ? JSON.stringify({
        favoraveis: lancExistente.getInt('favoraveis'),
        contrarios: lancExistente.getInt('contrarios'),
        abstencoes: lancExistente.getInt('abstencoes'),
        votos_por_candidato: lerPorCandidatoAnterior(lancExistente),
        lancado_por: lancExistente.getString('lancado_por'),
        atualizado_em: new Date().toISOString(),
      })
    : ''

  const dataHoraAgora = new Date().toISOString().replace('T', ' ').substring(0, 19)

  // Helper inline: rótulo do fator de auditoria
  function rotuloFator() {
    if (itemRec.getString('tipo_eleicao') === 'eleicao' && votosPorCandidato.length > 0) {
      let det = ''
      for (let i = 0; i < votosPorCandidato.length; i++) {
        const nomeCand =
          candidatosItem[i] && typeof candidatosItem[i] === 'object'
            ? candidatosItem[i].nome || '?'
            : '?'
        det += (det ? '; ' : '') + nomeCand + '=' + votosPorCandidato[i]
      }
      return (
        'Lançamento manual pela mesa — item "' +
        itemRec.getString('titulo') +
        '" (por candidato: ' +
        det +
        ')'
      )
    }
    return (
      'Lançamento manual pela mesa — item "' +
      itemRec.getString('titulo') +
      '" (F:' +
      favoraveis +
      ' C:' +
      contrarios +
      ' A:' +
      abstencoes +
      ')'
    )
  }

  e.app.runInTransaction((txApp) => {
    let rec
    if (lancExistente) {
      rec = lancExistente
    } else {
      rec = new Record(txApp.findCollectionByNameOrId('lancamentos_fisicos'))
      rec.set('deliberacao', deliberacaoId)
      rec.set('item', itemId)
    }
    rec.set('favoraveis', favoraveis)
    rec.set('contrarios', contrarios)
    rec.set('abstencoes', abstencoes)
    if (itemRec.getString('tipo_eleicao') === 'eleicao' && votosPorCandidato.length > 0) {
      rec.set('votos_por_candidato', JSON.stringify(votosPorCandidato))
    }
    rec.set('lancado_por', auth.getString('name') || auth.email() || auth.id)
    rec.set('valores_anteriores', valoresAnteriores)
    rec.set('observacao', observacao)
    txApp.save(rec)

    registrarAuditoriaLanc(txApp, {
      evento: lancExistente ? 'lancamento_fisico_alterado' : 'lancamento_fisico_registrado',
      unidade: '',
      fator: rotuloFator(),
      dispositivo: 'painel-mesa',
    })
  })

  return e.json(200, {
    success: true,
    message: lancExistente
      ? 'Lançamento atualizado (valores anteriores preservados na auditoria).'
      : 'Lançamento registrado.',
  })
})

/// <reference path="../pb_data/types.d.ts" />
/**
 * Códigos de uso único (estação de voto presencial) — painel da mesa.
 *
 * POST /backend/v1/estacao/codigo-gerar
 *   body: { deliberacaoId, unidadeId, expiraEmHoras? }
 *   - só mesa/admin; gera código aleatório de 8 caracteres, guarda apenas o HASH
 *     (nunca o código em claro); resposta traz o código UMA única vez.
 *
 * POST /backend/v1/estacao/codigo-revogar
 *   body: { codigoId }
 *   - marca o código como revogado.
 *
 * O código NUNCA é logado; a auditoria registra apenas o evento.
 */

routerAdd('POST', '/backend/v1/estacao/codigo-gerar', (e) => {
  function gerarCodigo() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      const idx = Math.floor(Math.random() * chars.length)
      code += chars.charAt(idx)
    }
    return code
  }

  function mascararCpf(cpf) {
    const d = (cpf || '').replace(/[^\d]/g, '')
    if (d.length !== 11) return d
    return d.substring(0, 3) + '.***.***-' + d.substring(9)
  }

  function registrarAuditoriaCod(app, dados) {
    try {
      const audCol = app.findCollectionByNameOrId('auditoria_events')
      let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
      let proximoSeq = 1
      try {
        const ultimos = app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
        if (ultimos && ultimos.length > 0) {
          ultimoHash = ultimos[0].getString('hash_evento') || ultimoHash
          proximoSeq = (ultimos[0].getInt('sequencial') || 0) + 1
        }
      } catch (_) {}
      const payload = JSON.stringify({
        evento: dados.evento,
        data_hora: new Date().toISOString(),
        unidade: dados.unidade || '',
        fator: dados.fator || '',
        dispositivo: 'painel-mesa',
        sequencial: proximoSeq,
        hash_anterior: ultimoHash,
      })
      const hashEvento = $security.sha256(ultimoHash + ':' + payload)
      const rec = new Record(audCol)
      rec.set('evento', dados.evento)
      rec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
      if (dados.unidade) rec.set('unidade', dados.unidade)
      rec.set('fator', dados.fator || 'sistema')
      rec.set('dispositivo', 'painel-mesa')
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
  const deliberacaoId = (body.deliberacaoId || '').toString()
  const unidadeId = (body.unidadeId || '').toString()
  const expiraEmHoras = Number(body.expiraEmHoras || 24)

  if (!deliberacaoId || !unidadeId) {
    return e.json(400, { success: false, message: 'deliberacaoId e unidadeId são obrigatórios.' })
  }

  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação não encontrada.' })
  }
  if ((delib.getString('modalidade_presencial') || 'manual') !== 'estacao') {
    return e.json(400, {
      success: false,
      message:
        'Esta deliberação está em modo lançamento manual — códigos só se aplicam à modalidade estação.',
    })
  }

  try {
    e.app.findRecordById('unidades', unidadeId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Unidade não encontrada.' })
  }

  const codigo = gerarCodigo()
  const codigoHash = $security.sha256('KCUU:' + deliberacaoId + ':' + unidadeId + ':' + codigo)
  const expiraEm = new Date(
    Date.now() + Math.max(1, Math.min(expiraEmHoras, 720)) * 60 * 60 * 1000,
  ).toISOString()

  const col = e.app.findCollectionByNameOrId('codigos_uso_unico')
  const rec = new Record(col)
  rec.set('deliberacao', deliberacaoId)
  rec.set('unidade', unidadeId)
  rec.set('codigo_hash', codigoHash)
  rec.set('status', 'ativo')
  rec.set('expira_em', expiraEm)
  rec.set('gerado_por', auth.getString('name') || auth.email() || auth.id)
  e.app.save(rec)

  registrarAuditoriaCod(e.app, {
    evento: 'codigo_uso_unico_gerado',
    unidade: unidadeId,
    fator: 'Código de uso único p/ estação — deliberação ' + deliberacaoId,
  })

  return e.json(200, {
    success: true,
    codigoId: rec.id,
    codigo: codigo,
    expiraEm: expiraEm,
    message: 'Código gerado. Ele será exibido uma única vez — anote e entregue ao morador.',
  })
})

routerAdd('POST', '/backend/v1/estacao/codigo-revogar', (e) => {
  function registrarAuditoriaRev(app, dados) {
    try {
      const audCol = app.findCollectionByNameOrId('auditoria_events')
      let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
      let proximoSeq = 1
      try {
        const ultimos = app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
        if (ultimos && ultimos.length > 0) {
          ultimoHash = ultimos[0].getString('hash_evento') || ultimoHash
          proximoSeq = (ultimos[0].getInt('sequencial') || 0) + 1
        }
      } catch (_) {}
      const rec = new Record(audCol)
      rec.set('evento', dados.evento)
      rec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
      if (dados.unidade) rec.set('unidade', dados.unidade)
      rec.set('fator', dados.fator || 'sistema')
      rec.set('dispositivo', 'painel-mesa')
      rec.set('sequencial', proximoSeq)
      rec.set(
        'hash_evento',
        $security.sha256(
          ultimoHash + ':' + JSON.stringify({ e: dados.evento, s: proximoSeq, h: ultimoHash }),
        ),
      )
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
  const codigoId = (body.codigoId || '').toString()
  if (!codigoId) return e.json(400, { success: false, message: 'codigoId é obrigatório.' })

  let rec
  try {
    rec = e.app.findRecordById('codigos_uso_unico', codigoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Código não encontrado.' })
  }
  if (rec.getString('status') !== 'ativo') {
    return e.json(400, { success: false, message: 'Código não está ativo.' })
  }
  rec.set('status', 'revogado')
  e.app.save(rec)

  registrarAuditoriaRev(e.app, {
    evento: 'codigo_uso_unico_revogado',
    unidade: rec.getString('unidade'),
    fator: 'Revogação de código de uso único — deliberação ' + rec.getString('deliberacao'),
  })

  return e.json(200, { success: true, message: 'Código revogado.' })
})

/// <reference path="../pb_data/types.d.ts" />

/**
 * Configuração da chave Groq (transcrição de áudio da assembleia).
 *
 * A chave NUNCA fica em texto puro no repositório: é gravada por um administrador
 * autenticado em `configuracoes_backend` (chave GROQ_API_KEY), mesma coleção usada
 * pela ZapSign e pela senha SMTP. O hook de transcrição
 * (/backend/v1/atas/transcrever-audio) lê de lá com fallback em $os.getenv.
 *
 * Endpoints:
 * 1. GET  /backend/v1/admin/groq/config - status (apenas `configurado`, nunca o valor)
 * 2. POST /backend/v1/admin/groq/config - grava a chave (apenas role admin)
 */

// -------------------------------------------------------------
// 1. GET /backend/v1/admin/groq/config
// -------------------------------------------------------------
routerAdd('GET', '/backend/v1/admin/groq/config', (e) => {
  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = e.requestInfo().headers['authorization'] || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && e.app) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }

  if (!operador || operador.getString('role') !== 'admin') {
    return e.json(403, { success: false, message: 'Acesso restrito a administradores.' })
  }

  let configurado = false
  try {
    const rec = e.app.findFirstRecordByData('configuracoes_backend', 'chave', 'GROQ_API_KEY')
    if (rec && (rec.getString('valor') || '').trim().length > 0) {
      configurado = true
    }
  } catch (_) {}

  return e.json(200, { success: true, configurado: configurado })
})

// -------------------------------------------------------------
// 2. POST /backend/v1/admin/groq/config
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/admin/groq/config', (e) => {
  let operador = e.auth
  if (!operador) {
    try {
      const authHeader = e.requestInfo().headers['authorization'] || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && e.app) {
        operador = e.app.findAuthRecordByToken(token, 'auth')
      }
    } catch (_) {}
  }

  if (!operador || operador.getString('role') !== 'admin') {
    return e.json(403, { success: false, message: 'Acesso restrito a administradores.' })
  }

  const body = e.requestInfo().body || {}
  const novaChave = String(body.api_key || body.valor || '').trim()

  if (!novaChave) {
    return e.json(400, { success: false, message: 'Informe a chave da API Groq (api_key).' })
  }
  if (!novaChave.startsWith('gsk_')) {
    return e.json(400, {
      success: false,
      message: 'Chave inválida: a API Groq usa chaves que começam com gsk_.',
    })
  }

  try {
    let rec = null
    try {
      rec = e.app.findFirstRecordByData('configuracoes_backend', 'chave', 'GROQ_API_KEY')
    } catch (_) {}
    if (!rec) {
      const col = e.app.findCollectionByNameOrId('configuracoes_backend')
      rec = new Record(col)
      rec.set('chave', 'GROQ_API_KEY')
    }
    rec.set('valor', novaChave)
    e.app.save(rec)
  } catch (err) {
    return e.json(500, {
      success: false,
      message: 'Erro ao salvar a chave Groq: ' + (err && err.message ? err.message : String(err)),
    })
  }

  // Trilha de auditoria (cadeia de hash, mesmo padrão dos demais hooks)
  try {
    const audCol = e.app.findCollectionByNameOrId('auditoria_events')
    let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
    let proximoSeq = 1

    try {
      const ultimos = e.app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
      if (ultimos && ultimos.length > 0) {
        ultimoHash = ultimos[0].getString('hash_evento') || ultimoHash
        proximoSeq = (ultimos[0].getInt('sequencial') || 0) + 1
      }
    } catch (_) {}

    const payload = JSON.stringify({
      evento: 'configuracao_atualizada',
      data_hora: new Date().toISOString(),
      fator: 'Chave Groq atualizada pelo admin ' + operador.id,
      dispositivo: 'servidor',
      sequencial: proximoSeq,
      hash_anterior: ultimoHash,
    })
    const recAud = new Record(audCol)
    recAud.set('evento', 'configuracao_atualizada')
    recAud.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    recAud.set('fator', 'Chave Groq atualizada pelo admin ' + operador.id)
    recAud.set('dispositivo', 'servidor')
    recAud.set('sequencial', proximoSeq)
    recAud.set('hash_evento', $security.sha256(ultimoHash + ':' + payload))
    recAud.set('hash_anterior', ultimoHash)
    e.app.save(recAud)
  } catch (audErr) {
    console.log('Aviso ao auditar config groq:', audErr)
  }

  return e.json(200, {
    success: true,
    message: 'Chave Groq salva com sucesso no servidor.',
    configurado: true,
  })
})

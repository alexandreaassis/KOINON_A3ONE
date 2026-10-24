/**
 * Utilitário compartilhado de cálculo de Hash SHA-256 e helpers de auditoria para os hooks do PocketBase.
 * No ambiente goja/PocketBase, $security.sha256(str) está disponível globalmente.
 */

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
  if (!app) return null
  // append-only com hash encadeado
  const audCol = app.findCollectionByNameOrId('auditoria_events')

  // Buscar o último evento de auditoria para encadear
  let ultimoHash = '0000000000000000000000000000000000000000000000000000000000000000'
  let proximoSeq = 1

  try {
    const ultimos = app.findRecordsByFilter('auditoria_events', '', '-sequencial', 1, 0)
    if (ultimos && ultimos.length > 0) {
      const u = ultimos[0]
      ultimoHash = u.getString('hash_evento') || ultimoHash
      proximoSeq = (u.getInt('sequencial') || 0) + 1
    }
  } catch (e) {
    // tabela vazia ou primeira gravação
  }

  const payload = JSON.stringify({
    evento: dados.evento,
    data_hora: dados.data_hora || new Date().toISOString(),
    unidade: dados.unidade || '',
    fator: dados.fator || '',
    dispositivo: dados.dispositivo || '',
    sequencial: proximoSeq,
    hash_anterior: ultimoHash,
  })

  const hashEvento = calcularSha256(ultimoHash + ':' + payload)

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
}

module.exports = {
  calcularSha256: calcularSha256,
  gerarCodigoConferencia: gerarCodigoConferencia,
  registrarAuditoria: registrarAuditoria,
}

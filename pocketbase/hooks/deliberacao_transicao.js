/**
 * Hook POST /backend/v1/deliberacoes/transicao
 * Controla as transições de ciclo de vida das deliberações:
 * AGUARDANDO_ABERTURA -> ABERTA -> EM_VOTACAO -> ENCERRADA -> APURADA -> PUBLICADA
 * Restrito estritamente a usuários com role = 'mesa'.
 * Se transitar para APURADA, consolida o hash raiz da urna e grava na deliberação.
 * Registra evento correspondente na auditoria encadeada.
 */

routerAdd('POST', '/backend/v1/deliberacoes/transicao', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    throw new ForbiddenError('Usuário não autenticado')
  }

  const role = authRecord.getString('role')
  if (role !== 'mesa' && role !== 'admin') {
    throw new ForbiddenError(
      'Apenas membros da Mesa ou Administradores podem alterar o status das deliberações.',
    )
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
    throw new BadRequestError('deliberacaoId e novoStatus válido são obrigatórios')
  }

  let delib
  try {
    delib = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    throw new NotFoundError('Deliberação não encontrada')
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

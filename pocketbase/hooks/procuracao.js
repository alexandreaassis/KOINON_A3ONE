/**
 * Hook procuracao.js — fluxo de credenciamento por procuração (migration 0052).
 *
 * Ao APROVAR uma solicitação (status -> 'aprovado'), registra a presença
 * ('presencial') da unidade representada na deliberação — o MESMO mecanismo que
 * o credenciamento próprio alimenta hoje (lista de presença / quórum ao vivo).
 * Ao CANCELAR ou REJEITAR, remove a presença correspondente (se existir).
 *
 * Convenção JSVM do projeto: TODAS as funções auxiliares ficam INLINE dentro de
 * cada callback (pool de JSVM não compartilha top-level entre callbacks).
 */

onRecordUpdate((e) => {
  e.next()

  try {
    const rec = e.record
    if (rec.collection().name !== 'solicitacoes_procuracao') return

    const antes = rec.original()
    const statusAntes = antes.getString('status')
    const statusDepois = rec.getString('status')
    if (statusDepois === statusAntes) return

    const deliberacaoId = rec.getString('deliberacao')
    const unidadeId = rec.getString('unidade')
    if (!deliberacaoId || !unidadeId || deliberacaoId === 'none' || unidadeId === 'none') return

    function encontrarPresenca(app) {
      try {
        const lista = app.findRecordsByFilter(
          'presencas',
          'deliberacao = {:delib} && unidade = {:unid} && tipo = {:tipo}',
          '-created',
          1,
          0,
          { delib: deliberacaoId, unid: unidadeId, tipo: 'presencial' },
        )
        return lista && lista.length > 0 ? lista[0] : null
      } catch (_) {
        return null
      }
    }

    function registrarPresenca(app) {
      if (encontrarPresenca(app)) return // idempotente
      try {
        const presCol = app.findCollectionByNameOrId('presencas')
        const nova = new Record(presCol)
        nova.set('deliberacao', deliberacaoId)
        nova.set('unidade', unidadeId)
        nova.set('tipo', 'presencial')
        nova.set('data_hora', new Date().toISOString())
        app.save(nova)
        console.log(
          'procuracao: presença registrada (unidade ' +
            unidadeId +
            ', delib ' +
            deliberacaoId +
            ')',
        )
      } catch (err) {
        console.log('procuracao: falha ao registrar presença:', err)
      }
    }

    function removerPresenca(app) {
      try {
        const presenca = encontrarPresenca(app)
        if (presenca) {
          app.delete(presenca)
          console.log(
            'procuracao: presença removida (unidade ' +
              unidadeId +
              ', delib ' +
              deliberacaoId +
              ')',
          )
        }
      } catch (err) {
        console.log('procuracao: falha ao remover presença:', err)
      }
    }

    if (statusDepois === 'aprovado') {
      registrarPresenca(e.app)
    } else if (statusDepois === 'cancelado' || statusDepois === 'rejeitado') {
      removerPresenca(e.app)
    }
  } catch (err) {
    console.log('procuracao: erro inesperado no hook:', err)
  }
}, 'solicitacoes_procuracao')

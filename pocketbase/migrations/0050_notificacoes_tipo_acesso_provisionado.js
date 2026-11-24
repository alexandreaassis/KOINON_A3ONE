/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 0050 — Tipo 'acesso_provisionado' em notificacoes
 *
 * Adiciona o valor 'acesso_provisionado' ao select do campo `tipo` da
 * collection `notificacoes`, usado pelo provisionamento automático de acesso
 * (hook provisionamento_acesso.js e backfill da migration 0049) ao enfileirar
 * o e-mail com a senha temporária. Sem este valor, a gravação da notificação
 * falha na validação do select e o e-mail de acesso é descartado.
 *
 * Idempotente: se o valor já existir, não faz nada. No-op seguro em base vazia.
 */
migrate(
  (app) => {
    const VALOR = 'acesso_provisionado'
    try {
      const col = app.findCollectionByNameOrId('notificacoes')
      const field = col.fields.getByName('tipo')
      if (!field) {
        console.log('Migration 0050: campo tipo não encontrado em notificacoes — abortando.')
        return
      }
      const valores = field.values || []
      if (valores.indexOf(VALOR) === -1) {
        field.values = valores.concat([VALOR])
        app.save(col)
        console.log('Migration 0050: valor', VALOR, 'adicionado ao select tipo de notificacoes.')
      } else {
        console.log(
          'Migration 0050: valor',
          VALOR,
          'já presente em notificacoes.tipo — nada a fazer.',
        )
      }
    } catch (err) {
      console.log('Migration 0050: erro ao atualizar notificacoes.tipo:', err)
    }
  },
  (app) => {
    // Down: remove apenas o valor adicionado (registros existentes com esse
    // valor não são alterados — reverter o campo não apaga dados).
    const VALOR = 'acesso_provisionado'
    try {
      const col = app.findCollectionByNameOrId('notificacoes')
      const field = col.fields.getByName('tipo')
      if (!field) return
      const valores = field.values || []
      if (valores.indexOf(VALOR) !== -1) {
        field.values = valores.filter(function (v) {
          return v !== VALOR
        })
        app.save(col)
      }
    } catch (_) {}
  },
)

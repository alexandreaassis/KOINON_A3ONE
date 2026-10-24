migrate(
  (app) => {
    // Ensure composite and performance indexes are in place
    const cedulas = app.findCollectionByNameOrId('cedulas')
    const comparecimentos = app.findCollectionByNameOrId('comparecimentos')
    const comprovantes = app.findCollectionByNameOrId('comprovantes')
    const sessoes = app.findCollectionByNameOrId('sessoes')

    try {
      cedulas.addIndex('idx_cedulas_delib_recibo', false, 'deliberacao, recibo_codigo', '')
      app.save(cedulas)
    } catch (_) {}

    try {
      comparecimentos.addIndex('idx_comp_delib_hora', false, 'deliberacao, data_hora', '')
      app.save(comparecimentos)
    } catch (_) {}

    try {
      comprovantes.addIndex('idx_comprovantes_delib_hora', false, 'deliberacao, data_hora', '')
      app.save(comprovantes)
    } catch (_) {}

    try {
      sessoes.addIndex('idx_sessoes_token_status', false, 'token_voto, status', '')
      app.save(sessoes)
    } catch (_) {}
  },
  (app) => {
    // down
  },
)

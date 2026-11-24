/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const atasCol = app.findCollectionByNameOrId('atas_assembleia')
    if (!atasCol) {
      throw new Error('Collection atas_assembleia não encontrada (migration 0046)')
    }

    // Configuração de impressão do corpo do texto, POR ATA (idempotente):
    // alinhamento_corpo: 'justificado' | 'esquerda'
    // recuo_paragrafo: 'com' | 'sem'
    // Campo ausente/vazio = comportamento histórico (justificado + recuo de 28px),
    // então NENHUM backfill é feito: atas antigas imprimem exatamente como hoje.
    if (!atasCol.fields.getByName('alinhamento_corpo')) {
      atasCol.fields.add(new TextField({ name: 'alinhamento_corpo', max: 20 }))
    }
    if (!atasCol.fields.getByName('recuo_paragrafo')) {
      atasCol.fields.add(new TextField({ name: 'recuo_paragrafo', max: 10 }))
    }
    app.save(atasCol)
  },
  (app) => {
    try {
      const atasCol = app.findCollectionByNameOrId('atas_assembleia')
      if (atasCol) {
        if (atasCol.fields.getByName('alinhamento_corpo')) {
          atasCol.fields.removeByName('alinhamento_corpo')
        }
        if (atasCol.fields.getByName('recuo_paragrafo')) {
          atasCol.fields.removeByName('recuo_paragrafo')
        }
        app.save(atasCol)
      }
    } catch (err) {
      console.log('Erro no rollback da migração 0046:', err)
    }
  },
)

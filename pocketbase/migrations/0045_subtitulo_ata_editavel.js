/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const atasCol = app.findCollectionByNameOrId('atas_assembleia')
    if (!atasCol) {
      throw new Error('Collection atas_assembleia não encontrada (migration 0045)')
    }

    // Subtítulo do documento da ata (linha doc-headline impressa abaixo do
    // título). Apenas adicionado se ainda não existir (idempotente).
    if (!atasCol.fields.getByName('subtitulo')) {
      atasCol.fields.add(new TextField({ name: 'subtitulo', max: 200 }))
      app.save(atasCol)
    }

    // Backfill retroativo: atas gravadas antes deste campo continuam imprimindo
    // a linha que vinha cravada no código até agora. '' gravado = linha omitida
    // (o usuário apagou de propósito), então NUNCA sobrescrevemos valor vazio
    // que já exista como decisão — aqui o campo acabou de nascer, logo todo
    // registro existente está com '' por ausência e recebe o texto padrão.
    const existentes = app.findRecordsByFilter('atas_assembleia', 'id != ""', '-created', 0, 0)
    for (const ata of existentes) {
      if (ata.getString('subtitulo') === '') {
        ata.set('subtitulo', 'Assembleia Geral de Condôminos • Convocação Editalícia')
        app.save(ata)
      }
    }
  },
  (app) => {
    try {
      const atasCol = app.findCollectionByNameOrId('atas_assembleia')
      if (atasCol && atasCol.fields.getByName('subtitulo')) {
        atasCol.fields.removeByName('subtitulo')
        app.save(atasCol)
      }
    } catch (err) {
      console.log('Erro no rollback da migração 0045:', err)
    }
  },
)

/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 0055 — Lançamento físico por candidato (modo eleição, migration 0054).
 * Campo JSON `votos_por_candidato` em lancamentos_fisicos: array de números
 * (índice = índice do candidato em candidatos_eleicao do item).
 * Necessário porque `cedulas.opcao` é select fechado (favoravel/contrario/
 * abstencao/nulo/branco) e não comporta voto em candidato.
 */
migrate(
  (app) => {
    const lanc = app.findCollectionByNameOrId('lancamentos_fisicos')
    if (!lanc.fields.getByName('votos_por_candidato')) {
      lanc.fields.add(
        new Field({
          type: 'json',
          name: 'votos_por_candidato',
          required: false,
          maxSize: 2000000,
        }),
      )
      app.save(lanc)
    }
  },
  (app) => {
    try {
      const lanc = app.findCollectionByNameOrId('lancamentos_fisicos')
      if (lanc.fields.getByName('votos_por_candidato')) {
        lanc.fields.removeByName('votos_por_candidato')
        app.save(lanc)
      }
    } catch (_) {}
  },
)

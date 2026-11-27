/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 0054 — Modo "eleição" em itens de pauta
 * 1) tipo_eleicao: select 'regular' | 'eleicao' em itens_pauta (padrão 'regular' = votação comum).
 * 2) candidatos_eleicao: JSON array [{nome, cargo}] — lista de candidatos (nome + cargo).
 *    Cargos sugeridos: Síndico, Subsíndico/Vice-Síndico, Conselheiro Fiscal,
 *    Conselheiro Consultivo/Deliberativo (cargo livre também aceito).
 */
migrate(
  (app) => {
    const itens = app.findCollectionByNameOrId('itens_pauta')

    if (!itens.fields.getByName('tipo_eleicao')) {
      itens.fields.add(
        new Field({
          type: 'select',
          name: 'tipo_eleicao',
          values: ['regular', 'eleicao'],
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(itens)
    }

    if (!itens.fields.getByName('candidatos_eleicao')) {
      itens.fields.add(
        new Field({
          type: 'json',
          name: 'candidatos_eleicao',
          required: false,
          maxSize: 2000000,
        }),
      )
      app.save(itens)
    }
  },
  (app) => {
    try {
      const itens = app.findCollectionByNameOrId('itens_pauta')
      if (itens.fields.getByName('candidatos_eleicao')) {
        itens.fields.removeByName('candidatos_eleicao')
        app.save(itens)
      }
      if (itens.fields.getByName('tipo_eleicao')) {
        itens.fields.removeByName('tipo_eleicao')
        app.save(itens)
      }
    } catch (_) {}
  },
)

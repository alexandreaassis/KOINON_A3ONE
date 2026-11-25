/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 0053 — Voto presencial com duas modalidades
 * 1) Campo modalidade_presencial na deliberação: 'estacao' (urna criptográfica
 *    no salão) | 'manual' (lançamento dos totais físicos pela mesa). Padrão 'manual'.
 * 2) Collection codigos_uso_unico: código single-use para o morador autenticar
 *    na estação com CPF + código (gerado pela mesa, com trilha de auditoria).
 * 3) Collection lancamentos_fisicos: totais físicos lançados pela mesa por item,
 *    com trilha de auditoria (quem lançou, quando, valores anteriores).
 */
migrate(
  (app) => {
    // 1) modalidade_presencial na deliberação
    const deliberacoes = app.findCollectionByNameOrId('deliberacoes')
    if (!deliberacoes.fields.getByName('modalidade_presencial')) {
      deliberacoes.fields.add(
        new Field({
          type: 'select',
          name: 'modalidade_presencial',
          values: ['estacao', 'manual'],
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(deliberacoes)
    }

    // 2) Collection codigos_uso_unico
    try {
      app.findCollectionByNameOrId('codigos_uso_unico')
    } catch (_) {
      const col = new Collection({
        type: 'base',
        name: 'codigos_uso_unico',
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
          { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
          {
            type: 'relation',
            name: 'deliberacao',
            collectionId: app.findCollectionByNameOrId('deliberacoes').id,
            maxSelect: 1,
            required: true,
          },
          {
            type: 'relation',
            name: 'unidade',
            collectionId: app.findCollectionByNameOrId('unidades').id,
            maxSelect: 1,
            required: true,
          },
          { type: 'text', name: 'codigo_hash', required: true },
          {
            type: 'select',
            name: 'status',
            values: ['ativo', 'usado', 'expirado', 'revogado'],
            maxSelect: 1,
            required: true,
          },
          { type: 'date', name: 'expira_em' },
          { type: 'text', name: 'gerado_por' },
          { type: 'text', name: 'usado_em' },
          { type: 'text', name: 'usado_por_cpf_mascara' },
        ],
        indexes: [
          'CREATE INDEX idx_cuud_deliberacao ON codigos_uso_unico (deliberacao)',
          'CREATE INDEX idx_cuud_unidade ON codigos_uso_unico (unidade)',
          'CREATE INDEX idx_cuud_status ON codigos_uso_unico (status)',
        ],
      })
      app.save(col)
    }

    // 3) Collection lancamentos_fisicos
    try {
      app.findCollectionByNameOrId('lancamentos_fisicos')
    } catch (_) {
      const col = new Collection({
        type: 'base',
        name: 'lancamentos_fisicos',
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
          { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
          {
            type: 'relation',
            name: 'deliberacao',
            collectionId: app.findCollectionByNameOrId('deliberacoes').id,
            maxSelect: 1,
            required: true,
          },
          {
            type: 'relation',
            name: 'item',
            collectionId: app.findCollectionByNameOrId('itens_pauta').id,
            maxSelect: 1,
            required: true,
          },
          { type: 'number', name: 'favoraveis', onlyInt: true, min: 0 },
          { type: 'number', name: 'contrarios', onlyInt: true, min: 0 },
          { type: 'number', name: 'abstencoes', onlyInt: true, min: 0 },
          { type: 'text', name: 'lancado_por' },
          { type: 'text', name: 'valores_anteriores', required: false },
          { type: 'text', name: 'observacao', required: false },
        ],
        indexes: [
          'CREATE INDEX idx_lf_deliberacao ON lancamentos_fisicos (deliberacao)',
          'CREATE INDEX idx_lf_item ON lancamentos_fisicos (item)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    // Down: remove o campo e as collections novas
    try {
      const deliberacoes = app.findCollectionByNameOrId('deliberacoes')
      const f = deliberacoes.fields.getByName('modalidade_presencial')
      if (f) {
        deliberacoes.fields.removeByName('modalidade_presencial')
        app.save(deliberacoes)
      }
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('lancamentos_fisicos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('codigos_uso_unico'))
    } catch (_) {}
  },
)

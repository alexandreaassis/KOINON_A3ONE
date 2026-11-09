/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Campo regimental do síndico na collection configuracoes
    const configCol = app.findCollectionByNameOrId('configuracoes')
    if (!configCol.fields.getByName('sindico_pode_presidir_mesa')) {
      configCol.fields.add(
        new BoolField({
          name: 'sindico_pode_presidir_mesa',
        }),
      )
      app.save(configCol)
    }

    // 2. Campo tipo_pauta na collection itens_pauta
    const itensCol = app.findCollectionByNameOrId('itens_pauta')
    if (!itensCol.fields.getByName('tipo_pauta')) {
      itensCol.fields.add(
        new SelectField({
          name: 'tipo_pauta',
          values: ['despesas_manutencao', 'proprietarios', 'geral'],
          maxSelect: 1,
        }),
      )
      app.save(itensCol)
    }

    // 3. Campo sindico_e_parentes na collection deliberacoes (para persistência de regras de mesa)
    const delibCol = app.findCollectionByNameOrId('deliberacoes')
    if (!delibCol.fields.getByName('mesa_eleita_em')) {
      delibCol.fields.add(
        new TextField({
          name: 'mesa_eleita_em',
        }),
      )
    }
    if (!delibCol.fields.getByName('proprietario_nao_participa_unidades')) {
      delibCol.fields.add(
        new JSONField({
          name: 'proprietario_nao_participa_unidades',
        }),
      )
    }
    app.save(delibCol)

    // 4. Campo na collection cedulas para declaração de representante legal do inquilino
    const cedulasCol = app.findCollectionByNameOrId('cedulas')
    if (!cedulasCol.fields.getByName('declaracao_representante_legal')) {
      cedulasCol.fields.add(
        new BoolField({
          name: 'declaracao_representante_legal',
        }),
      )
      app.save(cedulasCol)
    }

    console.log('Migração 0035: Campos regimentais e regras de locatário aplicados com sucesso.')
  },
  (app) => {
    try {
      const configCol = app.findCollectionByNameOrId('configuracoes')
      if (configCol.fields.getByName('sindico_pode_presidir_mesa')) {
        configCol.fields.removeByName('sindico_pode_presidir_mesa')
        app.save(configCol)
      }
    } catch (_) {}
  },
)

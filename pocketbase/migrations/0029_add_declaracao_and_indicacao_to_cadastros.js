migrate(
  (app) => {
    const cadastrosCol = app.findCollectionByNameOrId('cadastros_unidade')
    let modificado = false

    if (!cadastrosCol.fields.getByName('declaracao_vinculo')) {
      cadastrosCol.fields.add(
        new TextField({
          name: 'declaracao_vinculo',
          required: false,
        }),
      )
      modificado = true
    }

    if (!cadastrosCol.fields.getByName('declaracao_assinatura')) {
      cadastrosCol.fields.add(
        new TextField({
          name: 'declaracao_assinatura',
          required: false,
        }),
      )
      modificado = true
    }

    if (!cadastrosCol.fields.getByName('declaracao_data')) {
      cadastrosCol.fields.add(
        new TextField({
          name: 'declaracao_data',
          required: false,
        }),
      )
      modificado = true
    }

    if (!cadastrosCol.fields.getByName('declaracao_ip')) {
      cadastrosCol.fields.add(
        new TextField({
          name: 'declaracao_ip',
          required: false,
        }),
      )
      modificado = true
    }

    if (!cadastrosCol.fields.getByName('indicacao_nome')) {
      cadastrosCol.fields.add(
        new TextField({
          name: 'indicacao_nome',
          required: false,
        }),
      )
      modificado = true
    }

    if (!cadastrosCol.fields.getByName('indicacao_telefone')) {
      cadastrosCol.fields.add(
        new TextField({
          name: 'indicacao_telefone',
          required: false,
        }),
      )
      modificado = true
    }

    if (modificado) {
      app.save(cadastrosCol)
    }
  },
  (app) => {
    try {
      const cadastrosCol = app.findCollectionByNameOrId('cadastros_unidade')
      const campos = [
        'declaracao_vinculo',
        'declaracao_assinatura',
        'declaracao_data',
        'declaracao_ip',
        'indicacao_nome',
        'indicacao_telefone',
      ]
      for (let c of campos) {
        if (cadastrosCol.fields.getByName(c)) {
          cadastrosCol.fields.removeByName(c)
        }
      }
      app.save(cadastrosCol)
    } catch (_) {}
  },
)

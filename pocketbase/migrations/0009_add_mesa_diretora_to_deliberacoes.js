migrate(
  (app) => {
    const deliberacoes = app.findCollectionByNameOrId('deliberacoes')

    if (!deliberacoes.fields.getByName('mesa_presidente_nome')) {
      deliberacoes.fields.add(
        new TextField({
          name: 'mesa_presidente_nome',
          type: 'text',
        }),
      )
    }

    if (!deliberacoes.fields.getByName('mesa_presidente_cpf')) {
      deliberacoes.fields.add(
        new TextField({
          name: 'mesa_presidente_cpf',
          type: 'text',
        }),
      )
    }

    if (!deliberacoes.fields.getByName('mesa_secretario_nome')) {
      deliberacoes.fields.add(
        new TextField({
          name: 'mesa_secretario_nome',
          type: 'text',
        }),
      )
    }

    if (!deliberacoes.fields.getByName('mesa_secretario_cpf')) {
      deliberacoes.fields.add(
        new TextField({
          name: 'mesa_secretario_cpf',
          type: 'text',
        }),
      )
    }

    app.save(deliberacoes)
  },
  (app) => {
    try {
      const deliberacoes = app.findCollectionByNameOrId('deliberacoes')
      deliberacoes.fields.removeByName('mesa_presidente_nome')
      deliberacoes.fields.removeByName('mesa_presidente_cpf')
      deliberacoes.fields.removeByName('mesa_secretario_nome')
      deliberacoes.fields.removeByName('mesa_secretario_cpf')
      app.save(deliberacoes)
    } catch (_) {}
  },
)

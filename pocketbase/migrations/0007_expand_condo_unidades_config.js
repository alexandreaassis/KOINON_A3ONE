migrate(
  (app) => {
    // 1. Estender collection configuracoes
    const configCol = app.findCollectionByNameOrId('configuracoes')

    if (!configCol.fields.getByName('tipo_condominio')) {
      configCol.fields.add(
        new SelectField({
          name: 'tipo_condominio',
          values: ['vertical', 'horizontal', 'misto'],
          maxSelect: 1,
        }),
      )
    }

    if (!configCol.fields.getByName('rotulo_unidade')) {
      configCol.fields.add(
        new TextField({
          name: 'rotulo_unidade',
        }),
      )
    }

    if (!configCol.fields.getByName('grupos_config')) {
      configCol.fields.add(
        new JSONField({
          name: 'grupos_config',
          maxSize: 2097152,
        }),
      )
    }

    app.save(configCol)

    // Atualizar registro existente com padrões caso estejam vazios
    try {
      const records = app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
      if (records && records.length > 0) {
        const c = records[0]
        if (!c.getString('tipo_condominio')) {
          c.set('tipo_condominio', 'vertical')
        }
        if (!c.getString('rotulo_unidade')) {
          c.set('rotulo_unidade', 'Apartamento')
        }
        app.save(c)
      }
    } catch (_) {}

    // 2. Estender collection unidades
    const unidadesCol = app.findCollectionByNameOrId('unidades')

    if (!unidadesCol.fields.getByName('grupo')) {
      unidadesCol.fields.add(
        new TextField({
          name: 'grupo',
        }),
      )
    }

    if (!unidadesCol.fields.getByName('peso_voto')) {
      unidadesCol.fields.add(
        new NumberField({
          name: 'peso_voto',
        }),
      )
    }

    if (!unidadesCol.fields.getByName('andar')) {
      unidadesCol.fields.add(
        new TextField({
          name: 'andar',
        }),
      )
    }

    if (!unidadesCol.fields.getByName('tipo_unidade')) {
      unidadesCol.fields.add(
        new TextField({
          name: 'tipo_unidade',
        }),
      )
    }

    if (!unidadesCol.fields.getByName('posicao_numero')) {
      unidadesCol.fields.add(
        new NumberField({
          name: 'posicao_numero',
        }),
      )
    }

    app.save(unidadesCol)

    // Inicializar peso_voto = 1 nas unidades existentes se estiver nulo/zero
    try {
      app
        .db()
        .newQuery('UPDATE unidades SET peso_voto = 1 WHERE peso_voto IS NULL OR peso_voto <= 0')
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const configCol = app.findCollectionByNameOrId('configuracoes')
      if (configCol.fields.getByName('tipo_condominio'))
        configCol.fields.removeByName('tipo_condominio')
      if (configCol.fields.getByName('rotulo_unidade'))
        configCol.fields.removeByName('rotulo_unidade')
      if (configCol.fields.getByName('grupos_config'))
        configCol.fields.removeByName('grupos_config')
      app.save(configCol)
    } catch (_) {}

    try {
      const unidadesCol = app.findCollectionByNameOrId('unidades')
      if (unidadesCol.fields.getByName('grupo')) unidadesCol.fields.removeByName('grupo')
      if (unidadesCol.fields.getByName('peso_voto')) unidadesCol.fields.removeByName('peso_voto')
      if (unidadesCol.fields.getByName('andar')) unidadesCol.fields.removeByName('andar')
      if (unidadesCol.fields.getByName('tipo_unidade'))
        unidadesCol.fields.removeByName('tipo_unidade')
      if (unidadesCol.fields.getByName('posicao_numero'))
        unidadesCol.fields.removeByName('posicao_numero')
      app.save(unidadesCol)
    } catch (_) {}
  },
)

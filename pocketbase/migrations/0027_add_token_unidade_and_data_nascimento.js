migrate(
  (app) => {
    // 1. Campo token_cadastro na collection 'unidades'
    const unidadesCol = app.findCollectionByNameOrId('unidades')
    if (!unidadesCol.fields.getByName('token_cadastro')) {
      unidadesCol.fields.add(
        new TextField({
          name: 'token_cadastro',
          required: false,
        }),
      )
      unidadesCol.addIndex('idx_unidades_token_cadastro', false, 'token_cadastro', '')
      app.save(unidadesCol)
    }

    // Backfill de token_cadastro para unidades existentes que não tenham token
    try {
      const unidadesSemToken = app.findRecordsByFilter(
        'unidades',
        'token_cadastro = "" || token_cadastro = null',
        '',
        5000,
        0,
      )
      for (let u of unidadesSemToken) {
        u.set('token_cadastro', $security.randomString(32))
        app.save(u)
      }
    } catch (err) {
      console.log('Aviso ao gerar tokens para unidades existentes:', err)
    }

    // 2. Campos em 'cadastros_unidade': data_nascimento, status_aprovacao e origem
    const cadastrosCol = app.findCollectionByNameOrId('cadastros_unidade')
    let salvarCadastros = false

    if (!cadastrosCol.fields.getByName('data_nascimento')) {
      cadastrosCol.fields.add(
        new DateField({
          name: 'data_nascimento',
          required: false,
        }),
      )
      salvarCadastros = true
    }

    if (!cadastrosCol.fields.getByName('status_aprovacao')) {
      cadastrosCol.fields.add(
        new SelectField({
          name: 'status_aprovacao',
          values: ['aprovado', 'pendente', 'rejeitado'],
          maxSelect: 1,
        }),
      )
      salvarCadastros = true
    }

    if (!cadastrosCol.fields.getByName('origem')) {
      cadastrosCol.fields.add(
        new SelectField({
          name: 'origem',
          values: ['admin', 'link_publico'],
          maxSelect: 1,
        }),
      )
      salvarCadastros = true
    }

    if (salvarCadastros) {
      cadastrosCol.addIndex('idx_cadastros_status_aprovacao', false, 'status_aprovacao', '')
      app.save(cadastrosCol)
    }

    // Backfill seguro de status_aprovacao e origem nos cadastros existentes
    try {
      app
        .db()
        .newQuery(`
        UPDATE cadastros_unidade
        SET status_aprovacao = 'aprovado'
        WHERE status_aprovacao IS NULL OR status_aprovacao = '';
      `)
        .execute()

      app
        .db()
        .newQuery(`
        UPDATE cadastros_unidade
        SET origem = 'admin'
        WHERE origem IS NULL OR origem = '';
      `)
        .execute()
    } catch (err) {
      console.log('Aviso ao inicializar status_aprovacao em cadastros_unidade:', err)
    }
  },
  (app) => {
    // Reverter campos caso necessário
    try {
      const cadCol = app.findCollectionByNameOrId('cadastros_unidade')
      const campoData = cadCol.fields.getByName('data_nascimento')
      if (campoData) cadCol.fields.removeByName('data_nascimento')
      const campoStatus = cadCol.fields.getByName('status_aprovacao')
      if (campoStatus) cadCol.fields.removeByName('status_aprovacao')
      const campoOrigem = cadCol.fields.getByName('origem')
      if (campoOrigem) cadCol.fields.removeByName('origem')
      app.save(cadCol)
    } catch (_) {}

    try {
      const uCol = app.findCollectionByNameOrId('unidades')
      const campoToken = uCol.fields.getByName('token_cadastro')
      if (campoToken) uCol.fields.removeByName('token_cadastro')
      app.save(uCol)
    } catch (_) {}
  },
)

migrate(
  (app) => {
    // 1. Vincular campo unidade_id e ativo aos users se não existirem
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const unidades = app.findCollectionByNameOrId('unidades')

    if (!users.fields.getByName('unidade')) {
      users.fields.add(
        new RelationField({
          name: 'unidade',
          collectionId: unidades.id,
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('ativo')) {
      users.fields.add(
        new BoolField({
          name: 'ativo',
        }),
      )
    }

    // Permitir papel admin junto com morador e mesa se desejado,
    // garantindo que role continue válido
    const roleField = users.fields.getByName('role')
    if (roleField) {
      users.fields.removeByName('role')
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['morador', 'mesa', 'admin'],
          maxSelect: 1,
        }),
      )
    }
    app.save(users)

    // Atualizar alexandre@a3one.com.br para papel 'admin'
    try {
      const alexandre = app.findAuthRecordByEmail('_pb_users_auth_', 'alexandre@a3one.com.br')
      alexandre.set('role', 'admin')
      alexandre.set('ativo', true)
      app.save(alexandre)
    } catch (_) {}

    // 2. Criar collection configuracoes
    let configCol
    try {
      configCol = app.findCollectionByNameOrId('configuracoes')
    } catch (_) {
      configCol = new Collection({
        name: 'configuracoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'mesa')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'mesa')",
        deleteRule: null,
        fields: [
          { name: 'nome_condominio', type: 'text', required: true },
          {
            name: 'logo',
            type: 'file',
            maxSelect: 1,
            maxSize: 5242880,
            mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
          },
          { name: 'quantidade_blocos', type: 'number' },
          { name: 'unidades_por_bloco', type: 'number' },
          { name: 'total_unidades', type: 'number' },
          { name: 'prefixo_bloco', type: 'text' },
          // Parâmetros globais padrão da convenção
          { name: 'default_inadimplente_vota', type: 'bool' },
          { name: 'default_locatario_vota', type: 'bool' },
          { name: 'default_quorum_materia', type: 'text' },
          { name: 'default_tipo_cedula', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(configCol)

      // Seed registro padrão de configuração
      const confRec = new Record(configCol)
      confRec.set('nome_condominio', 'Condomínio Residencial Lago Azul')
      confRec.set('quantidade_blocos', 2)
      confRec.set('unidades_por_bloco', 26)
      confRec.set('total_unidades', 52)
      confRec.set('prefixo_bloco', 'Bloco')
      confRec.set('default_inadimplente_vota', true)
      confRec.set('default_locatario_vota', false)
      confRec.set('default_quorum_materia', 'Maioria simples dos presentes')
      confRec.set('default_tipo_cedula', 'secreta')
      app.save(confRec)
    }

    // 3. Atualizar access rules de users para permitir admin listar, criar e alterar usuários
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    users.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'mesa')"
    users.updateRule =
      "@request.auth.id != '' && (id = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'mesa')"
    users.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'mesa')"
    app.save(users)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('configuracoes')
      app.delete(col)
    } catch (_) {}
  },
)

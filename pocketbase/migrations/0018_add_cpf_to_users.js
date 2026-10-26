migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Adicionar campo cpf a users caso ainda não exista
    if (!users.fields.getByName('cpf')) {
      users.fields.add(
        new TextField({
          name: 'cpf',
          required: false,
        }),
      )
    }

    // 2. Garantir campo ativo caso não exista
    if (!users.fields.getByName('ativo')) {
      users.fields.add(
        new BoolField({
          name: 'ativo',
        }),
      )
    }

    // 3. Atualizar regras de acesso para permitir operadores mesa/admin gerenciarem
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    users.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'mesa')"
    users.updateRule =
      "@request.auth.id != '' && (id = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'mesa')"
    users.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'mesa')"

    app.save(users)

    // 4. Adicionar índice no campo cpf para buscas ágeis
    try {
      users.addIndex('idx_users_cpf', false, 'cpf', '')
      app.save(users)
    } catch (_) {
      // Índice já existente ou defensivo
    }

    // 5. Garantir que usuário administrador principal continue ativo
    try {
      const alexandre = app.findAuthRecordByEmail('_pb_users_auth_', 'alexandre@a3one.com.br')
      alexandre.set('ativo', true)
      app.save(alexandre)
    } catch (_) {}
  },
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.removeIndex('idx_users_cpf')
      users.fields.removeByName('cpf')
      app.save(users)
    } catch (_) {}
  },
)

migrate(
  (app) => {
    // 0019_create_logs_acesso.js
    // Tabela operacional separada para histórico e logs de autenticação dos usuários
    const collection = new Collection({
      name: 'logs_acesso',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      createRule: "@request.auth.id != ''",
      updateRule: null, // imutável: logs operacionais não sofrem alteração
      deleteRule: null, // imutável: logs operacionais não devem ser apagados
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'email', type: 'text', required: true },
        { name: 'nome', type: 'text' },
        { name: 'data_hora', type: 'date', required: true },
        {
          name: 'metodo',
          type: 'select',
          required: true,
          values: ['senha', 'token', 'otp', 'outro'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['sucesso', 'falha'],
          maxSelect: 1,
        },
        { name: 'ip', type: 'text' },
        { name: 'user_agent', type: 'text' },
        { name: 'motivo_falha', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_logs_acesso_user ON logs_acesso (user)',
        'CREATE INDEX idx_logs_acesso_email ON logs_acesso (email)',
        'CREATE INDEX idx_logs_acesso_data_hora ON logs_acesso (data_hora DESC)',
        'CREATE INDEX idx_logs_acesso_status ON logs_acesso (status)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('logs_acesso')
      app.delete(col)
    } catch (_) {}
  },
)

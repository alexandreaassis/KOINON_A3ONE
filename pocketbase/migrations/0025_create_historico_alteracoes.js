migrate(
  (app) => {
    // 0025_create_historico_alteracoes.js
    // Trilha auditável de alterações operacionais de dados das entidades gerenciadas pela plataforma Koinon
    const collection = new Collection({
      name: 'historico_alteracoes',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      createRule: "@request.auth.id != ''",
      updateRule: null, // imutável: entradas de histórico não podem ser editadas
      deleteRule: null, // imutável: exclusão restrita a superusers / rotina de limpeza de dados
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'user_nome', type: 'text' },
        { name: 'user_email', type: 'text' },
        { name: 'user_role', type: 'text' },
        {
          name: 'acao',
          type: 'select',
          required: true,
          values: ['criacao', 'atualizacao', 'exclusao'],
          maxSelect: 1,
        },
        { name: 'entidade', type: 'text', required: true },
        { name: 'registro_id', type: 'text', required: true },
        { name: 'registro_rotulo', type: 'text' },
        { name: 'campos_alterados', type: 'json' },
        { name: 'ip', type: 'text' },
        { name: 'user_agent', type: 'text' },
        { name: 'data_hora', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_hist_alt_data_hora ON historico_alteracoes (data_hora DESC)',
        'CREATE INDEX idx_hist_alt_entidade ON historico_alteracoes (entidade)',
        'CREATE INDEX idx_hist_alt_acao ON historico_alteracoes (acao)',
        'CREATE INDEX idx_hist_alt_user ON historico_alteracoes (user)',
        'CREATE INDEX idx_hist_alt_reg_id ON historico_alteracoes (registro_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('historico_alteracoes')
      app.delete(col)
    } catch (_) {}
  },
)

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    // Add role and unidade relations to users if needed
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['morador', 'mesa'],
          maxSelect: 1,
        }),
      )
      app.save(users)
    }

    // 1. unidades
    const unidades = new Collection({
      name: 'unidades',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      fields: [
        { name: 'identificador', type: 'text', required: true },
        { name: 'bloco', type: 'text' },
        { name: 'responsavel_nome', type: 'text' },
        { name: 'contato_celular', type: 'text' },
        { name: 'contato_email', type: 'email' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_unidades_identificador ON unidades (identificador)'],
    })
    app.save(unidades)

    const unidadesId = app.findCollectionByNameOrId('unidades').id

    // 2. deliberacoes
    const deliberacoes = new Collection({
      name: 'deliberacoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'data_inicio', type: 'date' },
        { name: 'data_fim', type: 'date' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'AGUARDANDO_ABERTURA',
            'ABERTA',
            'EM_VOTACAO',
            'ENCERRADA',
            'APURADA',
            'PUBLICADA',
          ],
          maxSelect: 1,
        },
        { name: 'quorum_instalacao', type: 'number' },
        { name: 'quorum_materia', type: 'text' },
        {
          name: 'tipo_cedula',
          type: 'select',
          required: true,
          values: ['secreta', 'nominal'],
          maxSelect: 1,
        },
        { name: 'inadimplente_pode_votar', type: 'bool' },
        { name: 'locatario_pode_votar', type: 'bool' },
        { name: 'hash_raiz', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_deliberacoes_status ON deliberacoes (status)'],
    })
    app.save(deliberacoes)

    const deliberacoesId = app.findCollectionByNameOrId('deliberacoes').id

    // 3. credenciamentos
    const credenciamentos = new Collection({
      name: 'credenciamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      fields: [
        {
          name: 'unidade',
          type: 'relation',
          required: true,
          collectionId: unidadesId,
          maxSelect: 1,
        },
        { name: 'cpf', type: 'text', required: true },
        { name: 'titular_nome', type: 'text', required: true },
        {
          name: 'tipo_vinculo',
          type: 'select',
          required: true,
          values: ['proprietario', 'promitente', 'usufrutuario', 'locatario', 'procurador'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'aprovado', 'rejeitado'],
          maxSelect: 1,
        },
        { name: 'motivo_rejeicao', type: 'text' },
        { name: 'documentos', type: 'file', maxSelect: 5, maxSize: 5242880 },
        { name: 'aprovado_por', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'data_analise', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_credenciamentos_status ON credenciamentos (status)',
        'CREATE INDEX idx_credenciamentos_cpf ON credenciamentos (cpf)',
      ],
    })
    app.save(credenciamentos)

    // 4. itens_pauta
    const itensPauta = new Collection({
      name: 'itens_pauta',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      fields: [
        {
          name: 'deliberacao',
          type: 'relation',
          required: true,
          collectionId: deliberacoesId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'ordem', type: 'number', required: true },
        { name: 'titulo', type: 'text', required: true },
        { name: 'texto', type: 'text' },
        { name: 'quorum_aplicavel', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_itens_pauta_deliberacao ON itens_pauta (deliberacao, ordem)'],
    })
    app.save(itensPauta)

    const itensPautaId = app.findCollectionByNameOrId('itens_pauta').id

    // 5. presencas
    const presencas = new Collection({
      name: 'presencas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      fields: [
        {
          name: 'deliberacao',
          type: 'relation',
          required: true,
          collectionId: deliberacoesId,
          maxSelect: 1,
        },
        {
          name: 'unidade',
          type: 'relation',
          required: true,
          collectionId: unidadesId,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['remoto', 'presencial'],
          maxSelect: 1,
        },
        { name: 'data_hora', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_presencas_delib_unidade ON presencas (deliberacao, unidade)',
      ],
    })
    app.save(presencas)

    // 6. cedulas
    const cedulas = new Collection({
      name: 'cedulas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null, // imutável
      deleteRule: null, // imutável
      fields: [
        {
          name: 'deliberacao',
          type: 'relation',
          required: true,
          collectionId: deliberacoesId,
          maxSelect: 1,
        },
        {
          name: 'item',
          type: 'relation',
          required: true,
          collectionId: itensPautaId,
          maxSelect: 1,
        },
        { name: 'unidade_hash', type: 'text', required: true },
        {
          name: 'opcao',
          type: 'select',
          required: true,
          values: ['favoravel', 'contrario', 'abstencao', 'nulo', 'branco'],
          maxSelect: 1,
        },
        { name: 'timestamp', type: 'date' },
        { name: 'hash_anterior', type: 'text' },
        { name: 'hash_cedula', type: 'text' },
        { name: 'recibo_codigo', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_cedulas_deliberacao ON cedulas (deliberacao)',
        'CREATE INDEX idx_cedulas_item ON cedulas (item)',
        'CREATE UNIQUE INDEX idx_cedulas_recibo_item ON cedulas (recibo_codigo, item)',
      ],
    })
    app.save(cedulas)

    // 7. comparecimentos (unicidade deliberação + unidade garantida no banco!)
    const comparecimentos = new Collection({
      name: 'comparecimentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'deliberacao',
          type: 'relation',
          required: true,
          collectionId: deliberacoesId,
          maxSelect: 1,
        },
        {
          name: 'unidade',
          type: 'relation',
          required: true,
          collectionId: unidadesId,
          maxSelect: 1,
        },
        { name: 'data_hora', type: 'date' },
        { name: 'fator_usado', type: 'text' },
        { name: 'dispositivo_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_comparecimentos_delib_unidade ON comparecimentos (deliberacao, unidade)',
      ],
    })
    app.save(comparecimentos)

    // 8. sessoes
    const sessoes = new Collection({
      name: 'sessoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'mesa'",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'unidade',
          type: 'relation',
          required: true,
          collectionId: unidadesId,
          maxSelect: 1,
        },
        {
          name: 'deliberacao',
          type: 'relation',
          required: true,
          collectionId: deliberacoesId,
          maxSelect: 1,
        },
        { name: 'token_voto', type: 'text' },
        { name: 'otp_codigo_hash', type: 'text' },
        { name: 'otp_expira_em', type: 'date' },
        { name: 'tentativas_falhas', type: 'number' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativa', 'expirada', 'revogada', 'consumida'],
          maxSelect: 1,
        },
        { name: 'revogada_sessao_id', type: 'text' },
        { name: 'expira_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sessoes_status ON sessoes (status)',
        'CREATE INDEX idx_sessoes_deliberacao ON sessoes (deliberacao)',
        'CREATE INDEX idx_sessoes_token ON sessoes (token_voto)',
      ],
    })
    app.save(sessoes)

    // 9. auditoria_events
    const auditoriaEvents = new Collection({
      name: 'auditoria_events',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null, // append-only
      deleteRule: null, // append-only
      fields: [
        {
          name: 'evento',
          type: 'select',
          required: true,
          values: [
            'credenciamento_submetido',
            'vinculo_aprovado',
            'vinculo_rejeitado',
            'otp_enviado',
            'otp_validado',
            'otp_falhou',
            'autenticacao_concluida',
            'token_emitido',
            'cedula_registrada',
            'assembleia_aberta',
            'assembleia_encerrada',
            'apuracao_concluida',
            'resultado_publicado',
          ],
          maxSelect: 1,
        },
        { name: 'data_hora', type: 'date' },
        { name: 'unidade', type: 'relation', collectionId: unidadesId, maxSelect: 1 },
        { name: 'fator', type: 'text' },
        { name: 'dispositivo', type: 'text' },
        { name: 'sequencial', type: 'number' },
        { name: 'hash_evento', type: 'text' },
        { name: 'hash_anterior', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_auditoria_evento ON auditoria_events (evento)',
        'CREATE INDEX idx_auditoria_data_hora ON auditoria_events (data_hora)',
        'CREATE INDEX idx_auditoria_sequencial ON auditoria_events (sequencial)',
      ],
    })
    app.save(auditoriaEvents)

    // 10. comprovantes
    const comprovantes = new Collection({
      name: 'comprovantes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'deliberacao',
          type: 'relation',
          required: true,
          collectionId: deliberacoesId,
          maxSelect: 1,
        },
        {
          name: 'unidade',
          type: 'relation',
          required: true,
          collectionId: unidadesId,
          maxSelect: 1,
        },
        { name: 'codigo_conferencia', type: 'text', required: true },
        { name: 'hash_abreviado', type: 'text' },
        { name: 'data_hora', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_comprovantes_codigo ON comprovantes (codigo_conferencia)',
        'CREATE INDEX idx_comprovantes_delib_unidade ON comprovantes (deliberacao, unidade)',
      ],
    })
    app.save(comprovantes)
  },
  (app) => {
    const names = [
      'comprovantes',
      'auditoria_events',
      'sessoes',
      'comparecimentos',
      'cedulas',
      'presencas',
      'itens_pauta',
      'credenciamentos',
      'deliberacoes',
      'unidades',
    ]
    for (const name of names) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)

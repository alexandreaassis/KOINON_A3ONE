migrate(
  (app) => {
    const deliberacoesId = app.findCollectionByNameOrId('deliberacoes').id
    const unidadesId = app.findCollectionByNameOrId('unidades').id

    // 1. Atualizar auditoria_events com novos tipos de evento
    const audCol = app.findCollectionByNameOrId('auditoria_events')
    const audEventoField = audCol.fields.getByName('evento')
    if (audEventoField) {
      const eventosAtuais = audEventoField.values || []
      const novosTipos = [
        'edital_publicado',
        'documento_upload',
        'assinatura_registrada',
        'presenca_assinada',
        'dossie_gerado',
        'notificacao_criada',
        'notificacao_enviada',
      ]
      for (let t of novosTipos) {
        if (!eventosAtuais.includes(t)) {
          eventosAtuais.push(t)
        }
      }
      audEventoField.values = eventosAtuais
      audEventoField.maxSelect = 1
      app.save(audCol)
    }

    // 2. Collection notificacoes
    const notificacoes = new Collection({
      name: 'notificacoes',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin' || destinatario = @request.auth.email)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin' || destinatario = @request.auth.email)",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        { name: 'destinatario', type: 'email', required: true },
        {
          name: 'canal',
          type: 'select',
          required: true,
          values: ['email'],
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'edital_convocado',
            'credenciamento_aprovado',
            'credenciamento_rejeitado',
            'credenciamento_pendente_mesa',
            'otp_enviado',
            'ata_disponivel_assinatura',
            'deliberacao_publicada',
            'convite_assembleia',
          ],
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text' },
        { name: 'corpo', type: 'text' },
        {
          name: 'deliberacao',
          type: 'relation',
          collectionId: deliberacoesId,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'enviada', 'falha'],
          maxSelect: 1,
        },
        { name: 'mensagem_erro', type: 'text' },
        { name: 'tentativas', type: 'number' },
        { name: 'enviada_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notificacoes_status ON notificacoes (status)',
        'CREATE INDEX idx_notificacoes_deliberacao ON notificacoes (deliberacao)',
        'CREATE INDEX idx_notificacoes_destinatario ON notificacoes (destinatario)',
      ],
    })
    app.save(notificacoes)

    // 3. Collection documentos_pauta
    const documentosPauta = new Collection({
      name: 'documentos_pauta',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
      fields: [
        {
          name: 'deliberacao',
          type: 'relation',
          required: true,
          collectionId: deliberacoesId,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'convencao_proposta',
            'regimento_interno',
            'prestacao_contas',
            'curriculo_candidato',
            'edital',
            'procuracao',
            'outro',
          ],
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'arquivo',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        },
        {
          name: 'cargo_candidato',
          type: 'select',
          values: ['sindico', 'vice_sindico', 'conselheiro_fiscal', 'conselheiro_consultivo'],
          maxSelect: 1,
        },
        { name: 'nome_candidato', type: 'text' },
        { name: 'ordem', type: 'number' },
        {
          name: 'criado_por',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'hash_conteudo', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_docs_deliberacao ON documentos_pauta (deliberacao)',
        'CREATE INDEX idx_docs_tipo ON documentos_pauta (tipo)',
      ],
    })
    app.save(documentosPauta)

    // 4. Collection assinaturas_documento
    const assinaturasDocumento = new Collection({
      name: 'assinaturas_documento',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
      deleteRule: null,
      fields: [
        { name: 'documento_id', type: 'text', required: true },
        { name: 'documento_tipo', type: 'text', required: true }, // 'edital', 'documento_pauta', 'dossie', 'lista_presenca', etc
        {
          name: 'deliberacao',
          type: 'relation',
          collectionId: deliberacoesId,
          maxSelect: 1,
        },
        { name: 'assinante_nome', type: 'text', required: true },
        { name: 'assinante_cpf', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['sindico', 'mesa_presidente', 'mesa_secretario', 'participante'],
          maxSelect: 1,
        },
        { name: 'hash_documento', type: 'text', required: true },
        { name: 'data_hora', type: 'date' },
        { name: 'ip_dispositivo', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['valida', 'revogada'],
          maxSelect: 1,
        },
        {
          name: 'usuario',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_assinaturas_doc ON assinaturas_documento (documento_id)',
        'CREATE INDEX idx_assinaturas_delib ON assinaturas_documento (deliberacao)',
        'CREATE INDEX idx_assinaturas_cpf ON assinaturas_documento (assinante_cpf)',
      ],
    })
    app.save(assinaturasDocumento)

    // 5. Collection presencas_assinatura
    const presencasAssinatura = new Collection({
      name: 'presencas_assinatura',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'mesa' || @request.auth.role = 'admin')",
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
        { name: 'nome', type: 'text', required: true },
        { name: 'cpf', type: 'text', required: true },
        {
          name: 'forma',
          type: 'select',
          required: true,
          values: ['presencial', 'remoto', 'procuracao'],
          maxSelect: 1,
        },
        {
          name: 'procuracao_arquivo',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        },
        { name: 'nome_procurador', type: 'text' },
        { name: 'cpf_procurador', type: 'text' },
        { name: 'assinatura_hash', type: 'text' },
        { name: 'data_hora_assinatura', type: 'date' },
        { name: 'ip_dispositivo', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pres_ass_delib_unidade ON presencas_assinatura (deliberacao, unidade)',
        'CREATE INDEX idx_pres_ass_delib ON presencas_assinatura (deliberacao)',
      ],
    })
    app.save(presencasAssinatura)
  },
  (app) => {
    const names = [
      'presencas_assinatura',
      'assinaturas_documento',
      'documentos_pauta',
      'notificacoes',
    ]
    for (const name of names) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)

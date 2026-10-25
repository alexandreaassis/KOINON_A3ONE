migrate(
  (app) => {
    const deliberacoesId = app.findCollectionByNameOrId('deliberacoes').id

    // Collection editais_deliberacao para persistência completa e editável do Edital de Convocação
    const editaisDeliberacao = new Collection({
      name: 'editais_deliberacao',
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
        { name: 'titulo', type: 'text' },
        { name: 'subtitulo', type: 'text' },
        { name: 'texto_abertura', type: 'text' },
        { name: 'data_assembleia', type: 'text' },
        { name: 'primeira_convocacao', type: 'text' },
        { name: 'segunda_convocacao', type: 'text' },
        { name: 'local_texto', type: 'text' },
        { name: 'ordem_dia_custom', type: 'text' },
        { name: 'disposicoes_gerais', type: 'text' },
        { name: 'regras_participacao', type: 'text' },
        { name: 'sindico_nome', type: 'text' },
        { name: 'sindico_cpf', type: 'text' },
        { name: 'cargo_convocante', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['rascunho', 'assinado', 'publicado'],
          maxSelect: 1,
        },
        { name: 'hash_assinado', type: 'text' },
        { name: 'data_assinatura', type: 'date' },
        { name: 'conteudo_assinado_snapshot', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_editais_deliberacao ON editais_deliberacao (deliberacao)'],
    })
    app.save(editaisDeliberacao)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('editais_deliberacao')
      app.delete(col)
    } catch (_) {}
  },
)

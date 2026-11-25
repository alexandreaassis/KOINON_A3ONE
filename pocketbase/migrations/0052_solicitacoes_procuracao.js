/// <reference path="../pb_data/types.d.ts" />

// Migration 0052 — Collection solicitacoes_procuracao
// Fluxo de credenciamento por procuração: morador solicita, mesa homologa.
// Solicitante vê/edita apenas as suas (cancelar somente em_em_analise);
// mesa/admin vê todas e muda o status. Anexos (procuração + documento com foto)
// seguem o mesmo tratamento de arquivos do credenciamento próprio.

migrate(
  (app) => {
    let col = null
    try {
      col = app.findCollectionByNameOrId('solicitacoes_procuracao')
    } catch (_) {
      col = null
    }
    if (col) {
      console.log('Migração 0052: collection solicitacoes_procuracao já existe — nada a fazer.')
      return
    }

    const usersCol = app.findCollectionByNameOrId('users')
    const deliberacoesCol = app.findCollectionByNameOrId('deliberacoes')
    const unidadesCol = app.findCollectionByNameOrId('unidades')

    const nova = new Collection({
      name: 'solicitacoes_procuracao',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (solicitante = @request.auth.id || @request.auth.role = 'mesa' || @request.auth.role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (solicitante = @request.auth.id || @request.auth.role = 'mesa' || @request.auth.role = 'admin')",
      createRule:
        "@request.auth.id != '' && @request.body.solicitante = @request.auth.id && @request.body.status = 'em_analise'",
      updateRule:
        "@request.auth.id != '' && ((@request.auth.role = 'mesa' || @request.auth.role = 'admin') || (solicitante = @request.auth.id && status = 'em_analise' && @request.body.status = 'cancelado'))",
      deleteRule: null,
      fields: [
        {
          name: 'solicitante',
          type: 'relation',
          collectionId: usersCol.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: false,
        },
        {
          name: 'deliberacao',
          type: 'relation',
          collectionId: deliberacoesCol.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: false,
        },
        {
          name: 'unidade',
          type: 'relation',
          collectionId: unidadesCol.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: false,
        },
        { name: 'titular_outorgante', type: 'text' },
        { name: 'nome_procurador', type: 'text' },
        { name: 'cpf_procurador', type: 'text' },
        { name: 'qualificacao', type: 'text' },
        {
          name: 'anexos',
          type: 'file',
          maxSelect: 3,
          maxSize: 5242880,
          mimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
        },
        {
          name: 'status',
          type: 'select',
          values: ['em_analise', 'aprovado', 'cancelado', 'rejeitado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'motivo_rejeicao', type: 'text' },
        { name: 'cancelado_pelo_solicitante', type: 'bool' },
        { name: 'aprovado_em', type: 'date' },
        { name: 'rejeitado_em', type: 'date' },
        { name: 'cancelado_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_sol_proc_em_analise ON solicitacoes_procuracao (solicitante, deliberacao, unidade) WHERE status = 'em_analise'",
      ],
    })

    app.save(nova)
    console.log('Migração 0052: collection solicitacoes_procuracao criada com sucesso.')
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('solicitacoes_procuracao')
      app.delete(col)
    } catch (_) {}
  },
)

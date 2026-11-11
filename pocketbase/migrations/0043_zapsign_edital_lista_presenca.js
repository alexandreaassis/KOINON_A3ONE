/// <reference path="../pb_data/types.d.ts" />

/**
 * 0043 — Integração ZapSign para o Edital e a Lista de Presença
 *
 * Estende o padrão já existente na ata (campos zapsign_* em atas_assembleia):
 * - editais_deliberacao: adiciona os mesmos campos de status/links/arquivo ZapSign.
 * - listas_presenca: nova collection (1 por deliberacao), com os dados que a tela
 *   /mesa/presenca grava localmente hoje + campos ZapSign.
 *
 * Sempre idempotente (guard getByName) para poder ser reaplicado com segurança.
 */
migrate(
  (app) => {
    // ---------------------------------------------------------------
    // 1. Campos ZapSign em editais_deliberacao
    // ---------------------------------------------------------------
    const editais = app.findCollectionByNameOrId('editais_deliberacao')
    const camposEdital = [
      ['zapsign_documento_token', () => new TextField({ name: 'zapsign_documento_token' })],
      ['zapsign_status', () => new TextField({ name: 'zapsign_status' })],
      ['zapsign_urls', () => new JSONField({ name: 'zapsign_urls', maxSize: 2000000 })],
      ['zapsign_enviado_em', () => new DateField({ name: 'zapsign_enviado_em' })],
      ['zapsign_concluido_em', () => new DateField({ name: 'zapsign_concluido_em' })],
      ['zapsign_pdf_assinado_url', () => new TextField({ name: 'zapsign_pdf_assinado_url' })],
      ['zapsign_pdf_assinado_hash', () => new TextField({ name: 'zapsign_pdf_assinado_hash' })],
      ['zapsign_motivo_falha', () => new TextField({ name: 'zapsign_motivo_falha' })],
      [
        'zapsign_pdf_assinado',
        () =>
          new FileField({
            name: 'zapsign_pdf_assinado',
            maxSelect: 1,
            maxSize: 26214400,
            mimeTypes: ['application/pdf'],
          }),
      ],
    ]
    for (const [nome, criar] of camposEdital) {
      if (!editais.fields.getByName(nome)) {
        editais.fields.add(criar())
      }
    }
    app.save(editais)

    // ---------------------------------------------------------------
    // 2. Collection listas_presenca (documento assinável por deliberação)
    // ---------------------------------------------------------------
    let listas = null
    try {
      listas = app.findCollectionByNameOrId('listas_presenca')
    } catch (_) {
      listas = null
    }

    if (!listas) {
      const deliberacoesId = app.findCollectionByNameOrId('deliberacoes').id
      listas = new Collection({
        name: 'listas_presenca',
        type: 'base',
        listRule:
          "@request.auth.id != '' && @request.auth.role = 'mesa' || @request.auth.id != '' && @request.auth.role = 'admin'",
        viewRule:
          "@request.auth.id != '' && @request.auth.role = 'mesa' || @request.auth.id != '' && @request.auth.role = 'admin'",
        createRule:
          "@request.auth.id != '' && @request.auth.role = 'mesa' || @request.auth.id != '' && @request.auth.role = 'admin'",
        updateRule:
          "@request.auth.id != '' && @request.auth.role = 'mesa' || @request.auth.id != '' && @request.auth.role = 'admin'",
        deleteRule: null,
        fields: [
          {
            name: 'deliberacao',
            type: 'relation',
            required: true,
            collectionId: deliberacoesId,
            maxSelect: 1,
          },
          { name: 'titulo', type: 'text' },
          { name: 'participantes', type: 'json', maxSize: 2000000 },
          { name: 'totais', type: 'json', maxSize: 200000 },
          { name: 'assinaturas_visuais', type: 'json', maxSize: 2000000 },
          {
            name: 'status',
            type: 'select',
            values: ['rascunho', 'assinado', 'publicado'],
            maxSelect: 1,
          },
          { name: 'hash_assinado', type: 'text' },
          { name: 'data_assinatura', type: 'date' },
          // Campos ZapSign (mesmo padrão da ata)
          { name: 'zapsign_documento_token', type: 'text' },
          { name: 'zapsign_status', type: 'text' },
          { name: 'zapsign_urls', type: 'json', maxSize: 2000000 },
          { name: 'zapsign_enviado_em', type: 'date' },
          { name: 'zapsign_concluido_em', type: 'date' },
          { name: 'zapsign_pdf_assinado_url', type: 'text' },
          { name: 'zapsign_pdf_assinado_hash', type: 'text' },
          { name: 'zapsign_motivo_falha', type: 'text' },
          {
            name: 'zapsign_pdf_assinado',
            type: 'file',
            maxSelect: 1,
            maxSize: 26214400,
            mimeTypes: ['application/pdf'],
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_listas_presenca_deliberacao ON listas_presenca (deliberacao)',
        ],
      })
      app.save(listas)
    }
  },
  (app) => {
    // down: reverter campos do edital (a collection listas_presenca permanece —
    // dados reais; reverter criação aqui apagaria registros válidos)
    try {
      const editais = app.findCollectionByNameOrId('editais_deliberacao')
      const nomes = [
        'zapsign_documento_token',
        'zapsign_status',
        'zapsign_urls',
        'zapsign_enviado_em',
        'zapsign_concluido_em',
        'zapsign_pdf_assinado_url',
        'zapsign_pdf_assinado_hash',
        'zapsign_motivo_falha',
        'zapsign_pdf_assinado',
      ]
      for (const nome of nomes) {
        const f = editais.fields.getByName(nome)
        if (f) {
          editais.fields.removeByName(nome)
        }
      }
      app.save(editais)
    } catch (_) {}
  },
)

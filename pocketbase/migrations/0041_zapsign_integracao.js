/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar SelectField 'evento' em auditoria_events para novos eventos da ZapSign
    try {
      const audCol = app.findCollectionByNameOrId('auditoria_events')
      const audEventoField = audCol.fields.getByName('evento')
      if (audEventoField) {
        const eventosAtuais = audEventoField.values || []
        const novosTipos = [
          'zapsign_documento_criado',
          'zapsign_assinatura_parcial',
          'zapsign_documento_concluido',
          'zapsign_fallback_manual',
        ]
        let alterou = false
        for (let t of novosTipos) {
          if (!eventosAtuais.includes(t)) {
            eventosAtuais.push(t)
            alterou = true
          }
        }
        if (alterou) {
          audEventoField.values = eventosAtuais
          audEventoField.maxSelect = 1
          app.save(audCol)
        }
      }
    } catch (err) {
      console.log('Aviso ao atualizar tipos em auditoria_events na migração 0041:', err)
    }

    // 2. Adicionar campos da ZapSign e fallback manual na collection atas_assembleia
    const atasCol = app.findCollectionByNameOrId('atas_assembleia')
    if (atasCol) {
      if (!atasCol.fields.getByName('zapsign_documento_token')) {
        atasCol.fields.add(new TextField({ name: 'zapsign_documento_token' }))
      }
      if (!atasCol.fields.getByName('zapsign_status')) {
        atasCol.fields.add(new TextField({ name: 'zapsign_status' }))
      }
      if (!atasCol.fields.getByName('zapsign_urls')) {
        atasCol.fields.add(new JSONField({ name: 'zapsign_urls' }))
      }
      if (!atasCol.fields.getByName('zapsign_enviado_em')) {
        atasCol.fields.add(new DateField({ name: 'zapsign_enviado_em' }))
      }
      if (!atasCol.fields.getByName('zapsign_concluido_em')) {
        atasCol.fields.add(new DateField({ name: 'zapsign_concluido_em' }))
      }
      if (!atasCol.fields.getByName('zapsign_pdf_assinado_url')) {
        atasCol.fields.add(new TextField({ name: 'zapsign_pdf_assinado_url', max: 2000 }))
      }
      if (!atasCol.fields.getByName('zapsign_pdf_assinado_hash')) {
        atasCol.fields.add(new TextField({ name: 'zapsign_pdf_assinado_hash' }))
      }
      if (!atasCol.fields.getByName('zapsign_motivo_falha')) {
        atasCol.fields.add(new TextField({ name: 'zapsign_motivo_falha', max: 5000 }))
      }
      if (!atasCol.fields.getByName('modo_assinatura')) {
        atasCol.fields.add(
          new SelectField({
            name: 'modo_assinatura',
            values: ['eletronica_nativa', 'zapsign', 'manual_impressao'],
            maxSelect: 1,
          }),
        )
      }
      if (!atasCol.fields.getByName('zapsign_pdf_assinado')) {
        atasCol.fields.add(
          new FileField({
            name: 'zapsign_pdf_assinado',
            maxSelect: 1,
            maxSize: 20971520, // 20 MB
            mimeTypes: ['application/pdf'],
          }),
        )
      }

      app.save(atasCol)
    }
  },
  (app) => {
    try {
      const atasCol = app.findCollectionByNameOrId('atas_assembleia')
      if (atasCol) {
        const nomes = [
          'zapsign_documento_token',
          'zapsign_status',
          'zapsign_urls',
          'zapsign_enviado_em',
          'zapsign_concluido_em',
          'zapsign_pdf_assinado_url',
          'zapsign_pdf_assinado_hash',
          'zapsign_motivo_falha',
          'modo_assinatura',
          'zapsign_pdf_assinado',
        ]
        for (let n of nomes) {
          atasCol.fields.removeByName(n)
        }
        app.save(atasCol)
      }
    } catch (err) {
      console.log('Erro no rollback da migração 0041:', err)
    }
  },
)

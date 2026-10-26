/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar auditoria_events com novos tipos de eventos para Fase 3:
    // audio_transcricao e documento_extracao
    try {
      const audCol = app.findCollectionByNameOrId('auditoria_events')
      const audEventoField = audCol.fields.getByName('evento')
      if (audEventoField) {
        const eventosAtuais = audEventoField.values || []
        const novosTipos = ['audio_transcricao', 'documento_extracao']
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
          console.log(
            'Migração 0016: auditoria_events atualizado com novos eventos de transcrição e extração.',
          )
        }
      }
    } catch (err) {
      console.log('Aviso ao atualizar auditoria_events na migração 0016:', err)
    }
  },
  (app) => {
    // Reverter valores do campo evento se necessário
    try {
      const audCol = app.findCollectionByNameOrId('auditoria_events')
      const audEventoField = audCol.fields.getByName('evento')
      if (audEventoField) {
        audEventoField.values = (audEventoField.values || []).filter(
          (v) => v !== 'audio_transcricao' && v !== 'documento_extracao',
        )
        audEventoField.maxSelect = 1
        app.save(audCol)
      }
    } catch (_) {}
  },
)

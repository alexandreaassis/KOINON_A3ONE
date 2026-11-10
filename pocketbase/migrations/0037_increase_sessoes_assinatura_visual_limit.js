/// <reference path="../pb_data/types.d.ts" />
// Migration 0037: Aumentar limite de assinatura_visual em sessoes_assinatura para 500000
// e garantir suporte a eventos de assinatura mobile em auditoria_events.

migrate(
  (app) => {
    // 1. Atualizar limite do campo assinatura_visual na collection sessoes_assinatura
    try {
      const colSessoes = app.findCollectionByNameOrId('sessoes_assinatura')
      if (colSessoes) {
        const campoAssinatura = colSessoes.fields.getByName('assinatura_visual')
        if (campoAssinatura) {
          campoAssinatura.max = 500000
        } else {
          colSessoes.fields.add(
            new TextField({
              name: 'assinatura_visual',
              required: false,
              max: 500000,
            }),
          )
        }

        // Também garantir que campos textuais longos como user_agent ou assinatura_texto tenham margem
        const campoUserAgent = colSessoes.fields.getByName('user_agent')
        if (campoUserAgent) {
          campoUserAgent.max = 5000
        }

        const campoAssinaturaTexto = colSessoes.fields.getByName('assinatura_texto')
        if (campoAssinaturaTexto) {
          campoAssinaturaTexto.max = 5000
        }

        app.save(colSessoes)
      }
    } catch (err) {
      console.log('Aviso ao migrar limite de assinatura_visual em sessoes_assinatura:', err)
    }

    // 2. Garantir que coleções de destino também tenham max 500000
    const colecoes = ['assinaturas_documento', 'editais_deliberacao', 'presencas_assinatura']
    for (let i = 0; i < colecoes.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(colecoes[i])
        if (col) {
          const campo = col.fields.getByName('assinatura_visual')
          if (campo) {
            campo.max = 500000
            app.save(col)
          }
        }
      } catch (err) {
        console.log(`Aviso ao verificar ${colecoes[i]}:`, err)
      }
    }

    // 3. Atualizar SelectField 'evento' em auditoria_events se necessário
    try {
      const audCol = app.findCollectionByNameOrId('auditoria_events')
      if (audCol) {
        const campoEvento = audCol.fields.getByName('evento')
        if (campoEvento && campoEvento.values) {
          const valoresAtuais = campoEvento.values
          const novos = ['assinatura_registrada_mobile']
          let mudou = false
          for (let j = 0; j < novos.length; j++) {
            if (valoresAtuais.indexOf(novos[j]) === -1) {
              valoresAtuais.push(novos[j])
              mudou = true
            }
          }
          if (mudou) {
            campoEvento.values = valoresAtuais
            app.save(audCol)
          }
        }
      }
    } catch (err) {
      console.log('Aviso ao atualizar evento em auditoria_events:', err)
    }
  },
  (app) => {
    try {
      const colSessoes = app.findCollectionByNameOrId('sessoes_assinatura')
      if (colSessoes) {
        const campo = colSessoes.fields.getByName('assinatura_visual')
        if (campo) {
          campo.max = 5000
          app.save(colSessoes)
        }
      }
    } catch (_) {}
  },
)

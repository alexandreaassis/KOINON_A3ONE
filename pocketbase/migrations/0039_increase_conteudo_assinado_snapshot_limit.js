/// <reference path="../pb_data/types.d.ts" />
// Migration 0039: Aumentar limite de conteudo_assinado_snapshot na collection editais_deliberacao
// de 5.000 para 500.000 caracteres, e garantir que campos de snapshot/conteúdo longo em collections
// de assinatura (editais_deliberacao, atas_assembleia, assinaturas_documento, presencas_assinatura,
// sessoes_assinatura) tenham margem de 500.000 caracteres sem estourar.

migrate(
  (app) => {
    // 1. Atualizar limite de conteudo_assinado_snapshot e campos de texto longo em editais_deliberacao
    try {
      const colEditais = app.findCollectionByNameOrId('editais_deliberacao')
      if (colEditais) {
        // Campo principal relatado pelo usuário
        const campoSnapshot = colEditais.fields.getByName('conteudo_assinado_snapshot')
        if (campoSnapshot) {
          campoSnapshot.max = 500000
        } else {
          colEditais.fields.add(
            new TextField({
              name: 'conteudo_assinado_snapshot',
              required: false,
              max: 500000,
            }),
          )
        }

        // Campos de texto rico do edital que também compõem o edital longo
        const camposLongosEdital = [
          'ordem_dia_custom',
          'disposicoes_gerais',
          'regras_participacao',
          'texto_abertura',
        ]
        for (let i = 0; i < camposLongosEdital.length; i++) {
          const c = colEditais.fields.getByName(camposLongosEdital[i])
          if (c) {
            c.max = 500000
          }
        }

        // Garantir que assinatura_visual esteja em 500000
        const campoAssVisual = colEditais.fields.getByName('assinatura_visual')
        if (campoAssVisual) {
          campoAssVisual.max = 500000
        }

        app.save(colEditais)
      }
    } catch (err) {
      console.log('Aviso ao migrar limites em editais_deliberacao:', err)
    }

    // 2. Garantir que atas_assembleia tenha limites de 500000 em conteudo_assinado_snapshot e textos ricos
    try {
      const colAtas = app.findCollectionByNameOrId('atas_assembleia')
      if (colAtas) {
        const campoSnapshotAta = colAtas.fields.getByName('conteudo_assinado_snapshot')
        if (campoSnapshotAta) {
          campoSnapshotAta.max = 500000
        } else {
          colAtas.fields.add(
            new TextField({
              name: 'conteudo_assinado_snapshot',
              required: false,
              max: 500000,
            }),
          )
        }

        const camposLongosAta = [
          'texto_entrada_bruto',
          'conteudo_html',
          'presidente_assinatura_visual',
          'secretario_assinatura_visual',
        ]
        for (let i = 0; i < camposLongosAta.length; i++) {
          const c = colAtas.fields.getByName(camposLongosAta[i])
          if (c) {
            c.max = 500000
          }
        }

        app.save(colAtas)
      }
    } catch (err) {
      console.log('Aviso ao migrar limites em atas_assembleia:', err)
    }

    // 3. Garantir que sessoes_assinatura tenha limites adequados
    try {
      const colSessoes = app.findCollectionByNameOrId('sessoes_assinatura')
      if (colSessoes) {
        const campoAssVisual = colSessoes.fields.getByName('assinatura_visual')
        if (campoAssVisual) {
          campoAssVisual.max = 500000
        }

        const campoAssTexto = colSessoes.fields.getByName('assinatura_texto')
        if (campoAssTexto) {
          campoAssTexto.max = 50000
        }

        app.save(colSessoes)
      }
    } catch (err) {
      console.log('Aviso ao migrar limites em sessoes_assinatura:', err)
    }

    // 4. Garantir que assinaturas_documento e presencas_assinatura tenham limites adequados
    const outrasColecoes = ['assinaturas_documento', 'presencas_assinatura']
    for (let i = 0; i < outrasColecoes.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(outrasColecoes[i])
        if (col) {
          const campoAss = col.fields.getByName('assinatura_visual')
          if (campoAss) {
            campoAss.max = 500000
          }
          const campoAssTxt = col.fields.getByName('assinatura_texto')
          if (campoAssTxt) {
            campoAssTxt.max = 50000
          }
          app.save(col)
        }
      } catch (err) {
        console.log(`Aviso ao migrar limites em ${outrasColecoes[i]}:`, err)
      }
    }
  },
  (app) => {
    try {
      const colEditais = app.findCollectionByNameOrId('editais_deliberacao')
      if (colEditais) {
        const campo = colEditais.fields.getByName('conteudo_assinado_snapshot')
        if (campo) {
          campo.max = 5000
          app.save(colEditais)
        }
      }
    } catch (_) {}
  },
)

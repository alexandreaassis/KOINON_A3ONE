/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar agente nativo Skip Cloud redator-ata-assembleia garantindo total ausência de "Votum"
    try {
      $ai.agents.define(app, {
        slug: 'redator-ata-assembleia',
        name: 'Redator de Atas Condominiais Koinon',
        description:
          'Especialista em redação jurídica formal de atas de assembleias gerais de condomínio edilício no Brasil com prioridade ao relato fático dos debates.',
        systemPrompt:
          'Você é o assistente jurídico e secretário redator oficial do condomínio Lago Azul na Plataforma Virtual Koinon.\n' +
          'Sua missão é redigir a ATA COMPLETA, SOLENE e FORMAL de Assembleia Geral de Condomínio Edilício, ' +
          'em estrita consonância com o Código Civil Brasileiro (Lei nº 10.406/2002, arts. 1.331 a 1.358-A) e com a Convenção Condominial.\n\n' +
          'REGRA DE OURO — PRIORIDADE DAS ANOTAÇÕES BRUTAS DA MESA (FONTE PRIMÁRIA):\n' +
          'As "ANOTAÇÕES BRUTAS DA MESA DIRETORA / TRANSCRIÇÃO DOS TRABALHOS" enviadas pelo usuário são a sua FONTE PRIMÁRIA e OBRIGATÓRIA para o relato dos trabalhos, discussões, debates, manifestações dos condôminos, ocorrências, questionamentos e fatos ocorridos durante a sessão.\n' +
          '- NUNCA ignore ou descarte as anotações brutas.\n' +
          '- Se houver anotações brutas, você DEVE transcrever e incorporar fielmente seu conteúdo em tom formal/jurídico, mantendo todos os nomes de moradores/participantes citados, suas respectivas falas, dúvidas levantadas, explicações prestadas e eventuais protestos ou impugnações registradas.\n' +
          '- Se as anotações contiverem tópicos além da pauta formal (comentários gerais, assuntos diversos, ocorrências da administração), reserve uma seção expressa para "Assuntos Gerais e Ocorrências dos Trabalhos" ou insira nos itens correspondentes da pauta.\n' +
          '- Os dados estruturados (quórum, apuração de votos da urna eletrônica, dados cadastrais) COMPLEMENTAM os fatos narrativos com exatidão matemática, mas NÃO substituem a narrativa dos debates fornecida nas anotações.\n\n' +
          'ESTRUTURA OBRIGATÓRIA DA ATA (formato HTML rico e limpo para editor Tiptap):\n' +
          '1. Cabeçalho solene: Data completa por extenso, horários da primeira e segunda convocação, local físico e virtual (Plataforma Virtual Koinon), identificação do Condomínio Lago Azul e base de convocação pelo Edital publicado.\n' +
          '2. Composição da Mesa Diretora: Identificação nominal e qualificação do(a) Presidente da Mesa e do(a) Secretário(a) designados.\n' +
          '3. Verificação de Quórum e Lista de Presença: Quantitativo de unidades participantes, quórum apurado, discriminação de presenças físicas presenciais, virtuais remotas (Plataforma Virtual Koinon) e representações por procuração.\n' +
          '4. Leitura e Confirmação da Ordem do Dia: Transcrição das matérias constantes do edital de convocação.\n' +
          '5. Discussão e Deliberação dos Itens da Pauta (RELATO COMPLETO DOS DEBATES): Para cada item submetido à assembleia, descreva minuciosamente as discussões ocorridas extraídas das anotações da mesa, com destaque para intervenções de condôminos, argumentos apresentados, esclarecimentos do síndico/mesa e encaminhamentos; ao final do item, consigne a proclamação da decisão e o RESULTADO NUMÉRICO DA VOTAÇÃO (votos favoráveis, contrários, abstenções e nulos/brancos).\n' +
          '6. Ocorrências Gerais e Manifestações Diversas: Registro solene de outros fatos, manifestações ou considerações constantes das anotações da mesa.\n' +
          '7. Referência expressa à integridade criptográfica da Urna Eletrônica Koinon: Citar expressamente no corpo da ata a garantia do sigilo do voto e o Hash Raiz SHA-256 consolidado da urna auditada.\n' +
          '8. Disposições Finais e Encerramento: Horário de encerramento dos trabalhos, lavratura da ata pelo Secretário(a) e assinatura conjunta com o Presidente da Mesa.\n\n' +
          'DIRETRIZES DE ESTILO E FORMATAÇÃO:\n' +
          '- Use tags HTML semânticas adequadas: <h3>, <h4>, <p>, <ul>, <li>, <strong>, <em>.\n' +
          '- Redação em tom jurídico, imparcial, formal e escorreito.\n' +
          '- Datas e números principais expressos em algarismos e por extenso.\n' +
          '- NÃO invente resultados de votação discrepantes dos dados estruturados fornecidos.\n' +
          '- Retorne APENAS o HTML da ata, pronto para ser renderizado no editor, sem blocos ```html ou explicações antes ou depois.',
        tier: 'fast',
        tools: [
          { collection: 'deliberacoes', perms: { read: true, list: true } },
          { collection: 'itens_pauta', perms: { read: true, list: true } },
          { collection: 'presencas', perms: { read: true, list: true } },
          { collection: 'presencas_assinatura', perms: { read: true, list: true } },
          { collection: 'editais_deliberacao', perms: { read: true, list: true } },
          { collection: 'configuracoes', perms: { read: true, list: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text:
                'Modelo Padrão de Ata de Assembleia Geral Condominial (Código Civil arts. 1.331-1.358):\n' +
                'A ata deve conter necessariamente: identificação do condomínio, dia, mês, ano e hora; local físico e virtual (Plataforma Virtual Koinon); convocação regular comprovada; ' +
                'presidente e secretário eleitos; quórum verificado; pauta integral; resumo fiel e fidedigno dos debates a partir das anotações e transcrições da mesa; ' +
                'registro formal das deliberações e votações; resultado proclamado; hash criptográfico de auditoria; encerramento e assinatura dos membros da mesa.',
            },
          },
        ],
      })
    } catch (err) {
      console.log('Aviso ao redefinir agente redator-ata-assembleia:', err)
    }

    // Função utilitária de substituição completa de qualquer variante de Votum
    function limparVotum(texto) {
      if (!texto || typeof texto !== 'string') return texto
      return texto
        .replace(/Plataforma Virtual Votum/gi, 'Plataforma Virtual Koinon')
        .replace(/Plataforma Votum/gi, 'Plataforma Virtual Koinon')
        .replace(/Sistema Votum/gi, 'Plataforma Virtual Koinon')
        .replace(/sistema Votum/gi, 'Plataforma Virtual Koinon')
        .replace(/Urna Eletr[ôo]nica Votum/gi, 'Urna Eletrônica Koinon')
        .replace(/Urna Votum/gi, 'Urna Koinon')
        .replace(/Votum/gi, 'Koinon')
    }

    // 2. Normalizar registros na collection atas_assembleia
    try {
      const atas = app.findRecordsByFilter('atas_assembleia', '', '', 200, 0)
      for (let at of atas) {
        let alterou = false
        const campos = [
          'conteudo_html',
          'texto_entrada_bruto',
          'titulo',
          'conteudo_assinado_snapshot',
        ]
        for (let campo of campos) {
          const valorOriginal = at.getString(campo)
          if (valorOriginal && /votum/i.test(valorOriginal)) {
            at.set(campo, limparVotum(valorOriginal))
            alterou = true
          }
        }
        if (alterou) {
          app.save(at)
          console.log('Registro de atas_assembleia normalizado (id: ' + at.id + ')')
        }
      }
    } catch (err) {
      console.log('Aviso ao varrer atas_assembleia:', err)
    }

    // 3. Normalizar registros na collection editais_deliberacao
    try {
      const editais = app.findRecordsByFilter('editais_deliberacao', '', '', 200, 0)
      for (let ed of editais) {
        let alterou = false
        const campos = [
          'local_texto',
          'disposicoes_gerais',
          'texto_abertura',
          'regras_participacao',
          'ordem_dia_custom',
          'titulo',
          'subtitulo',
          'conteudo_assinado_snapshot',
        ]
        for (let campo of campos) {
          const val = ed.getString(campo)
          if (val && /votum/i.test(val)) {
            ed.set(campo, limparVotum(val))
            alterou = true
          }
        }
        if (alterou) {
          app.save(ed)
          console.log('Registro de editais_deliberacao normalizado (id: ' + ed.id + ')')
        }
      }
    } catch (err) {
      console.log('Aviso ao varrer editais_deliberacao:', err)
    }

    // 4. Normalizar registros na collection deliberacoes
    try {
      const delibs = app.findRecordsByFilter('deliberacoes', '', '', 200, 0)
      for (let d of delibs) {
        let alterou = false
        const campos = ['titulo', 'descricao', 'quorum_materia']
        for (let campo of campos) {
          const val = d.getString(campo)
          if (val && /votum/i.test(val)) {
            d.set(campo, limparVotum(val))
            alterou = true
          }
        }
        if (alterou) {
          app.save(d)
          console.log('Registro de deliberacoes normalizado (id: ' + d.id + ')')
        }
      }
    } catch (err) {
      console.log('Aviso ao varrer deliberacoes:', err)
    }

    // 5. Normalizar registros na collection notificacoes
    try {
      const notifs = app.findRecordsByFilter('notificacoes', '', '', 200, 0)
      for (let n of notifs) {
        let alterou = false
        const campos = ['titulo', 'corpo']
        for (let campo of campos) {
          const val = n.getString(campo)
          if (val && /votum/i.test(val)) {
            n.set(campo, limparVotum(val))
            alterou = true
          }
        }
        if (alterou) {
          app.save(n)
          console.log('Registro de notificacoes normalizado (id: ' + n.id + ')')
        }
      }
    } catch (err) {
      console.log('Aviso ao varrer notificacoes:', err)
    }

    // 6. Normalizar registros na collection documentos_pauta
    try {
      const docs = app.findRecordsByFilter('documentos_pauta', '', '', 200, 0)
      for (let doc of docs) {
        let alterou = false
        const campos = ['titulo', 'descricao']
        for (let campo of campos) {
          const val = doc.getString(campo)
          if (val && /votum/i.test(val)) {
            doc.set(campo, limparVotum(val))
            alterou = true
          }
        }
        if (alterou) {
          app.save(doc)
          console.log('Registro de documentos_pauta normalizado (id: ' + doc.id + ')')
        }
      }
    } catch (err) {
      console.log('Aviso ao varrer documentos_pauta:', err)
    }

    // 7. Normalizar templates de e-mail na collection _pb_users_auth_
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      let alterouAuth = false
      if (users.resetPasswordTemplate) {
        const resetSubj = users.resetPasswordTemplate.subject || ''
        const resetBody = users.resetPasswordTemplate.body || ''
        if (/votum/i.test(resetSubj) || /votum/i.test(resetBody)) {
          users.resetPasswordTemplate = {
            subject: limparVotum(resetSubj),
            body: limparVotum(resetBody),
          }
          alterouAuth = true
        }
      }
      if (users.verificationTemplate) {
        const verSubj = users.verificationTemplate.subject || ''
        const verBody = users.verificationTemplate.body || ''
        if (/votum/i.test(verSubj) || /votum/i.test(verBody)) {
          users.verificationTemplate = {
            subject: limparVotum(verSubj),
            body: limparVotum(verBody),
          }
          alterouAuth = true
        }
      }
      if (alterouAuth) {
        app.save(users)
        console.log('Templates de e-mail de usuários normalizados sem Votum.')
      }
    } catch (err) {
      console.log('Aviso ao verificar templates de e-mail de auth:', err)
    }
  },
  (app) => {
    // rollback opcional no-op
  },
)

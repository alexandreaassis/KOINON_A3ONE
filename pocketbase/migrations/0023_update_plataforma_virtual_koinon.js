/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar agente nativo Skip Cloud redator-ata-assembleia com a marcação correta "Plataforma Virtual Koinon"
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
      console.log('Agente Skip Cloud redator-ata-assembleia atualizado com Koinon.')
    } catch (err) {
      console.log('Aviso ao atualizar agente redator-ata-assembleia:', err)
    }

    // 2. Atualizar templates de e-mail de redefinição de senha e verificação de e-mail
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.resetPasswordTemplate = {
        subject: 'Redefinição de senha — Koinon Lago Azul',
        body: `<p>Olá,</p>
<p>Recebemos uma solicitação para redefinir a sua senha de acesso à Plataforma Virtual Koinon do Condomínio Residencial Lago Azul.</p>
<p>Clique no link abaixo para cadastrar sua nova senha:</p>
<p><a class="btn" href="{APP_URL}/redefinir-senha?token={TOKEN}" target="_blank" rel="noopener">Redefinir minha senha</a></p>
<p>Se você não solicitou a redefinição de senha, nenhuma ação é necessária e você pode desconsiderar esta mensagem com segurança.</p>
<p>Atenciosamente,<br>Equipe Koinon — Lago Azul</p>`,
      }

      users.verificationTemplate = {
        subject: 'Confirmação de e-mail — Koinon Lago Azul',
        body: `<p>Olá,</p>
<p>Confirme seu endereço de e-mail na Plataforma Virtual Koinon do Condomínio Residencial Lago Azul clicando no link abaixo:</p>
<p><a class="btn" href="{APP_URL}/verificar-email?token={TOKEN}" target="_blank" rel="noopener">Confirmar meu e-mail</a></p>
<p>Atenciosamente,<br>Equipe Koinon — Lago Azul</p>`,
      }
      app.save(users)
    } catch (err) {
      console.log('Aviso ao atualizar templates de e-mail dos usuários:', err)
    }

    // 3. Atualizar registros existentes na base que ainda possuam referências legadas sem o nome Koinon
    try {
      const editais = app.findRecordsByFilter('editais_deliberacao', '', '', 100, 0)
      for (let ed of editais) {
        let mudou = false
        const local = ed.getString('local_texto')
        if (
          local &&
          (local.includes('Plataforma Virtual Votum') ||
            (local.includes('Plataforma Virtual') && !local.includes('Koinon')))
        ) {
          ed.set(
            'local_texto',
            local
              .replace(/Plataforma Virtual Votum/g, 'Plataforma Virtual Koinon')
              .replace(/Plataforma Virtual(?! Koinon)/g, 'Plataforma Virtual Koinon'),
          )
          mudou = true
        }
        const disp = ed.getString('disposicoes_gerais')
        if (disp && disp.includes('plataforma eletrônica')) {
          ed.set(
            'disposicoes_gerais',
            disp.replace(/plataforma eletrônica/g, 'Plataforma Virtual Koinon'),
          )
          mudou = true
        }
        if (mudou) {
          app.save(ed)
        }
      }
    } catch (err) {
      console.log('Aviso ao normalizar editais_deliberacao:', err)
    }

    try {
      const atas = app.findRecordsByFilter('atas_assembleia', '', '', 100, 0)
      for (let at of atas) {
        let mudou = false
        let html = at.getString('conteudo_html')
        if (
          html &&
          (html.includes('Plataforma Votum') ||
            html.includes('Plataforma Remota Koinon') ||
            (html.includes('Plataforma Virtual') && !html.includes('Koinon')))
        ) {
          html = html
            .replace(/Plataforma Votum/g, 'Plataforma Virtual Koinon')
            .replace(/Plataforma Remota Koinon/g, 'Plataforma Virtual Koinon')
            .replace(/Plataforma Virtual(?! Koinon)/g, 'Plataforma Virtual Koinon')
          at.set('conteudo_html', html)
          mudou = true
        }
        if (mudou) {
          app.save(at)
        }
      }
    } catch (err) {
      console.log('Aviso ao normalizar atas_assembleia:', err)
    }
  },
  (app) => {
    // rollback opcional
  },
)

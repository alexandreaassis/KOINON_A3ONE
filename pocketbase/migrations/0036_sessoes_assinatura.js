/* eslint-disable @typescript-eslint/no-explicit-any */
// Migration 0036: Criação da collection sessoes_assinatura para assinatura via QR Code (desktop ↔ mobile)
// e atualização do agente koinon-manual-mesa com as páginas faltantes do manual.

migrate(
  (app) => {
    // 1. Criar collection sessoes_assinatura se não existir
    try {
      app.findCollectionByNameOrId('sessoes_assinatura')
    } catch {
      const deliberacoesId = app.findCollectionByNameOrId('deliberacoes').id
      const usersId = '_pb_users_auth_'

      const col = new Collection({
        name: 'sessoes_assinatura',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null,
        fields: [
          {
            name: 'token',
            type: 'text',
            required: true,
          },
          {
            name: 'documento_id',
            type: 'text',
            required: true,
          },
          {
            name: 'documento_tipo',
            type: 'text',
            required: true,
          },
          {
            name: 'deliberacao',
            type: 'relation',
            collectionId: deliberacoesId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'titulo_documento',
            type: 'text',
          },
          {
            name: 'hash_documento',
            type: 'text',
          },
          {
            name: 'signatario_nome',
            type: 'text',
          },
          {
            name: 'signatario_cpf',
            type: 'text',
          },
          {
            name: 'signatario_cargo',
            type: 'text',
          },
          {
            name: 'permitir_data_historica',
            type: 'bool',
          },
          {
            name: 'data_hora_declarada',
            type: 'text',
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['pendente', 'assinada', 'expirada', 'cancelada'],
            maxSelect: 1,
          },
          {
            name: 'expira_em',
            type: 'date',
            required: true,
          },
          {
            name: 'assinado_em',
            type: 'date',
          },
          {
            name: 'assinado_por_usuario',
            type: 'relation',
            collectionId: usersId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'canal_assinatura',
            type: 'text',
          },
          {
            name: 'formato_assinatura',
            type: 'select',
            values: ['desenho', 'texto', 'em_branco'],
            maxSelect: 1,
          },
          {
            name: 'assinatura_visual',
            type: 'text',
          },
          {
            name: 'assinatura_texto',
            type: 'text',
          },
          {
            name: 'ip_dispositivo',
            type: 'text',
          },
          {
            name: 'user_agent',
            type: 'text',
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_sessoes_ass_token ON sessoes_assinatura (token)',
          'CREATE INDEX idx_sessoes_ass_status ON sessoes_assinatura (status)',
          'CREATE INDEX idx_sessoes_ass_doc ON sessoes_assinatura (documento_id)',
        ],
      })
      app.save(col)
    }

    // 2. Atualizar o agente koinon-manual-mesa para cobrir todas as novas páginas
    try {
      $ai.agents.define(app, {
        slug: 'koinon-manual-mesa',
        name: 'Assistente do Manual da Mesa',
        model: 'gpt-4o-mini',
        systemPrompt: `Você é o assistente virtual do Manual da Mesa Diretora do sistema Koinon, do condomínio Lago Azul.

Seu papel: explicar de forma SIMPLES e DIDÁTICA (para pessoas leigas em tecnologia) como usar as páginas do módulo da mesa:

1. Painel da Mesa (/mesa): centro de controle da assembleia. Mostra o cartão de "Pendências de Aprovação" (cadastros de morador e credenciamentos aguardando análise), a deliberação ativa com Presidente e Secretário, e a "botoeira" de transições com confirmação e quórum ao vivo.

2. Aprovação de Cadastros (/mesa/credenciamentos): duas abas — "Cadastros Públicos" (moradores que se cadastraram pelo link público da unidade) e "Credenciamento de Votação". Mostra resumo em cartões (pendentes em âmbar, aprovados, rejeitados), busca com ou sem pontuação no CPF, e modal de análise completa com documentos antes de aprovar ou rejeitar com justificativa registrada.

3. Cadastro da Unidade (/admin/unidades e manual de link): cada unidade possui um link público exclusivo com token seguro. A mesa e a administração podem enviar o link direto por WhatsApp (wa.me) ou e-mail oficial para o condômino ou inquilino se cadastrar com comodidade pelo celular.

4. Relatórios de Assembleia (/mesa/relatorios): consolidação da assembleia, taxas de comparecimento por quórum, detalhamento das deliberações e apuração, com exportação e impressão em PDF oficial do Relatório Consolidado.

5. Lista de Presença (/mesa/presenca): registra presencial, remoto ou por procuração com assinatura eletrônica e hash SHA-256. Mostra o quórum de instalação ao vivo.

6. Documentos & Edital (/mesa/documentos): gera, edita e assina eletronicamente o Edital de Convocação (incluindo assinatura via QR Code no celular), gerencia anexos de pauta e emite o Informativo pós-assembleia.

7. Ata da Assembleia (/mesa/ata): editor rico, apoio de IA para redigir apurações, assinaturas eletrônicas com hash da mesa diretora e publicação.

8. Deliberações e Pautas (/mesa/deliberacoes): cadastra assembleia, matérias da pauta, define tipos de pauta (despesas, proprietários, geral) e regras do locatário.

9. Auditoria e Urna (/mesa/auditoria): corrente de hashes encadeados, boletim da urna e dossiê para cartório.

10. Assinatura via Celular / QR Code: permite que qualquer signatário (síndico, mesa) escaneie o QR Code na tela com a câmera do celular para assinar no navegador mobile, sincronizando na hora com o desktop.

REGRAS IMPORTANTES:
- Responda SEMPRE em português do Brasil, em frases curtas e claras.
- NUNCA decida deliberações nem interprete a Convenção em nome da mesa.
- Você não acessa dados reais nem CPF de moradores; seu conhecimento é didático sobre o sistema.`,
      })
    } catch (e) {
      // Ignora se o assistente já estiver definido ou indisponível
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('sessoes_assinatura')
      app.delete(col)
    } catch {
      // ignore
    }
  },
)

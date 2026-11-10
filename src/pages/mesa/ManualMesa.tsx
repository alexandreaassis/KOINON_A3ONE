import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCheck,
  Users,
  ScrollText,
  FileText,
  Gavel,
  ShieldCheck,
  Printer,
  ArrowRight,
  Building,
  BarChart3,
  MessageCircleQuestion,
  HelpCircle,
} from 'lucide-react'
import {
  CapaManual,
  TituloSecao,
  MockupTela,
  LegendaNumerada,
  CaixaImportante,
  CaixaDica,
  type SecaoManual,
} from '@/pages/morador/manual/BlocosManual'
import { PainelIaManualMesa } from './manual/PainelIaManualMesa'
import {
  MockupPainelMesa,
  MockupCredenciamentosMesa,
  MockupListaPresenca,
  MockupDocumentosEdital,
  MockupAtaMesa,
  MockupAuditoria,
  MockupCicloMesa,
} from './manual/MockupsMesa'
import MockupDeliberacoes from './manual/MockupDeliberacoes'
import {
  MockupAprovacaoCadastrosMesa,
  MockupCadastroUnidadeMesa,
  MockupRelatoriosAssembleiaMesa,
} from './manual/MockupNovasSecoesMesa'
import { useNarracao } from '@/hooks/useNarracao'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { EndossoA3One } from '@/components/brand/EndossoA3One'

/* Textos de narração (pt-BR) por seção */
const NARRACOES: Record<string, string> = {
  intro:
    'Bem-vindo ao Manual do Módulo da Mesa Diretora do Koinon. Aqui você aprende, em linguagem simples, como funciona cada página do módulo que conduz a assembleia eletrônica. A mesa aprova cadastros e credenciamentos, instala a assembleia com o quórum, conduz a votação na urna, apura os resultados, redige a ata com assinaturas eletrônicas e arquiva tudo no dossiê e na auditoria. Vamos por partes!',
  painel:
    'O Painel da Mesa é a sua central de comando. Ele mostra, de relance, as pendências de aprovação de cadastros e credenciamentos, o quórum de instalação da assembleia ao vivo, e a deliberação ativa, com a etapa em que ela está, do aguardo ao resultado publicado. Cada botão importante pede confirmação antes de agir: nada acontece de uma vez.',
  credenciamentos:
    'Em Credenciamentos, a mesa analisa o cadastro público enviado por link e decide quem participa da assembleia. A tela tem duas abas: cadastros públicos e credenciamento de votação. No topo, cartões de resumo mostram pendentes, aprovados, rejeitados, unidades ativas e o total. Pendentes aparecem destacados em âmbar, e a busca aceita nome, unidade ou C P F, com ou sem pontos. Ao aprovar, confirme no botão; ao rejeitar, informe o motivo, que é registrado no histórico.',
  presenca:
    'A Lista de Presença é o retrato oficial de quem está na assembleia. Cada pessoa aprovada entra com nome, unidade, vínculo e um selo: verde para presencial, azul para remoto e âmbar para procuração. O quórum de instalação é calculado ao vivo. Atingido o quórum, o botão de instalar a assembleia é liberado. Cada linha também recebe assinatura eletrônica com carimbo de hash.',
  documentos:
    'Em Documentos e Edital, a mesa prepara e distribui os papéis oficiais da assembleia. O edital de convocação é gerado com data, hora, local ou link e os itens da pauta, e depois publicado para os moradores. A pauta organiza as deliberações com seus anexos. Após a apuração, o informativo de deliberações resume o que foi decidido. A distribuição usa os canais de e-mail e WhatsApp configurados no sistema.',
  ata: 'A Ata é o registro oficial da assembleia. Nela, a mesa escreve com o editor rico, que tem negrito, listas e citações, e pode pedir ajuda à inteligência artificial para redigir os resultados — sempre revisando antes de usar. Feito o texto, os membros da mesa assinam eletronicamente, desenhando, digitando ou carimando, e cada assinatura recebe um carimbo de hash. Publicada a ata, todos os moradores têm acesso ao documento completo.',
  deliberacoes:
    'Em Deliberações e Pautas, a mesa cadastra a assembleia, monta a pauta item a item e conduz cada deliberação: abre a votação, acompanha em tempo real, encerra e apura. É também daqui que sai a botoeira que o Painel espelha. Cada transição de etapa fica registrada com data e hora para a auditoria.',
  aprovacao_cadastros:
    'Em Aprovação de Cadastros, a mesa analisa as solicitações enviadas pelos moradores através do link público da unidade. A mesa confere o nome, CPF, e-mail, telefone e o vínculo declarado — seja proprietário, condômino, inquilino ou procurador. Se os dados estiverem corretos, aprova e o morador recebe acesso. Se houver divergência, rejeita com motivo formal registrado.',
  cadastro_unidade:
    'O Cadastro da Unidade reúne o mapa predial do condomínio: números das unidades, blocos opcionais, frações ideais e os moradores ativos. Daqui a mesa e a administração geram o link exclusivo de autoatendimento com token para envio via WhatsApp ou e-mail, além de importar planilhas em massa.',
  relatorios:
    'Os Relatórios de Assembleia consolidam todo o evento em números e gráficos oficiais. Eles mostram o índice de comparecimento, taxa de quórum atingida, apuração percentual e nominal de cada item da pauta e o hash raiz da urna, permitindo impressão e download de PDF oficial para cartório e condôminos.',
  auditoria:
    'A Auditoria é a prova de transparência do sistema. Cada voto gera um hash, uma impressão digital eletrônica, ligada ao voto anterior, formando uma corrente: se alguém alterar um voto, o elo quebra e a auditoria mostra exatamente onde. Ali também ficam o boletim da urna de cada item, com os números e percentuais apurados, e o dossiê completo para cartório, assinado pela mesa. É da auditoria que sai a certeza de que o resultado confere.',
  ia: 'Ficou com alguma dúvida sobre o módulo da mesa? Use a IA do Koinon no fim deste manual. Ela explica cada página em linguagem simples, mas não decide deliberação e não enxerga dados dos moradores.',
  ciclo:
    'E como tudo se conecta? A mesa aprova o credenciamento, o morador vota na urna e cada voto recebe um hash encadeado, a apuração gera o boletim conferido pela mesa, a ata e o dossiê são assinados, e a auditoria guarda a cadeia inteira, verificável do primeiro ao último elo. Nada se perde, tudo é conferível.',
  faq: 'Ficou com alguma dúvida comum? Vamos às respostas mais procuradas pela mesa: como instalar a assembleia com quórum, o que fazer quando um credenciamento fica pendente, como funciona a assinatura da ata e o que é o hash encadeado. Se a sua dúvida não estiver aqui, pergunte à IA do Koinon ou à mesa diretora.',
}

const SECOES: SecaoManual[] = [
  {
    id: 'painel',
    titulo: 'Painel da Mesa — sua central de comando',
    rota: '/mesa',
    icone: LayoutDashboard,
    resumo:
      'Visão geral do dia da assembleia: pendências, quórum ao vivo e a deliberação ativa em uma só tela.',
  },
  {
    id: 'aprovacao_cadastros',
    titulo: 'Aprovação de Cadastros — validação de quem entra',
    rota: '/mesa/credenciamentos',
    icone: UserCheck,
    resumo:
      'Análise criteriosa dos cadastros públicos enviados por link de autoatendimento: conferência de vínculo, aprovação ou rejeição motivada.',
  },
  {
    id: 'cadastro_unidade',
    titulo: 'Cadastro da Unidade — base predial e moradores',
    rota: '/admin/cadastros',
    icone: Building,
    resumo:
      'Gestão de unidades, blocos e vínculos, geração e envio de links de cadastro com token via WhatsApp e e-mail, e importação de planilhas.',
  },
  {
    id: 'credenciamentos',
    titulo: 'Credenciamentos — quem participa da assembleia',
    rota: '/mesa/credenciamentos',
    icone: UserCheck,
    resumo:
      'Análise de cadastros públicos e credenciamento para votação, com resumo de pendências e abas separadas.',
  },
  {
    id: 'presenca',
    titulo: 'Lista de Presença — o quórum ao vivo',
    rota: '/mesa/presenca',
    icone: Users,
    resumo:
      'Retrato oficial de quem está na assembleia, com selos presencial, remoto e procuração, e quórum calculado em tempo real.',
  },
  {
    id: 'documentos',
    titulo: 'Documentos & Edital — os papéis oficiais',
    rota: '/mesa/documentos',
    icone: ScrollText,
    resumo:
      'Edital de convocação, pauta com anexos e informativo de deliberações, gerados e distribuídos pelo sistema.',
  },
  {
    id: 'ata',
    titulo: 'Ata — o registro oficial, com IA e assinatura',
    rota: '/mesa/ata',
    icone: FileText,
    resumo:
      'Editor rico, apoio da IA do Koinon e assinatura eletrônica da mesa com carimbo de hash.',
  },
  {
    id: 'deliberacoes',
    titulo: 'Deliberações e Pautas — a condução da assembleia',
    rota: '/mesa/deliberacoes',
    icone: Gavel,
    resumo:
      'Cadastro da assembleia, pauta item a item e condução de cada deliberação: abrir, acompanhar, encerrar e apurar.',
  },
  {
    id: 'relatorios',
    titulo: 'Relatórios de Assembleia — consolidação oficial',
    rota: '/mesa/relatorios',
    icone: BarChart3,
    resumo:
      'Relatório consolidado de presença, quórum, resultados da urna por item, gráficos comparativos e emissão de PDF para cartório.',
  },
  {
    id: 'auditoria',
    titulo: 'Auditoria — a corrente de confiança',
    rota: '/mesa/auditoria',
    icone: ShieldCheck,
    resumo:
      'Hash encadeado dos votos, boletim da urna e dossiê para cartório: a prova de que o resultado confere.',
  },
]

/* Posição dos marcadores numerados sobre cada mockup (x/y em %) */
const MARCADORES: Record<string, { n: number; x: number; y: number }[]> = {
  painel: [
    { n: 1, x: 24, y: 18 },
    { n: 2, x: 70, y: 34 },
    { n: 3, x: 50, y: 74 },
  ],
  credenciamentos: [
    { n: 1, x: 50, y: 10 },
    { n: 2, x: 50, y: 26 },
    { n: 3, x: 22, y: 46 },
    { n: 4, x: 78, y: 74 },
  ],
  presenca: [
    { n: 1, x: 80, y: 30 },
    { n: 2, x: 80, y: 46 },
    { n: 3, x: 80, y: 62 },
    { n: 4, x: 24, y: 12 },
  ],
  documentos: [
    { n: 1, x: 26, y: 24 },
    { n: 2, x: 72, y: 40 },
    { n: 3, x: 26, y: 66 },
    { n: 4, x: 74, y: 86 },
  ],
  ata: [
    { n: 1, x: 50, y: 26 },
    { n: 2, x: 76, y: 42 },
    { n: 3, x: 30, y: 70 },
    { n: 4, x: 70, y: 88 },
  ],
  aprovacao_cadastros: [
    { n: 1, x: 18, y: 30 },
    { n: 2, x: 50, y: 30 },
    { n: 3, x: 82, y: 30 },
    { n: 4, x: 80, y: 68 },
  ],
  cadastro_unidade: [
    { n: 1, x: 30, y: 36 },
    { n: 2, x: 70, y: 36 },
    { n: 3, x: 50, y: 78 },
  ],
  relatorios: [
    { n: 1, x: 20, y: 32 },
    { n: 2, x: 50, y: 32 },
    { n: 3, x: 80, y: 32 },
    { n: 4, x: 50, y: 76 },
  ],
  deliberacoes: [
    { n: 1, x: 50, y: 42 },
    { n: 2, x: 50, y: 72 },
    { n: 3, x: 18, y: 56 },
  ],
  auditoria: [
    { n: 1, x: 50, y: 24 },
    { n: 2, x: 30, y: 50 },
    { n: 3, x: 72, y: 74 },
  ],
}

const ManualMesaPage: React.FC = () => {
  const navigate = useNavigate()
  const { suportaVoz, estado, secaoAtual, narrar, pausarOuContinuar, parar } = useNarracao()

  const narrando = estado === 'tocando'
  const emPausa = estado === 'pausado'

  const abrirImpressao = () => window.print()
  const ouvir = (id: string) => narrar(id, NARRACOES[id] || '')
  const irPara = (rota: string) => navigate(rota)

  const propsTitulo = (id: string) => ({
    onOuvir: () => ouvir(id),
    narrando: narrando && secaoAtual === id,
    emPausa,
    suportaVoz,
    onPausar: pausarOuContinuar,
    onParar: parar,
  })

  const rolarParaSecao = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F7FC] pb-16">
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <CapaManual
          onImprimir={abrirImpressao}
          onRolarParaIa={() => rolarParaSecao('ia-koinon')}
          titulo="Manual de Instrução do Módulo da Mesa Diretora"
          descricao="Um guia ilustrado, em linguagem simples, para a mesa diretora conduzir a assembleia eletrônica do Lago Azul: aprovar credenciamentos, instalar a assembleia com quórum, conduzir a votação, apurar, assinar a ata e prestar contas na auditoria."
          rotuloRodape="Assembleia Eletrônica Lago Azul — conduzida pela mesa diretora"
        />

        {/* Índice */}
        <nav
          id="guia-conteudo"
          aria-label="Índice do manual"
          className="print-block mt-8 rounded-2xl border border-[#002B5E]/10 bg-white p-5 shadow-sm"
        >
          <h2 className="font-poppins text-lg font-bold text-[#002B5E]">Conteúdo do manual</h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {SECOES.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    rolarParaSecao(s.id)
                  }}
                  className="group flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2.5 text-sm text-slate-600 transition-colors hover:border-[#0066FF]/30 hover:bg-[#0066FF]/5 cursor-pointer"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#002B5E] text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1">{s.titulo}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-[#0066FF]" />
                </a>
              </li>
            ))}
            <li>
              <a
                href="#ia-koinon"
                onClick={(e) => {
                  e.preventDefault()
                  rolarParaSecao('ia-koinon')
                }}
                className="group flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2.5 text-sm text-slate-600 transition-colors hover:border-[#0066FF]/30 hover:bg-[#0066FF]/5 cursor-pointer"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0066FF] text-[11px] font-bold text-white">
                  8
                </span>
                <span className="flex-1">Pergunte à IA do Koinon</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-[#0066FF]" />
              </a>
            </li>
          </ol>
        </nav>

        {/* Seção de abertura — o ciclo completo */}
        <section className="mt-10 space-y-5">
          <TituloSecao
            secao={{
              id: 'intro',
              titulo: 'Como a mesa conduz a assembleia eletrônica',
              rota: 'ciclo completo',
              icone: HelpCircle,
            }}
            {...propsTitulo('intro')}
          />
          <p className="print-block text-sm leading-relaxed text-slate-600">
            A assembleia eletrônica não se conduz sozinha: é a mesa diretora que dá o tom. Veja as
            etapas — e onde cada página do módulo da mesa entra nessa história.
          </p>
          <div className="print-block">
            <MockupCicloMesa />
          </div>
          <CaixaImportante>
            Nada no sistema substitui a mesa diretora: em qualquer etapa, a conferência final é
            sempre humana. O Koinon registra, organiza e protege as informações — e a mesa valida.
          </CaixaImportante>
        </section>

        {/* Seções das páginas */}
        {SECOES.map((s, idx) => (
          <section key={s.id} className="mt-12 space-y-5">
            <TituloSecao secao={s} {...propsTitulo(s.id)} />
            <p className="print-block text-sm leading-relaxed text-slate-600">{s.resumo}</p>
            <div className="space-y-4">
              <MockupTela
                titulo={`koinon · Mesa — ${s.titulo.split('—')[0].trim()}`}
                marcadores={MARCADORES[s.id] ?? []}
              >
                {s.id === 'painel' && <MockupPainelMesa />}
                {s.id === 'aprovacao_cadastros' && <MockupAprovacaoCadastrosMesa />}
                {s.id === 'cadastro_unidade' && <MockupCadastroUnidadeMesa />}
                {s.id === 'credenciamentos' && <MockupCredenciamentosMesa />}
                {s.id === 'presenca' && <MockupListaPresenca />}
                {s.id === 'documentos' && <MockupDocumentosEdital />}
                {s.id === 'ata' && <MockupAtaMesa />}
                {s.id === 'deliberacoes' && <MockupDeliberacoes />}
                {s.id === 'relatorios' && <MockupRelatoriosAssembleiaMesa />}
                {s.id === 'auditoria' && <MockupAuditoria />}
              </MockupTela>
              {/* legendas por seção */}
              {s.id === 'aprovacao_cadastros' && (
                <>
                  <LegendaNumerada
                    itens={[
                      {
                        n: 1,
                        titulo: 'Fila de Pendentes',
                        texto:
                          'Cadastros preenchidos pelo morador via link público da unidade aguardando conferência da mesa.',
                      },
                      {
                        n: 2,
                        titulo: 'Aprovados',
                        texto:
                          'Moradores validados com acesso liberado para credenciamento e acompanhamento da assembleia.',
                      },
                      {
                        n: 3,
                        titulo: 'Rejeição Motivada',
                        texto:
                          'A rejeição exige justificativa formal da mesa e fica registrada para transparência do condomínio.',
                      },
                      {
                        n: 4,
                        titulo: 'Ação Individual',
                        texto:
                          'Botões de ação rápida com confirmação de segurança para evitar aprovações ou recusas acidentais.',
                      },
                    ]}
                  />
                  <CaixaImportante>
                    A mesa deve atentar para o tipo de vínculo: inquilinos e procuradores necessitam
                    de documentação de representação legal de acordo com a convenção do condomínio.
                  </CaixaImportante>
                </>
              )}
              {s.id === 'cadastro_unidade' && (
                <>
                  <LegendaNumerada
                    itens={[
                      {
                        n: 1,
                        titulo: 'Links com Token Exclusivo',
                        texto:
                          'Cada apartamento ou casa tem seu token único para autoatendimento sem senhas complexas.',
                      },
                      {
                        n: 2,
                        titulo: 'Carga em Massa',
                        texto:
                          'Importação fácil de arquivos CSV ou Excel com frações ideais e relação de proprietários.',
                      },
                      {
                        n: 3,
                        titulo: 'Visão Predial',
                        texto:
                          'Estrutura em blocos opcionais (ou torre única) com status de adimplência e histórico de moradores.',
                      },
                    ]}
                  />
                  <CaixaDica>
                    O disparo de links de cadastro pode ser feito diretamente via WhatsApp com um
                    clique no botão wa.me ou por e-mail em massa.
                  </CaixaDica>
                </>
              )}
              {s.id === 'relatorios' && (
                <>
                  <LegendaNumerada
                    itens={[
                      {
                        n: 1,
                        titulo: 'Taxa de Comparecimento',
                        texto:
                          'Percentual de presença calculado sobre o total de frações ou unidades, com validação de quórum.',
                      },
                      {
                        n: 2,
                        titulo: 'Urna 100% Auditada',
                        texto:
                          'Totalização de votos válidos, brancos e nulos com a garantia criptográfica de integridade.',
                      },
                      {
                        n: 3,
                        titulo: 'Exportação para Cartório',
                        texto:
                          'Geração de PDF oficial consolidado pronto para impressão ou arquivamento digital de registro.',
                      },
                      {
                        n: 4,
                        titulo: 'Hash Raiz de Cada Item',
                        texto:
                          'Identificador digital imutável que sela a apuração de cada pauta deliberada.',
                      },
                    ]}
                  />
                  <CaixaDica>
                    O Relatório Consolidado pode ser baixado em PDF imediatamente após a apuração
                    para leitura em plenária antes do encerramento da sessão.
                  </CaixaDica>
                </>
              )}
              {s.id === 'painel' && (
                <LegendaNumerada
                  itens={[
                    {
                      n: 1,
                      titulo: 'Pendências do dia',
                      texto:
                        'Cadastros e credenciamentos esperando decisão da mesa, com contagem em âmbar.',
                    },
                    {
                      n: 2,
                      titulo: 'Quórum ao vivo',
                      texto:
                        'Presencial, remoto e procuração somados em tempo real; atingido o mínimo, a instalação é liberada.',
                    },
                    {
                      n: 3,
                      titulo: 'Deliberação ativa',
                      texto:
                        'A etapa atual da votação em andamento — nada muda de fase sem confirmação.',
                    },
                  ]}
                />
              )}
              {s.id === 'credenciamentos' && (
                <>
                  <LegendaNumerada
                    itens={[
                      {
                        n: 1,
                        titulo: 'Duas abas',
                        texto:
                          'Cadastros públicos (análise do cadastro enviado por link) e credenciamento de votação (quem vai votar).',
                      },
                      {
                        n: 2,
                        titulo: 'Resumo em cartões',
                        texto:
                          'Pendentes, aprovados hoje, rejeitados, unidades ativas e total — um retrato rápido do módulo.',
                      },
                      {
                        n: 3,
                        titulo: 'Busca prática',
                        texto:
                          'Por nome, unidade ou C P F, com ou sem pontos: 123.456.789-00 e 12345678900 dão o mesmo resultado.',
                      },
                      {
                        n: 4,
                        titulo: 'Decisão com confirmação',
                        texto:
                          'Aprovar abre confirmação; rejeitar pede motivo, que fica registrado no histórico.',
                      },
                    ]}
                  />
                  <CaixaImportante>
                    Cadastro aprovado não é credenciamento aprovado: são etapas diferentes. O
                    credenciamento é o que garante o lugar na lista de presença e o voto.
                  </CaixaImportante>
                </>
              )}
              {s.id === 'presenca' && (
                <>
                  <LegendaNumerada
                    itens={[
                      {
                        n: 1,
                        titulo: 'Selo PRESENCIAL (verde)',
                        texto: 'Quem está no salão, conferido pela mesa no credenciamento.',
                      },
                      {
                        n: 2,
                        titulo: 'Selo REMOTO (azul)',
                        texto:
                          'Quem participa por videoconferência ou aplicativo, de qualquer lugar.',
                      },
                      {
                        n: 3,
                        titulo: 'Selo PROCURAÇÃO (âmbar)',
                        texto:
                          'Quem deu poderes a outro condômino para votar por ela — o sistema registra quem representa e quem é representado.',
                      },
                      {
                        n: 4,
                        titulo: 'Quórum de instalação',
                        texto:
                          'A soma dos presentes, em percentual das unidades, atualiza ao vivo; atingido o mínimo, o botão de instalar a assembleia libera.',
                      },
                    ]}
                  />
                  <CaixaDica>
                    Antes de instalar a assembleia, confira os selos: procurações vencidas ou sem
                    documento são a causa mais comum de questionamento depois.
                  </CaixaDica>
                </>
              )}
              {s.id === 'documentos' && (
                <>
                  <LegendaNumerada
                    itens={[
                      {
                        n: 1,
                        titulo: 'Edital de convocação',
                        texto:
                          'Gerado a partir da assembleia e da pauta; publicado, vira documento oficial e aparece para os moradores.',
                      },
                      {
                        n: 2,
                        titulo: 'Pauta com anexos',
                        texto:
                          'Cada deliberação com prestação de contas, convenção, currículos e propostas anexados.',
                      },
                      {
                        n: 3,
                        titulo: 'Informativo de deliberações',
                        texto:
                          'Resumo do que foi aprovado e rejeitado, distribuído após a apuração como prestação de contas.',
                      },
                      {
                        n: 4,
                        titulo: 'Distribuição',
                        texto:
                          'E-mail e WhatsApp do condomínio, configurados em Configurações, alimentam o envio aos moradores.',
                      },
                    ]}
                  />
                  <CaixaImportante>
                    O edital é a convocação oficial da assembleia. Sem ele publicado, a assembleia
                    não deve ser instalada — é ele que garante que todos foram cientificados.
                  </CaixaImportante>
                </>
              )}
              {s.id === 'ata' && (
                <>
                  <LegendaNumerada
                    itens={[
                      {
                        n: 1,
                        titulo: 'Editor rico',
                        texto:
                          'Negrito, itálico, listas e citações — a ata sai formatada para o PDF oficial.',
                      },
                      {
                        n: 2,
                        titulo: 'Apoio da IA',
                        texto:
                          'A IA do Koinon sugere textos, como o resumo dos resultados; a mesa revisa tudo antes de aproveitar.',
                      },
                      {
                        n: 3,
                        titulo: 'Assinatura eletrônica',
                        texto:
                          'Cada membro assina desenhando, digitando ou carimando; a assinatura recebe carimbo de hash e data e hora.',
                      },
                      {
                        n: 4,
                        titulo: 'Publicação',
                        texto:
                          'Publicada, a ata fica visível para todos os moradores, que podem ler e baixar o P D F.',
                      },
                    ]}
                  />
                  <CaixaDica>
                    Redija a ata junto com a apuração: os resultados do boletim entram prontos no
                    texto e a ata fica pronta logo após o encerramento.
                  </CaixaDica>
                </>
              )}
              {s.id === 'deliberacoes' && (
                <>
                  <LegendaNumerada
                    itens={[
                      {
                        n: 1,
                        titulo: 'Montagem da pauta',
                        texto: 'Cada item da assembleia, com descrição, tipo de votação e anexos.',
                      },
                      {
                        n: 2,
                        titulo: 'Condução ao vivo',
                        texto:
                          'Abrir votação, acompanhar em tempo real, encerrar e apurar — sempre com confirmação.',
                      },
                      {
                        n: 3,
                        titulo: 'Registro para auditoria',
                        texto:
                          'Cada transição de etapa fica gravada com data e hora, sem apagar o anterior.',
                      },
                    ]}
                  />
                </>
              )}
              {s.id === 'auditoria' && (
                <>
                  <LegendaNumerada
                    itens={[
                      {
                        n: 1,
                        titulo: 'Hash encadeado',
                        texto:
                          'Cada voto nasce do anterior: alterar um elo quebra a corrente e a auditoria aponta onde.',
                      },
                      {
                        n: 2,
                        titulo: 'Boletim da urna',
                        texto:
                          'Números e percentuais de cada item, apurados e conferidos pela mesa.',
                      },
                      {
                        n: 3,
                        titulo: 'Dossiê para cartório',
                        texto:
                          'O pacote completo — presença, votos, resultados e ata — assinado pela mesa.',
                      },
                    ]}
                  />
                  <CaixaImportante>
                    A auditoria não substitui a conferência humana: é ela que dá à mesa a base para
                    declarar o resultado em assembleia, com prova documental de cada passo.
                  </CaixaImportante>
                </>
              )}
            </div>
          </section>
        ))}

        {/* IA do Koinon */}
        <section className="mt-12 space-y-4">
          <TituloSecao
            secao={{
              id: 'ia-koinon',
              titulo: 'Pergunte à IA do Koinon',
              rota: 'assistente integrado',
              icone: MessageCircleQuestion,
            }}
            {...propsTitulo('ia')}
          />
          <p className="print-block text-sm leading-relaxed text-slate-600">
            Tem alguma dúvida que o manual não respondeu? Pergunte à IA do Koinon: ela conhece cada
            página do módulo da mesa e explica em linguagem simples. A conversa não registra seus
            dados pessoais.
          </p>
          <PainelIaManualMesa />
        </section>

        {/* Como o sistema se conecta */}
        <section className="mt-12 space-y-5">
          <TituloSecao
            secao={{
              id: 'ciclo',
              titulo: 'Como o sistema se conecta',
              rota: 'mesa → urna → ata → auditoria',
              icone: LayoutDashboard,
            }}
            {...propsTitulo('ciclo')}
          />
          <p className="print-block text-sm leading-relaxed text-slate-600">
            Cada página do módulo da mesa alimenta a seguinte. Este é o caminho completo, do
            credenciamento à auditoria.
          </p>
          <FluxoConexao />
        </section>

        {/* FAQ */}
        <section className="mt-12 space-y-5">
          <TituloSecao
            secao={{
              id: 'faq',
              titulo: 'Perguntas frequentes (FAQ)',
              rota: 'dúvidas comuns',
              icone: HelpCircle,
            }}
            {...propsTitulo('faq')}
          />
          <FaqCurto />
          <CaixaDica>
            Regras como quórum de instalação e voto de inadimplente são decididas em deliberação da
            assembleia e constam da Convenção do condomínio — quando tiver dúvida sobre a regra,
            vale confirmar antes de conduzir a votação.
          </CaixaDica>
        </section>

        {/* Rodapé institucional */}
        <footer className="print-block mt-14 rounded-2xl border border-[#002B5E]/10 bg-white p-6 text-center shadow-sm">
          <div className="flex items-center justify-center gap-3">
            <KoinonSymbol size={36} />
            <span className="font-poppins text-sm font-bold text-[#002B5E]">Koinon</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Assembleia Eletrônica Lago Azul — apuração conferida pela mesa
          </p>
          <div className="mt-3 flex justify-center">
            <EndossoA3One />
          </div>
          <span className="mt-3 block text-[11px] text-slate-400">
            Manual do Módulo da Mesa Diretora · {SECOES.length} páginas explicadas · atualizado em
            2026
          </span>
        </footer>
      </div>
    </div>
  )
}

/* ---------- Fluxo de conexão (seção final) ---------- */
const FluxoConexao: React.FC = () => {
  const passos = [
    {
      de: 'A mesa aprova o credenciamento',
      para: 'Lista de presença',
      texto:
        'Cada aprovação insere a pessoa na lista com o selo presencial, remoto ou procuração, e soma no quórum ao vivo.',
    },
    {
      de: 'A mesa instala a assembleia',
      para: 'Urna eletrônica',
      texto:
        'Com o quórum atingido e o edital publicado, a votação abre para quem está credenciado.',
    },
    {
      de: 'O morador vota',
      para: 'Cédula com hash encadeado',
      texto:
        'Cada voto recebe uma impressão digital (hash) ligada à anterior — se alguém mexer, a corrente quebra e a auditoria aponta.',
    },
    {
      de: 'A mesa apura',
      para: 'Boletim da urna',
      texto: 'A apuração soma os votos por item, confere os hashes e compara com o quórum exigido.',
    },
    {
      de: 'A mesa registra',
      para: 'Ata e dossiê assinados',
      texto:
        'Os resultados entram na ata e no dossiê para cartório, com assinaturas eletrônicas da mesa.',
    },
    {
      de: 'Tudo fica registrado',
      para: 'Auditoria verificável',
      texto:
        'Cada passo — aprovação, voto, apuração, assinatura — fica registrado com data e hora, verificável do início ao fim.',
    },
  ]
  return (
    <div className="space-y-3">
      {passos.map((p, i) => (
        <div key={p.de} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0066FF] to-[#002B5E] text-[13px] font-bold text-white">
              {i + 1}
            </span>
            {i < passos.length - 1 && (
              <span className="my-1 w-px flex-1 bg-[#0066FF]/20" aria-hidden />
            )}
          </div>
          <div className="flex-1 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-[#002B5E]">
              {p.de} <span className="text-[#0066FF]">→</span> {p.para}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{p.texto}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- FAQ ---------- */
const FaqCurto: React.FC = () => {
  const perguntas = [
    {
      p: 'Como instalo a assembleia com quórum?',
      r: 'Acompanhe a Lista de Presença: o percentual de unidades presentes atualiza ao vivo. Atingido o quórum mínimo exigido para instalação, o botão de instalar a assembleia é liberado — e a decisão é registrada com data e hora para a auditoria.',
    },
    {
      p: 'Um cadastro está pendente há dias. O que faço?',
      r: 'No Painel da Mesa e em Credenciamentos, os pendentes aparecem em âmbar, primeiro na fila. Abra o modal de análise, confira os dados e o documento, e aprove ou rejeite com motivo — o morador é notificado em qualquer caso.',
    },
    {
      p: 'Posso aprovar um credenciamento durante a votação?',
      r: 'Sim: o credenciamento aprovado entra na lista de presença e a pessoa pode votar nos itens ainda abertos. Vale confirmar com a assembleia se houver questionamento sobre o momento da entrada.',
    },
    {
      p: 'A IA do Koinon pode escrever a ata inteira?',
      r: 'Ela ajuda: sugere textos, como o resumo dos resultados de cada item. Mas a ata é responsabilidade da mesa — revise sempre antes de usar, confirme nomes, unidades e números, e só então assine e publique.',
    },
    {
      p: 'O que é o hash encadeado?',
      r: 'É uma impressão digital eletrônica. Cada voto gera um hash que nasce do voto anterior, como elos de uma corrente. Se alguém alterar qualquer voto, o elo quebra e a auditoria mostra exatamente onde a corrente deixou de bater.',
    },
    {
      p: 'E se dois membros da mesa assinarem em horários diferentes?',
      r: 'Sem problema: cada assinatura leva o próprio carimbo de data e hora. A ata só é publicada com todas as assinaturas da mesa feitas.',
    },
    {
      p: 'Regras de quórum e de inadimplência são fixas no sistema?',
      r: 'Não: são parâmetros decididos em deliberação e constam da Convenção do condomínio. Confira a regra vigente antes de instalar a assembleia ou validar um voto.',
    },
  ]
  const [aberta, setAberta] = React.useState<number | null>(0)
  return (
    <div className="space-y-2">
      {perguntas.map((item, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm"
        >
          <button
            type="button"
            onClick={() => setAberta(aberta === i ? null : i)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            aria-expanded={aberta === i}
          >
            <span className="text-sm font-semibold text-[#002B5E]">{item.p}</span>
            <span
              className={`shrink-0 text-[#0066FF] transition-transform ${aberta === i ? 'rotate-180' : ''}`}
              aria-hidden
            >
              ▼
            </span>
          </button>
          {aberta === i && (
            <p className="border-t border-slate-50 bg-[#F3F7FC]/60 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
              {item.r}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

export default ManualMesaPage

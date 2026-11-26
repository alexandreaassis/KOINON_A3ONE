import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  type DeliberacaoRecord,
  type UnidadeRecord,
  type PresencaAssinaturaRecord,
  type PresencaRecord,
  type CredenciamentoRecord,
  type AssinaturaDocumentoRecord,
} from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { useAuth } from '@/context/AuthContext'
import { formatarCpf, validarCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import {
  formatarIdentificadorUnidade,
  normalizarBloco,
  temBlocoReal,
} from '@/lib/formatadorUnidade'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
import {
  type TipoGeracaoPdf,
  ROTULO_IMPRESSAO_LIMPA,
  imprimirHtmlDocumentoLimpo,
} from '@/lib/impressaoLimpa'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Printer,
  BookOpen,
  PenLine,
  UserCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Upload,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'
import { BlocoAssinaturaCompacto } from '@/components/assinatura/BlocoAssinaturaCompacto'
import {
  SeletorAssinatura,
  DadosCapturaAssinatura,
} from '@/components/assinatura/SeletorAssinatura'
import { ModalAssinaturaEletronica } from '@/components/assinatura/ModalAssinaturaEletronica'
import { FormatoAssinatura } from '@/lib/api'
import { bytesToBase64 } from '@/lib/pdf/gerarPdfListaPresencaBytes'
import { ModalZapsignLinks } from '@/components/assinatura/ModalZapsignLinks'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { gerarPdfListaPresencaComHash } from '@/lib/pdfListaPresenca'
import { resolverNomesTitularesEmLote } from '@/lib/titularUnidade'
import type { ZapSignSignatarioUrl } from '@/lib/api'

export const ListaPresencaPage: React.FC = () => {
  const navigate = useNavigate()
  const { nomeCondominio, logoUrl, rotuloUnidade } = useCondoConfig()
  const { user } = useAuth()

  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [presencasAssinadas, setPresencasAssinadas] = useState<PresencaAssinaturaRecord[]>([])
  const [presencasAntigas, setPresencasAntigas] = useState<PresencaRecord[]>([])
  const [credenciamentos, setCredenciamentos] = useState<CredenciamentoRecord[]>([])
  // v0.0.227: nome do titular resolvido como na v0.0.218 — cadastros_unidade
  // (vínculo aprovado/ativo) primeiro; unidades.responsavel_nome só como
  // fallback. Unidades sem nome confiável NÃO entram no mapa.
  const [nomesTitulares, setNomesTitulares] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState(true)

  // Filtro
  const [busca, setBusca] = useState('')

  // Modal Assinatura / Registro de Presença
  const [modalPresencaAberto, setModalPresencaAberto] = useState(false)
  const [unidadeSelecionadaId, setUnidadeSelecionadaId] = useState('')
  const [participanteNome, setParticipanteNome] = useState('')
  const [participanteCpf, setParticipanteCpf] = useState('')
  const [cpfErro, setCpfErro] = useState<string | null>(null)
  const [formaPresenca, setFormaPresenca] = useState<'presencial' | 'remoto' | 'procuracao'>(
    'presencial',
  )
  const [nomeProcurador, setNomeProcurador] = useState('')
  const [cpfProcurador, setCpfProcurador] = useState('')
  const [procuradorCpfErro, setProcuradorCpfErro] = useState<string | null>(null)
  const [arquivoProcuracao, setArquivoProcuracao] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [capturaPresenca, setCapturaPresenca] = useState<DadosCapturaAssinatura>({
    formato: 'desenho',
  })

  // Assinaturas da Mesa Diretora (Presidente e Secretário)
  const [modalAssinaturaMesa, setModalAssinaturaMesa] = useState<
    'mesa_presidente' | 'mesa_secretario' | null
  >(null)
  const [salvandoMesa, setSalvandoMesa] = useState(false)
  const [assinaturaPresidente, setAssinaturaPresidente] =
    useState<AssinaturaDocumentoRecord | null>(null)
  const [assinaturaSecretario, setAssinaturaSecretario] =
    useState<AssinaturaDocumentoRecord | null>(null)

  // ZapSign (mesmo padrão da ata): status/links persistidos na collection listas_presenca
  const [zapsignStatus, setZapsignStatus] = useState<string>('')
  const [zapsignDocToken, setZapsignDocToken] = useState<string | null>(null)
  const [zapsignSignatarios, setZapsignSignatarios] = useState<ZapSignSignatarioUrl[] | null>(null)
  const [zapsignEnviando, setZapsignEnviando] = useState(false)
  const [zapsignMotivo, setZapsignMotivo] = useState<string | null>(null)
  const [modalZapsignAberto, setModalZapsignAberto] = useState(false)
  const [listaDbId, setListaDbId] = useState<string | null>(null)

  // Protocolo "Impressão limpa (sem assinatura eletrônica)"
  const [tipoGeracao, setTipoGeracao] = useState<TipoGeracaoPdf>('padrao')

  // Carregar dados
  const carregarDados = async (delibId?: string) => {
    setCarregando(true)
    try {
      const [delibs, unids, creds] = await Promise.all([
        api.getDeliberacoes(),
        api.getUnidades(),
        api.getCredenciamentos("status = 'aprovado'"),
      ])

      setDeliberacoes(delibs)
      setUnidades(unids)
      setCredenciamentos(creds)

      // Nome de titular por unidade (cadastros_unidade com fallback) —
      // alimenta unidades ausentes na tabela e na impressão limpa.
      resolverNomesTitularesEmLote(unids)
        .then(setNomesTitulares)
        .catch(() => setNomesTitulares({}))

      const delib = delibId
        ? delibs.find((d) => d.id === delibId) || delibs[0]
        : delibs.find((d) => d.status !== 'PUBLICADA' && d.status !== 'ENCERRADA') || delibs[0]

      setDeliberacaoAtiva(delib || null)

      if (delib) {
        const [assList, presList, assinaturasDoc] = await Promise.all([
          api.getPresencasAssinatura(delib.id),
          api.getPresencas(delib.id),
          api.getAssinaturasPorDeliberacao(delib.id),
        ])
        setPresencasAssinadas(assList)
        setPresencasAntigas(presList)

        const docIdLista = `lista_presenca_${delib.id}`
        const presMesa = assinaturasDoc.find(
          (a) =>
            (a.documento_id === docIdLista || a.documento_tipo === 'lista_presenca') &&
            a.tipo === 'mesa_presidente' &&
            a.status === 'valida',
        )
        const secMesa = assinaturasDoc.find(
          (a) =>
            (a.documento_id === docIdLista || a.documento_tipo === 'lista_presenca') &&
            a.tipo === 'mesa_secretario' &&
            a.status === 'valida',
        )
        setAssinaturaPresidente(presMesa || null)
        setAssinaturaSecretario(secMesa || null)

        // Restaurar estado ZapSign persistido no registro da lista de presença
        try {
          const lista = await api.obterListaPresencaDocumento(delib.id)
          if (lista) {
            setListaDbId(lista.id)
            setZapsignStatus(lista.zapsign_status || '')
            setZapsignDocToken(lista.zapsign_documento_token || null)
            setZapsignSignatarios(
              (lista.zapsign_urls as ZapSignSignatarioUrl[] | undefined) || null,
            )
            setZapsignMotivo(lista.zapsign_motivo_falha || null)
          } else {
            setListaDbId(null)
            setZapsignStatus('')
            setZapsignDocToken(null)
            setZapsignSignatarios(null)
            setZapsignMotivo(null)
          }
        } catch {
          /* collection ainda sem registro para esta deliberação — estado limpo */
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar lista de presença:', err)
      toast({
        title: 'Erro ao carregar lista de presença',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Ao selecionar uma unidade no modal, pré-preencher com credenciamento aprovado se existir
  const handleSelecionarUnidadeModal = (uId: string) => {
    setUnidadeSelecionadaId(uId)
    const cred = credenciamentos.find((c) => c.unidade === uId)
    if (cred) {
      setParticipanteNome(cred.titular_nome)
      setParticipanteCpf(formatarCpf(cred.cpf))
      if (cred.tipo_vinculo === 'procurador') {
        setFormaPresenca('procuracao')
      }
    } else {
      // Somente nomes resolvíveis (cadastro de vínculo ou responsavel_nome real).
      // Placeholders "Condômino Apto NNNN" nunca pré-preenchem o modal:
      // sem nome confiável, o campo fica vazio para a mesa digitar.
      const u = unidades.find((item) => item.id === uId)
      if (u && nomesTitulares[u.id]) {
        setParticipanteNome(nomesTitulares[u.id])
      }
    }
  }

  // Hash SHA-256 no browser
  const calcularSha256 = async (texto: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(texto)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Submeter Registro de Presença com Assinatura Eletrônica
  const handleSalvarPresenca = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliberacaoAtiva || !unidadeSelecionadaId) {
      toast({ title: 'Selecione a unidade', variant: 'destructive' })
      return
    }

    if (!participanteNome.trim()) {
      toast({ title: 'Nome do participante obrigatório', variant: 'destructive' })
      return
    }

    const rawCpf = participanteCpf.replace(/\D/g, '')
    if (rawCpf.length > 0 && !validarCpf(participanteCpf)) {
      setCpfErro(MSG_CPF_INVALIDO)
      return
    }
    setCpfErro(null)

    if (formaPresenca === 'procuracao') {
      if (!nomeProcurador.trim()) {
        toast({ title: 'Nome do procurador obrigatório', variant: 'destructive' })
        return
      }
      const rawCpfProc = cpfProcurador.replace(/\D/g, '')
      if (rawCpfProc.length > 0 && !validarCpf(cpfProcurador)) {
        setProcuradorCpfErro(MSG_CPF_INVALIDO)
        return
      }
      setProcuradorCpfErro(null)
    }

    setSalvando(true)
    try {
      const dataHora = new Date().toISOString()
      const payloadHash = JSON.stringify({
        deliberacao: deliberacaoAtiva.id,
        unidade: unidadeSelecionadaId,
        nome: participanteNome.trim(),
        cpf: rawCpf,
        forma: formaPresenca,
        nomeProcurador: nomeProcurador.trim(),
        cpfProcurador: cpfProcurador.replace(/\D/g, ''),
        momento: dataHora,
        formatoAssinatura: capturaPresenca.formato,
      })

      const hashAssinatura = await calcularSha256(payloadHash)

      // Checar se já existe registro prévio desta unidade
      const existente = presencasAssinadas.find((p) => p.unidade === unidadeSelecionadaId)

      // Por procuração, o campo principal (nome/cpf) é SEMPRE do proprietário aprovado da unidade;
      // o procurador vai somente em nome_procurador/cpf_procurador.
      let nomeTitular = participanteNome.trim()
      let cpfTitular = rawCpf
      if (formaPresenca === 'procuracao') {
        const proprietarios = await api.getCadastrosUnidades({
          unidadeId: unidadeSelecionadaId,
          vinculo: 'proprietario',
          statusAprovacao: 'aprovado',
        })
        const proprietario = proprietarios[0]
        if (!proprietario) {
          toast({
            title: 'Proprietário aprovado não encontrado',
            description:
              'Cadastre e aprove o proprietário desta unidade antes de registrar a procuração.',
            variant: 'destructive',
          })
          return
        }
        nomeTitular = proprietario.nome
        cpfTitular = (proprietario.cpf || '').replace(/\D/g, '')
      }

      const formData = new FormData()
      formData.append('deliberacao', deliberacaoAtiva.id)
      formData.append('unidade', unidadeSelecionadaId)
      formData.append('nome', nomeTitular)
      formData.append('cpf', cpfTitular)
      formData.append('forma', formaPresenca)
      formData.append('assinatura_hash', hashAssinatura)
      formData.append('data_hora_assinatura', dataHora)
      formData.append('ip_dispositivo', navigator.userAgent)
      formData.append('formato_assinatura', capturaPresenca.formato)
      if (capturaPresenca.formato === 'desenho' && capturaPresenca.assinaturaVisual) {
        formData.append('assinatura_visual', capturaPresenca.assinaturaVisual)
      }
      if (capturaPresenca.formato === 'texto' && capturaPresenca.assinaturaTexto) {
        formData.append('assinatura_texto', capturaPresenca.assinaturaTexto)
      }

      if (formaPresenca === 'procuracao') {
        formData.append('nome_procurador', nomeProcurador.trim())
        formData.append('cpf_procurador', cpfProcurador.replace(/\D/g, ''))
        if (arquivoProcuracao) {
          formData.append('procuracao_arquivo', arquivoProcuracao)
        }
      }

      await api.salvarPresencaAssinatura(formData, existente?.id)

      // Registrar também na collection legada `presencas` se ainda não estiver
      try {
        await api.registrarPresencaPresencial(deliberacaoAtiva.id, unidadeSelecionadaId)
      } catch {
        /* intentionally ignored */
      }

      // Gravar auditoria
      await api.registrarEventoAuditoria({
        evento: 'presenca_assinada',
        fator: `Mesa: presença registrada (${formaPresenca}) para unidade ${unidadeSelecionadaId} - Assinante: ${participanteNome}`,
        unidade: unidadeSelecionadaId,
        dispositivo: navigator.userAgent,
      })

      toast({
        title: 'Presença e assinatura registradas',
        description: `Carimbo SHA-256 gerado: ${hashAssinatura.substring(0, 16)}...`,
      })

      setModalPresencaAberto(false)
      setUnidadeSelecionadaId('')
      setParticipanteNome('')
      setParticipanteCpf('')
      setNomeProcurador('')
      setCpfProcurador('')
      setArquivoProcuracao(null)
      setCapturaPresenca({ formato: 'desenho' })

      if (deliberacaoAtiva) {
        const assList = await api.getPresencasAssinatura(deliberacaoAtiva.id)
        setPresencasAssinadas(assList)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar presença',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Assinar como Mesa Diretora (Presidente ou Secretário)
  const handleConfirmarAssinaturaMesa = async (dados: {
    nome: string
    cpf: string
    cargo?: string
    formato: FormatoAssinatura
    assinaturaVisual?: string
    assinaturaTexto?: string
  }) => {
    if (!deliberacaoAtiva || !modalAssinaturaMesa) return

    setSalvandoMesa(true)
    try {
      const dataHoraIso = new Date().toISOString()
      const docId = `lista_presenca_${deliberacaoAtiva.id}`

      const payloadHash = JSON.stringify({
        deliberacaoId: deliberacaoAtiva.id,
        tipoDocumento: 'lista_presenca',
        cargoMesa: modalAssinaturaMesa,
        nome: dados.nome,
        cpf: dados.cpf,
        totalPresentes,
        momentoAssinatura: dataHoraIso,
      })

      const hash = await calcularSha256(payloadHash)

      const reg = await api.registrarAssinaturaDocumento({
        documento_id: docId,
        documento_tipo: 'lista_presenca',
        deliberacao: deliberacaoAtiva.id,
        assinante_nome: dados.nome,
        assinante_cpf: dados.cpf,
        tipo: modalAssinaturaMesa,
        hash_documento: hash,
        data_hora: dataHoraIso,
        usuario: user?.id,
        ip_dispositivo: navigator.userAgent,
        formato_assinatura: dados.formato,
        assinatura_visual: dados.assinaturaVisual,
        assinatura_texto: dados.assinaturaTexto,
      })

      if (modalAssinaturaMesa === 'mesa_presidente') {
        setAssinaturaPresidente(reg)
      } else {
        setAssinaturaSecretario(reg)
      }

      await api.registrarEventoAuditoria({
        evento: 'assinatura_registrada',
        fator: `Mesa Diretora: ${dados.nome} assinou a Lista de Presença (${modalAssinaturaMesa}) com modo ${dados.formato}`,
        dispositivo: navigator.userAgent,
      })

      setModalAssinaturaMesa(null)
      toast({
        title: 'Assinatura da mesa registrada',
        description: `Carimbo SHA-256 gerado: ${hash.substring(0, 16)}...`,
      })
    } catch (err: any) {
      const isRede =
        !err?.status ||
        err?.status === 0 ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError')
      const msg = isRede
        ? 'Falha de conexão com o servidor. O traço da sua assinatura foi preservado — clique em "Confirmar e Assinar" novamente.'
        : err?.message || 'Falha ao registrar assinatura da mesa.'
      toast({
        title: 'Erro ao registrar assinatura da mesa',
        description: msg,
        variant: 'destructive',
      })
      throw err
    } finally {
      setSalvandoMesa(false)
    }
  }

  // Definição e Larguras padrão das Colunas da Tabela
  const STORAGE_KEY_LARGURAS = 'koinon_lista_presenca_colunas_v1'
  const LARGURAS_PADRAO: Record<string, number> = {
    unidade: 74, // largura da palavra "Unidade" (cabeçalho)
    titular: 280, // v0.0.193: maior nome de TITULAR em UMA linha, sem folga excessiva
    situacao: 92, // largura da maior palavra (ex.: "Presencial")
    procuracao: 250, // v0.0.193: maior nome de PROCURADOR em UMA linha (ex.: Edilaine)
    assinatura: 216, // recebe o espaço restante
  }
  const LARGURAS_MINIMAS: Record<string, number> = {
    unidade: 64,
    titular: 130,
    situacao: 80,
    procuracao: 120,
    assinatura: 140,
  }

  // v0.0.233: larguras salvas no localStorage podem estar antigas, zeradas ou
  // fora de escala (salvas antes de uma correção de layout) — todo valor é
  // saneado com clamp entre mínimo e máximo antes de entrar no estado.
  const LARGURAS_MAXIMAS: Record<string, number> = {
    unidade: 200,
    titular: 480,
    situacao: 200,
    procuracao: 480,
    assinatura: 480,
  }
  const LARGURA_TOTAL_MAXIMA_A4 = 1000
  const clampLargura = (colKey: string, valor: unknown): number => {
    const n = typeof valor === 'number' && Number.isFinite(valor) ? Math.round(valor) : 0
    const min = LARGURAS_MINIMAS[colKey] || 60
    const max = LARGURAS_MAXIMAS[colKey] || 480
    if (n <= 0) return LARGURAS_PADRAO[colKey] || 100
    return Math.min(max, Math.max(min, n))
  }
  const sanearLarguras = (entrada: unknown): Record<string, number> => {
    if (!entrada || typeof entrada !== 'object') return { ...LARGURAS_PADRAO }
    const fonte = entrada as Record<string, unknown>
    return Object.keys(LARGURAS_PADRAO).reduce<Record<string, number>>(
      (acc, key) => ({ ...acc, [key]: clampLargura(key, fonte[key]) }),
      {},
    )
  }
  /** Ajusta a soma ao papel mantendo as proporções entre colunas. */
  const escalarParaA4 = (l: Record<string, number>): Record<string, number> => {
    const total = Object.values(l).reduce((s, v) => s + v, 0)
    if (total <= LARGURA_TOTAL_MAXIMA_A4) return l
    const fator = LARGURA_TOTAL_MAXIMA_A4 / total
    return Object.keys(l).reduce<Record<string, number>>(
      (acc, key) => ({ ...acc, [key]: Math.max(40, Math.round(l[key] * fator)) }),
      {},
    )
  }

  const [largurasColunas, setLargurasColunas] = useState<Record<string, number>>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_LARGURAS)
      if (salvo) {
        const parsed = JSON.parse(salvo)
        return sanearLarguras({ ...LARGURAS_PADRAO, ...parsed })
      }
    } catch {
      /* ignore */
    }
    return { ...LARGURAS_PADRAO }
  })

  // Salvar larguras ao alterar
  const salvarLarguraColuna = (colKey: string, novaLargura: number) => {
    setLargurasColunas((antigas) => {
      const min = LARGURAS_MINIMAS[colKey] || 60
      const ajustada = Math.max(min, Math.round(novaLargura))
      const novo = { ...antigas, [colKey]: ajustada }
      try {
        localStorage.setItem(STORAGE_KEY_LARGURAS, JSON.stringify(novo))
      } catch {
        /* ignore */
      }
      return novo
    })
  }

  // Restaurar larguras ao padrão
  const restaurarLargurasPadrao = () => {
    setLargurasColunas(LARGURAS_PADRAO)
    try {
      localStorage.removeItem(STORAGE_KEY_LARGURAS)
    } catch {
      /* ignore */
    }
    toast({
      title: 'Larguras restauradas',
      description: 'As colunas da lista de presença voltaram à largura padrão.',
    })
  }

  // Iniciar arraste de redimensionamento (Mouse ou Touch)
  const iniciarRedimensionamento = (
    colKey: string,
    eventoInicial: React.MouseEvent | React.TouchEvent,
  ) => {
    eventoInicial.preventDefault()
    eventoInicial.stopPropagation()

    const clientXInicial =
      'touches' in eventoInicial ? eventoInicial.touches[0].clientX : eventoInicial.clientX
    const larguraInicial = largurasColunas[colKey] || LARGURAS_PADRAO[colKey] || 100
    const min = LARGURAS_MINIMAS[colKey] || 60

    let larguraAtual = larguraInicial

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
      const deltaX = currentX - clientXInicial
      larguraAtual = Math.max(min, Math.round(larguraInicial + deltaX))

      setLargurasColunas((prev) => ({
        ...prev,
        [colKey]: larguraAtual,
      }))
    }

    const onPointerUp = () => {
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('mouseup', onPointerUp)
      window.removeEventListener('touchmove', onPointerMove)
      window.removeEventListener('touchend', onPointerUp)
      window.removeEventListener('touchcancel', onPointerUp)

      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      // Persistir valor final
      setLargurasColunas((prev) => {
        const finalObj = { ...prev, [colKey]: larguraAtual }
        try {
          localStorage.setItem(STORAGE_KEY_LARGURAS, JSON.stringify(finalObj))
        } catch {
          /* ignore */
        }
        return finalObj
      })
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    window.addEventListener('mousemove', onPointerMove, { passive: true })
    window.addEventListener('mouseup', onPointerUp)
    window.addEventListener('touchmove', onPointerMove, { passive: true })
    window.addEventListener('touchend', onPointerUp)
    window.addEventListener('touchcancel', onPointerUp)
  }

  // Unidades combinadas com status de presença
  const mapaPresencas = new Map<string, PresencaAssinaturaRecord>()
  presencasAssinadas.forEach((p) => mapaPresencas.set(p.unidade, p))

  // Calibração por MEDIDA DE TEXTO real (canvas) — v0.0.193:
  //   Nome          = maior nome de TITULAR em UMA linha, sem folga excessiva;
  //   Procurador(a) = maior nome de PROCURADOR em UMA linha (ex.: "Edilaine
  //                   Pereira Lima Zanoni" não pode quebrar em duas).
  //   Assinatura continua recebendo o espaço que sobrar.
  const FONTE_MEDICAO = '600 12px Inter, "Segoe UI", Arial, sans-serif'
  const medirTextoPx = (txt: string): number => {
    const t = (txt || '').trim()
    if (!t) return 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return t.length * 6.2
    ctx.font = FONTE_MEDICAO
    return ctx.measureText(t).width
  }
  const larguraIdealTitular = useMemo(() => {
    const candidatos = [
      ...presencasAssinadas.map((p) => p.nome || ''),
      // Só nomes resolvíveis: placeholder "Condômino Apto NNNN" não mede largura.
      ...unidades.map((u) => nomesTitulares[u.id] || ''),
    ]
    const maior = candidatos.reduce((m, n) => (n.length > m.length ? n : m), '')
    const ideal = Math.ceil(medirTextoPx(maior)) + 26 // padding das células + folga mínima
    return Math.min(320, Math.max(LARGURAS_MINIMAS.titular, ideal))
    // nomesTitulares participa da medição (nome resolvido pode ser maior)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presencasAssinadas, unidades, nomesTitulares])

  const larguraIdealProcuracao = useMemo(() => {
    const candidatos = presencasAssinadas
      .filter((p) => p.forma === 'procuracao')
      .map((p) => p.nome_procurador || '')
    const maior = candidatos.reduce((m, n) => (n.length > m.length ? n : m), '')
    if (!maior) return LARGURAS_PADRAO.procuracao
    const ideal = Math.ceil(medirTextoPx(maior)) + 26
    return Math.min(360, Math.max(LARGURAS_MINIMAS.procuracao, ideal))
  }, [presencasAssinadas])

  const [largurasAplicadas, setLargurasAplicadas] = useState<Record<string, number>>(() =>
    sanearLarguras(largurasColunas),
  )
  const jaAjustado = useMemo(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY_LARGURAS)
    } catch {
      return false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (jaAjustado) return
    setLargurasAplicadas((prev) => ({
      ...prev,
      titular: larguraIdealTitular,
      procuracao: larguraIdealProcuracao,
    }))
  }, [jaAjustado, larguraIdealTitular, larguraIdealProcuracao])
  // v0.0.233: raiz do defeito de impressão — a largura impressa deriva SEMPRE
  // do estado real da tabela no momento da impressão, saneado e contido ao
  // papel; o localStorage nunca é aplicado cru.
  const largurasFinais = escalarParaA4(jaAjustado ? largurasColunas : largurasAplicadas)
  const percentuais = useMemo(() => {
    const total = Object.values(largurasFinais).reduce((s, v) => s + v, 0) || 1
    return Object.keys(largurasFinais).reduce<Record<string, string>>((acc, key) => {
      return { ...acc, [key]: `${((largurasFinais[key] / total) * 100).toFixed(2)}%` }
    }, {})
  }, [
    largurasFinais.unidade,
    largurasFinais.titular,
    largurasFinais.situacao,
    largurasFinais.procuracao,
    largurasFinais.assinatura,
  ])
  // Toda célula que pode receber nome/cpf quebra em vez de estourar a coluna.
  const ESTILO_CELULA_UNIDADE =
    'style="padding:6px 8px;border:1px solid #D5DCE5;text-align:center;font-weight:bold;word-break:break-word;overflow-wrap:anywhere;"'
  const ESTILO_CELULA_TEXTO =
    'style="padding:6px 8px;border:1px solid #D5DCE5;word-break:break-word;overflow-wrap:anywhere;"'
  const ESTILO_CELULA_CENTRO =
    'style="padding:6px 8px;border:1px solid #D5DCE5;text-align:center;word-break:break-word;overflow-wrap:anywhere;"'

  // Utilitário para extrair apenas a numeração da unidade
  const formatarApenasNumeroUnidade = (identificador?: string): string => {
    if (!identificador) return '—'
    const limpo = identificador.trim()
    // 1. Tentar casar dígitos (ex: "Unidade 12" -> "12", "Apto 304" -> "304", "101A" -> "101")
    const matchNumero = limpo.match(/\d+/)
    if (matchNumero) {
      return matchNumero[0]
    }
    // 2. Se não contiver número explícito, remover palavras como "Unidade", "Apto", "Lote", "Casa"
    const semPrefixo = limpo.replace(
      /^(unidade|unid\.?|apto\.?|apartamento|lote|casa|sala|bloco)\s*/i,
      '',
    )
    return semPrefixo || limpo
  }

  // Descrição completa da unidade para tooltip / title
  const obterDescricaoCompletaUnidade = (u: UnidadeRecord): string => {
    const rotulo = u.tipo_unidade || rotuloUnidade || 'Unidade'
    const partes: string[] = [`${rotulo} ${u.identificador || ''}`.trim()]
    if (u.bloco) partes.push(`Bloco: ${u.bloco}`)
    if (u.andar) partes.push(`Andar: ${u.andar}`)
    if (u.posicao_numero) partes.push(`Posição: ${u.posicao_numero}`)
    return partes.join(' • ')
  }

  // Unidades filtradas pela busca
  const unidadesFiltradas = unidades.filter((u) => {
    if (!busca.trim()) return true
    const termo = busca.toLowerCase()
    const ident = (u.identificador || '').toLowerCase()
    const num = formatarApenasNumeroUnidade(u.identificador).toLowerCase()
    const bloco = (u.bloco || '').toLowerCase()
    // Busca por nome só em nomes resolvíveis — placeholder nunca é termo de busca.
    const resp = (nomesTitulares[u.id] || '').toLowerCase()
    const pres = mapaPresencas.get(u.id)
    const proc = (pres?.nome_procurador || '').toLowerCase()
    return (
      ident.includes(termo) ||
      num.includes(termo) ||
      bloco.includes(termo) ||
      resp.includes(termo) ||
      proc.includes(termo)
    )
  })

  const totalPresentes = presencasAssinadas.length
  const totalPresencial = presencasAssinadas.filter((p) => p.forma === 'presencial').length
  const totalRemoto = presencasAssinadas.filter((p) => p.forma === 'remoto').length
  const totalProcuracao = presencasAssinadas.filter((p) => p.forma === 'procuracao').length

  // Imprimir Documento A4 — protocolo "Impressão limpa (sem assinatura eletrônica)"
  const handleImprimirA4 = () => {
    if (tipoGeracao !== 'impressao_limpa') {
      // Via padrão: impressão nativa da própria tela (comportamento atual)
      window.print()
      return
    }

    // Modo limpo: HTML dedicado sem coluna de carimbo SHA-256 e sem rodapé
    // de assinaturas eletrônicas — linha em branco para assinatura a caneta.
    const esc = (s?: string | null) =>
      (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const linhas = unidadesFiltradas
      .map((u) => {
        const pres = mapaPresencas.get(u.id)
        const forma =
          pres?.forma === 'procuracao'
            ? 'Procuração'
            : pres?.forma === 'remoto'
              ? 'Remoto'
              : pres
                ? 'Presencial'
                : presencasAntigas.find((p) => p.unidade === u.id)?.tipo || 'Ausente'
        // Placeholder "Condômino Apto NNNN" não entra como nome na impressão limpa.
        const nome = pres?.nome || nomesTitulares[u.id] || ''
        const proc = pres?.nome_procurador || ''
        // v0.0.235: nome do responsável e procurador NA MESMA LINHA —
        // "Nome — Procurador: Fulano" inline (sem <div>/<br> entre eles);
        // quebra só por word-break se o conjunto for longo demais, nunca
        // uma quebra proposital antes do procurador.
        const sufixoProcurador =
          pres?.forma === 'procuracao' && proc
            ? `<span style="white-space:nowrap;"> — Procurador: ${esc(proc)}</span>`
            : ''
        return `<tr>
        <td ${ESTILO_CELULA_UNIDADE}>${esc(formatarApenasNumeroUnidade(u.identificador))}${u.bloco ? `<span style="font-size:8px;font-weight:normal;color:#5C6B7A;display:inline;"> ${esc(u.bloco.replace(/^Bloco\s+/i, 'Bl. '))}</span>` : ''}</td>
        <td ${ESTILO_CELULA_TEXTO}>${esc(nome)}${pres?.cpf ? `<span style="font-size:9px;color:#5C6B7A;display:inline;"> — CPF: ${esc(formatarCpf(pres.cpf))}</span>` : ''}${sufixoProcurador}</td>
        <td ${ESTILO_CELULA_CENTRO}>${esc(forma)}</td>
        <td ${ESTILO_CELULA_TEXTO}>${esc(proc)}${pres?.cpf_procurador ? `<span style="font-size:9px;color:#5C6B7A;display:inline;"> — CPF: ${esc(formatarCpf(pres.cpf_procurador))}</span>` : ''}</td>
        <td ${ESTILO_CELULA_CENTRO}>&nbsp;</td>
      </tr>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Lista de Presença — ${esc(deliberacaoAtiva?.titulo || nomeCondominio)}</title>
<style>
  @page { size: A4; margin: 8.5mm 15mm 15mm 15mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #12314F; margin: 0; }
  /* v0.0.233: layout fixo + larguras em % derivadas da tabela da tela —
     localStorage nunca aplicado cru; texto quebra sem estourar a coluna. */
  table { width: 100%; table-layout: fixed; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
 th { background: #F1F4F8; border: 1px solid #D5DCE5; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; word-break: break-word; overflow-wrap: anywhere; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  td { word-break: break-word; overflow-wrap: anywhere; }
</style>
</head>
<body>
  <header style="border-bottom:2px solid #12314F;padding-bottom:12px;margin-bottom:18px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${esc(nomeCondominio)}" style="height:48px;width:48px;object-fit:contain;" />` : ''}
      <div style="flex:1;text-align:center;padding:0 16px;">
        <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;font-weight:bold;color:#1F6B94;display:block;">Plataforma Virtual Koinon</span>
        <h1 style="font-size:18px;font-weight:bold;text-transform:uppercase;margin:2px 0;">${esc(nomeCondominio)}</h1>
        <p style="font-size:12px;color:#5C6B7A;margin:0;">Lista Oficial de Presença e Registro de Comparecimento em Assembleia</p>
      </div>
      <div style="text-align:right;font-size:11px;font-family:monospace;color:#5C6B7A;">Emissão:<br /><strong style="color:#12314F;">${new Date().toLocaleDateString('pt-BR')}</strong></div>
    </div>
    <div style="background:#F1F4F8;border:1px solid #D5DCE5;padding:8px 10px;border-radius:4px;font-size:12px;font-weight:600;margin-top:8px;display:flex;justify-content:space-between;">
      <span>Assembleia: ${esc(deliberacaoAtiva?.titulo || '—')}</span>
      <span>Quórum Presente: ${totalPresentes} de ${unidades.length} unidades (${((totalPresentes / (unidades.length || 1)) * 100).toFixed(1)}%)</span>
    </div>
  </header>

  <table>
    <thead>
      <tr>
        <th style="width:${percentuais.unidade};">Unidade</th>
        <th style="width:${percentuais.titular};">Nome</th>
        <th style="width:${percentuais.situacao};">Situação</th>
        <th style="width:${percentuais.procuracao};">Procurador(a)</th>
        <th style="width:${percentuais.assinatura};">Assinatura</th>
      </tr>
    </thead>
    <tbody>
      ${linhas || '<tr><td colspan="5" style="padding:24px;text-align:center;color:#5C6B7A;font-style:italic;">Nenhuma unidade encontrada para os critérios selecionados.</td></tr>'}
    </tbody>
  </table>

  <footer style="margin-top:32px;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:flex;justify-content:space-around;text-align:center;">
      <div style="width:45%;">
        <div style="border-bottom:1px solid #12314F;height:48px;"></div>
        <p style="margin:6px 0 0;font-size:12px;font-weight:bold;">${esc(deliberacaoAtiva?.mesa_presidente_nome || 'Presidente da Mesa Diretora')}</p>
        <p style="margin:2px 0 0;font-size:10px;color:#5C6B7A;">Presidente da Assembleia${deliberacaoAtiva?.mesa_presidente_cpf ? ` — CPF: ${esc(formatarCpf(deliberacaoAtiva.mesa_presidente_cpf))}` : ''}</p>
      </div>
      <div style="width:45%;">
        <div style="border-bottom:1px solid #12314F;height:48px;"></div>
        <p style="margin:6px 0 0;font-size:12px;font-weight:bold;">${esc(deliberacaoAtiva?.mesa_secretario_nome || 'Secretário(a) da Mesa')}</p>
        <p style="margin:2px 0 0;font-size:10px;color:#5C6B7A;">Secretário(a) dos Trabalhos${deliberacaoAtiva?.mesa_secretario_cpf ? ` — CPF: ${esc(formatarCpf(deliberacaoAtiva.mesa_secretario_cpf))}` : ''}</p>
      </div>
    </div>
    <p style="margin-top:24px;padding-top:10px;border-top:1px solid #D5DCE5;text-align:center;font-size:9px;color:#5C6B7A;">
      Documento emitido pela Plataforma Virtual Koinon — ${esc(nomeCondominio)} em conformidade com a Lei 10.406/2002 e LGPD (Lei 13.709/2018).
    </p>
  </footer>
</body>
</html>`

    imprimirHtmlDocumentoLimpo(html, 'Lista de Presença')
  }

  // Enviar a Lista de Presença para assinatura via ZapSign (mesmo padrão da ata)
  const handleEnviarZapsign = async () => {
    if (!deliberacaoAtiva) {
      toast({ title: 'Selecione uma deliberação', variant: 'destructive' })
      return
    }
    if (presencasAssinadas.length === 0) {
      toast({
        title: 'Nenhuma presença registrada',
        description: 'Registre ao menos uma presença antes de enviar à ZapSign.',
        variant: 'destructive',
      })
      return
    }

    setZapsignEnviando(true)
    try {
      // 1. Garantir registro da lista no banco (persistência de status/links)
      let listaId = listaDbId
      if (!listaId) {
        const criada = await api.criarListaPresenca({
          deliberacao: deliberacaoAtiva.id,
          titulo: deliberacaoAtiva.titulo || 'Lista de Presença',
        })
        listaId = criada.id
        setListaDbId(listaId)
      }

      // 2. Gerar PDF completo em bytes (margens oficiais Koinon)
      const linhas = presencasAssinadas.map((p) => {
        const unid = unidades.find((u) => u.id === p.unidade)
        return {
          identificadorUnidade: unid
            ? formatarIdentificadorUnidade(unid.identificador, unid.tipo_unidade, rotuloUnidade)
            : p.unidade,
          nomeParticipante:
            p.forma === 'procuracao' && p.nome && p.nome_procurador
              ? `${p.nome} — Procurador: ${p.nome_procurador}`
              : p.nome || '—',
          forma: p.forma || 'presencial',
          nomeProcurador: p.nome_procurador || undefined,
          dataHora: p.data_hora_assinatura
            ? new Date(p.data_hora_assinatura).toLocaleString('pt-BR')
            : '',
          modoAssinatura: p.formato_assinatura || undefined,
        }
      })

      const bytes = await gerarPdfListaPresencaComHash({
        nomeCondominio: nomeCondominio || 'Condomínio',
        logoDataUrl: logoUrl || null,
        tituloDeliberacao: deliberacaoAtiva.titulo || 'Lista de Presença',
        dataAssembleia: deliberacaoAtiva.data_assembleia
          ? new Date(deliberacaoAtiva.data_assembleia).toLocaleDateString('pt-BR')
          : null,
        localAssembleia: deliberacaoAtiva.local_assembleia || null,
        linhas,
        presidente: assinaturaPresidente
          ? { nome: assinaturaPresidente.assinante_nome, cpf: assinaturaPresidente.assinante_cpf }
          : null,
        secretario: assinaturaSecretario
          ? { nome: assinaturaSecretario.assinante_nome, cpf: assinaturaSecretario.assinante_cpf }
          : null,
        viaZapsign: true,
      })

      const base64 = bytesToBase64(bytes)

      // 3. Enviar ao hook ZapSign
      const resp = await api.enviarListaPresencaZapsign(listaId, {
        deliberacaoId: deliberacaoAtiva.id,
        pdfBase64: base64,
        nomeDocumento: `Lista de Presença — ${deliberacaoAtiva.titulo || 'Assembleia'}`,
        signatarios: [
          {
            nome: assinaturaPresidente?.assinante_nome || user?.name || 'Presidente da Assembleia',
            email: user?.email || '',
          },
          ...(assinaturaSecretario
            ? [
                {
                  nome: assinaturaSecretario.assinante_nome,
                  email: user?.email || '',
                },
              ]
            : []),
        ],
      })

      setZapsignStatus(resp.zapsign_status || resp.status || '')
      setZapsignDocToken(resp.documento_token)
      setZapsignSignatarios(resp.zapsign_urls || null)
      setZapsignMotivo(resp.message || null)
      setModalZapsignAberto(true)

      await api.registrarEventoAuditoria({
        evento: 'documento_upload',
        fator: `Mesa: Lista de Presença enviada à ZapSign (${resp.zapsign_status}) - token ${resp.documento_token || 'n/d'}`,
        dispositivo: navigator.userAgent,
      })

      const statusFinal = resp.zapsign_status || resp.status || ''
      toast({
        title:
          statusFinal === 'fallback_manual'
            ? 'ZapSign não criou o documento — via manual liberada'
            : 'Lista de Presença enviada à ZapSign',
        description:
          statusFinal === 'fallback_manual'
            ? resp.motivo || resp.message || 'Verifique o motivo exibido no modal.'
            : resp.message || undefined,
        variant: statusFinal === 'fallback_manual' ? 'destructive' : 'default',
      })
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Falha ao enviar a Lista de Presença à ZapSign.')
      setZapsignMotivo(msg)
      setZapsignStatus('erro')
      setModalZapsignAberto(true)
      toast({ title: 'Erro ao enviar à ZapSign', description: msg, variant: 'destructive' })
    } finally {
      setZapsignEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Tela (Oculto em impressão) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-amber-600" /> Lista de Presença & Assinatura
            Eletrônica
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Controle de quórum de instalação, presenças remotas/presenciais, indicadores de
            procuração e assinatura digital.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {deliberacoes.length > 0 && (
            <Select
              value={deliberacaoAtiva?.id || ''}
              onValueChange={(val) => {
                const encontrada = deliberacoes.find((d) => d.id === val)
                if (encontrada) carregarDados(encontrada.id)
              }}
            >
              <SelectTrigger className="w-56 text-xs h-9 bg-white border-slate-300">
                <SelectValue placeholder="Selecione a deliberação" />
              </SelectTrigger>
              <SelectContent>
                {deliberacoes.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.titulo} ({d.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            size="sm"
            onClick={() => navigate('/mesa/presenca/manual')}
            variant="outline"
            className="text-xs h-9 border-[#0066FF] text-[#0066FF] hover:bg-blue-50 font-medium"
            title="Abrir o Manual de Uso da Lista de Presença com layout profissional para impressão em PDF"
          >
            <BookOpen className="h-4 w-4 mr-1.5" /> Manual (PDF)
          </Button>

          {/* Protocolo "Impressão limpa (sem assinatura eletrônica)" */}
          <Select
            value={tipoGeracao}
            onValueChange={(val) => setTipoGeracao(val as TipoGeracaoPdf)}
          >
            <SelectTrigger
              className="w-64 text-xs h-9 bg-white border-slate-300"
              title={
                tipoGeracao === 'impressao_limpa'
                  ? ROTULO_IMPRESSAO_LIMPA
                  : 'Vias padrão (assinatura eletrônica)'
              }
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="padrao" className="text-xs">
                Vias padrão (assinatura eletrônica)
              </SelectItem>
              <SelectItem value="impressao_limpa" className="text-xs">
                {ROTULO_IMPRESSAO_LIMPA}
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={handleImprimirA4}
            variant="outline"
            className="text-xs h-9 border-slate-300"
          >
            <Printer className="h-4 w-4 mr-1.5" /> Imprimir Documento A4
          </Button>

          <Button
            size="sm"
            onClick={handleEnviarZapsign}
            disabled={zapsignEnviando || !deliberacaoAtiva}
            variant="outline"
            className="text-xs h-9 border-[#0066FF] text-[#0066FF] hover:bg-blue-50 font-medium"
            title="Enviar a Lista de Presença para assinatura eletrônica via ZapSign"
          >
            {zapsignEnviando ? (
              <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <PenLine className="h-4 w-4 mr-1.5" />
            )}
            Enviar para assinatura (ZapSign)
            {zapsignStatus === 'enviado' && (
              <Badge className="ml-1.5 bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                Enviado
              </Badge>
            )}
            {(zapsignStatus === 'assinado' || zapsignStatus === 'concluido') && (
              <Badge className="ml-1.5 bg-emerald-600 text-white text-[10px]">Assinado</Badge>
            )}
          </Button>

          <Button
            size="sm"
            onClick={() => setModalPresencaAberto(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9"
            disabled={!deliberacaoAtiva}
          >
            <UserCheck className="h-4 w-4 mr-1.5" /> Registrar Presença / Assinatura
          </Button>
        </div>
      </div>

      {/* Cards de Métricas (Oculto em impressão) */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200">
          <span className="text-xs text-slate-500 font-semibold block">Total de Presentes</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{totalPresentes}</span>
            <span className="text-xs text-slate-500">/ {unidades.length} unidades</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-xs text-slate-500 font-semibold block">Presencial</span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block">{totalPresencial}</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-xs text-slate-500 font-semibold block">Remoto / Online</span>
          <span className="text-2xl font-bold text-cyan-700 mt-1 block">{totalRemoto}</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-xs text-slate-500 font-semibold block">Por Procuração</span>
          <span className="text-2xl font-bold text-amber-700 mt-1 block">{totalProcuracao}</span>
        </Card>
      </div>

      {/* Barra de Busca e Ações de Tabela (Oculto em impressão) */}
      <div className="print:hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#5C6B7A]" />
          <Input
            type="text"
            placeholder="Buscar por unidade, condômino ou procurador..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 text-xs h-9 bg-white border-[#D5DCE5] text-[#12314F]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={restaurarLargurasPadrao}
            className="text-[11px] h-8 px-2.5 border-[#D5DCE5] text-[#5C6B7A] hover:text-[#12314F] hover:bg-[#F1F4F8] rounded-[8px]"
            title="Restaurar a largura padrão de todas as colunas"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1 text-[#1F6B94]" /> Restaurar larguras
          </Button>

          <div className="p-2 rounded-[8px] bg-[#F1F4F8] border border-[#D5DCE5] text-[11px] text-[#5C6B7A]">
            <strong className="text-[#12314F]">Dica:</strong> arraste a divisória dos cabeçalhos
            para ajustar as colunas (ou duplo clique para resetar).
          </div>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL A4 IMPRIMÍVEL (Mesmo padrão do Boletim de Urna) */}
      <article className="border border-[#D5DCE5] shadow-[0_4px_24px_rgba(18,49,79,0.06)] bg-white rounded-[14px] p-6 sm:p-8 max-w-[960px] mx-auto print:border-none print:shadow-none print:p-0 print:max-w-none text-[#12314F] font-serif leading-normal">
        {/* Cabeçalho Institucional do Documento */}
        <header className="border-b-2 border-[#12314F] pb-4 mb-6 text-center font-sans">
          <div className="flex items-center justify-between mb-2">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={nomeCondominio}
                className="h-12 w-12 object-contain print:h-10 print:w-10"
              />
            )}
            <div className="flex-1 text-center px-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#1F6B94] block">
                Plataforma Virtual Koinon
              </span>
              <h1 className="text-lg font-bold text-[#12314F] uppercase">{nomeCondominio}</h1>
              <p className="text-xs text-[#5C6B7A]">
                Lista Oficial de Presença e Registro de Comparecimento em Assembleia
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-[#5C6B7A]">
              <span>Emissão:</span>
              <br />
              <strong className="text-[#12314F]">{new Date().toLocaleDateString('pt-BR')}</strong>
            </div>
          </div>

          <div className="bg-[#F1F4F8] border border-[#D5DCE5] p-2.5 rounded text-xs font-semibold text-[#12314F] flex items-center justify-between mt-2 font-mono">
            <span>Assembleia: {deliberacaoAtiva?.titulo || '—'}</span>
            <span>
              Quórum Presente: {totalPresentes} de {unidades.length} unidades (
              {((totalPresentes / (unidades.length || 1)) * 100).toFixed(1)}%)
            </span>
          </div>
        </header>

        {/* Tabela de Assinaturas e Presenças com Colunas Redimensionáveis */}
        <section className="font-sans text-xs">
          <div className="overflow-x-auto w-full rounded-md border border-[#D5DCE5]">
            <table
              className="w-full text-left border-collapse"
              style={{
                tableLayout: 'fixed',
                minWidth:
                  largurasFinais.unidade +
                  largurasFinais.titular +
                  largurasFinais.situacao +
                  largurasFinais.procuracao +
                  largurasFinais.assinatura,
              }}
            >
              <colgroup>
                <col style={{ width: `${largurasFinais.unidade}px` }} />
                <col style={{ width: `${largurasFinais.titular}px` }} />
                <col style={{ width: `${largurasFinais.situacao}px` }} />
                <col style={{ width: `${largurasFinais.procuracao}px` }} />
                <col style={{ width: `${largurasFinais.assinatura}px` }} />
              </colgroup>
              <thead>
                <tr className="bg-[#F1F4F8] text-[#12314F] font-semibold text-[11px] uppercase tracking-wider select-none border-b border-[#D5DCE5]">
                  {/* Coluna 1: Unidade (apenas numeração) */}
                  <th
                    className="p-2 border-r border-[#D5DCE5] text-center relative group"
                    title="Unidade (exibindo apenas numeração; passe o mouse para detalhes da torre/bloco)"
                  >
                    <span className="truncate block font-semibold text-[#12314F]">Unidade</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 print:hidden flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('unidade', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('unidade', e)}
                      onDoubleClick={() => salvarLarguraColuna('unidade', LARGURAS_PADRAO.unidade)}
                    >
                      <span className="w-0.5 h-3.5 bg-[#5C6B7A]/30 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>

                  {/* Coluna 2: Nome Completo abreviado para Nome */}
                  <th
                    className="p-2 border-r border-[#D5DCE5] relative group"
                    title="Nome Completo do Titular ou Representante"
                  >
                    <span className="truncate block font-semibold text-[#5C6B7A]">Nome</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 print:hidden flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('titular', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('titular', e)}
                      onDoubleClick={() => salvarLarguraColuna('titular', LARGURAS_PADRAO.titular)}
                    >
                      <span className="w-0.5 h-3.5 bg-[#5C6B7A]/30 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>

                  {/* Coluna 3: Situação de Presença abreviada para Situação */}
                  <th
                    className="p-2 border-r border-[#D5DCE5] text-center relative group"
                    title="Situação de Presença (Presencial, Remoto, Por Procuração ou Ausente)"
                  >
                    <span className="truncate block font-semibold text-[#5C6B7A]">Situação</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 print:hidden flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('situacao', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('situacao', e)}
                      onDoubleClick={() =>
                        salvarLarguraColuna('situacao', LARGURAS_PADRAO.situacao)
                      }
                    >
                      <span className="w-0.5 h-3.5 bg-[#5C6B7A]/30 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>

                  {/* Coluna 4: Poderes de Procuração / Representante */}
                  <th
                    className="p-2 border-r border-[#D5DCE5] relative group"
                    title="Poderes de Procuração / Representante Legal com CPF e documento anexo"
                  >
                    <span className="truncate block font-semibold text-[#5C6B7A]">
                      Procurador(a)
                    </span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 print:hidden flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('procuracao', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('procuracao', e)}
                      onDoubleClick={() =>
                        salvarLarguraColuna('procuracao', LARGURAS_PADRAO.procuracao)
                      }
                    >
                      <span className="w-0.5 h-3.5 bg-[#5C6B7A]/30 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>

                  {/* Coluna 5: Assinatura / Carimbo SHA-256 abreviado para Assinatura */}
                  <th
                    className="p-2 text-center relative group"
                    title="Assinatura Eletrônica, Credenciado às (Data/Hora) e Carimbo Hash SHA-256"
                  >
                    <span className="truncate block font-semibold text-[#5C6B7A]">Assinatura</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 print:hidden flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('assinatura', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('assinatura', e)}
                      onDoubleClick={() =>
                        salvarLarguraColuna('assinatura', LARGURAS_PADRAO.assinatura)
                      }
                    >
                      <span className="w-0.5 h-3.5 bg-[#5C6B7A]/30 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5DCE5]">
                {unidadesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#5C6B7A] italic bg-white">
                      Nenhuma unidade encontrada para os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  unidadesFiltradas.map((u) => {
                    const pres = mapaPresencas.get(u.id)
                    const presLegada = presencasAntigas.find((p) => p.unidade === u.id)
                    const estaPresente = !!pres || !!presLegada
                    const numeroUnidade = formatarApenasNumeroUnidade(u.identificador)
                    const descricaoUnidade = obterDescricaoCompletaUnidade(u)

                    return (
                      <tr
                        key={u.id}
                        className={
                          estaPresente
                            ? 'bg-white hover:bg-[#F1F4F8]/50'
                            : 'bg-[#F1F4F8]/40 text-[#5C6B7A]'
                        }
                      >
                        {/* 1. Unidade: APENAS a numeração, com bloco em tooltip ou badge discreto */}
                        <td
                          className="p-2 border-r border-[#D5DCE5] font-bold text-center text-[#12314F]"
                          title={descricaoUnidade}
                        >
                          <span className="font-mono text-sm block tracking-tight">
                            {numeroUnidade}
                          </span>
                          {u.bloco && (
                            <span
                              className="inline-block text-[9px] font-normal text-[#5C6B7A] bg-[#F1F4F8] border border-[#D5DCE5] px-1 rounded mt-0.5 truncate max-w-full"
                              title={`Bloco: ${u.bloco}`}
                            >
                              {u.bloco.replace(/^Bloco\s+/i, 'Bl. ')}
                            </span>
                          )}
                        </td>

                        {/* 2. Nome do Titular / Representante — v0.0.235: nome e
                            procurador NA MESMA LINHA (inline, sem bloco próprio) */}
                        <td className="p-2 border-r border-[#D5DCE5] overflow-hidden">
                          {pres ? (
                            <div className="min-w-0">
                              <span className="text-[#12314F]" title={pres.nome}>
                                <strong className="font-semibold">{pres.nome}</strong>
                                {pres.cpf && (
                                  <span className="text-[10px] text-[#5C6B7A] font-mono whitespace-nowrap">
                                    {' '}
                                    — CPF: {formatarCpf(pres.cpf)}
                                  </span>
                                )}
                                {pres.forma === 'procuracao' && pres.nome_procurador && (
                                  <span
                                    className="whitespace-nowrap"
                                    title={`Procurador: ${pres.nome_procurador}`}
                                  >
                                    {' '}
                                    — Procurador: {pres.nome_procurador}
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : nomesTitulares[u.id] ? (
                            <div className="truncate">
                              <span
                                className="text-[#12314F] block truncate"
                                title={nomesTitulares[u.id]}
                              >
                                {nomesTitulares[u.id]}
                              </span>
                              <span className="text-[10px] text-[#5C6B7A] italic block">
                                Cadastrado
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#5C6B7A]/60 italic text-[11px]">
                              Não registrado
                            </span>
                          )}
                        </td>

                        {/* 3. Situação de Presença */}
                        <td className="p-2 border-r border-[#D5DCE5] text-center">
                          {pres ? (
                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase px-1.5 py-0.5 font-bold tracking-wider rounded-[6px] ${
                                pres.forma === 'procuracao'
                                  ? 'border-[#1F6B94]/30 text-[#12314F] bg-[#1F6B94]/10'
                                  : pres.forma === 'remoto'
                                    ? 'border-[#1F6B94]/30 text-[#1F6B94] bg-[#1F6B94]/10'
                                    : 'border-[#4E8B7E]/40 text-[#12314F] bg-[#4E8B7E]/15'
                              }`}
                              title={`Presença via ${pres.forma}`}
                            >
                              {pres.forma === 'procuracao'
                                ? 'Procuração'
                                : pres.forma === 'remoto'
                                  ? 'Remoto'
                                  : 'Presencial'}
                            </Badge>
                          ) : presLegada ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] uppercase px-1.5 py-0.5 rounded-[6px] border-[#D5DCE5] bg-[#F1F4F8] text-[#12314F]"
                              title={`Presença via ${presLegada.tipo}`}
                            >
                              {presLegada.tipo}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-[#5C6B7A]/70 font-medium">
                              Ausente
                            </span>
                          )}
                        </td>

                        {/* 4. Procurador / Representante — v0.0.235: na MESMA LINHA
                            do nome (inline), não mais empilhado em bloco próprio */}
                        <td className="p-2 border-r border-[#D5DCE5] overflow-hidden">
                          {pres?.forma === 'procuracao' ? (
                            <div className="min-w-0">
                              <span
                                className="whitespace-nowrap"
                                title={`Procurador: ${pres.nome_procurador}`}
                              >
                                <span className="font-semibold text-[#12314F]">
                                  {pres.nome_procurador}
                                </span>
                                {pres.cpf_procurador && (
                                  <span className="text-[10px] text-[#5C6B7A] font-mono">
                                    {' '}
                                    — CPF: {formatarCpf(pres.cpf_procurador)}
                                  </span>
                                )}
                              </span>
                              {pres.procuracao_arquivo && (
                                <a
                                  href={pb.files.getURL(pres, pres.procuracao_arquivo)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-[#1F6B94] hover:underline print:hidden font-medium"
                                  title="Abrir arquivo da procuração anexado"
                                >
                                  <ExternalLink className="h-3 w-3" /> Anexo
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#5C6B7A]/50 text-[11px]">—</span>
                          )}
                        </td>

                        {/* 5. Assinatura Eletrônica / Carimbo */}
                        <td className="p-2 text-center overflow-hidden">
                          {pres?.assinatura_hash ? (
                            <div className="flex flex-col items-center">
                              {/* Renderização gráfica se houver (desenho ou cursiva) */}
                              {pres.formato_assinatura === 'desenho' && pres.assinatura_visual ? (
                                <img
                                  src={pres.assinatura_visual}
                                  alt="Assinatura"
                                  className="max-h-7 max-w-[130px] object-contain mb-0.5"
                                />
                              ) : pres.formato_assinatura === 'texto' && pres.assinatura_texto ? (
                                <span
                                  style={{ fontFamily: '"Dancing Script", "Great Vibes", cursive' }}
                                  className="text-sm text-[#12314F] font-bold leading-none mb-0.5 block truncate max-w-[140px]"
                                  title={pres.assinatura_texto}
                                >
                                  {pres.assinatura_texto}
                                </span>
                              ) : null}

                              <div className="font-mono text-[9px] leading-tight text-[#12314F]">
                                <span className="font-bold text-[#4E8B7E] block">✓ ASSINADO</span>
                                <span
                                  className="break-all text-[8px] text-[#5C6B7A] block"
                                  title={`Carimbo SHA-256 completo: ${pres.assinatura_hash}`}
                                >
                                  {pres.assinatura_hash.substring(0, 14)}...
                                </span>
                                {pres.data_hora_assinatura && (
                                  <span
                                    className="text-[8px] text-[#5C6B7A] block"
                                    title={`Credenciado às ${new Date(pres.data_hora_assinatura).toLocaleString('pt-BR')}`}
                                  >
                                    Credenciado às{' '}
                                    {new Date(pres.data_hora_assinatura).toLocaleTimeString(
                                      'pt-BR',
                                      { hour: '2-digit', minute: '2-digit' },
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="border-b border-dashed border-[#D5DCE5] h-6" />
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Rodapé Institucional com Assinatura da Mesa e Resalva LGPD */}
        {/* v0.0.196: linha separadora entre o fim da tabela e as assinaturas removida
            (pedido do usuário) — sem border-t; permanecem as linhas de assinatura em si */}
        <footer className="mt-8 font-sans break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center pt-6 pb-2">
            {/* Presidente */}
            <div className="flex flex-col items-center">
              <BlocoAssinaturaCompacto
                nome={deliberacaoAtiva?.mesa_presidente_nome || 'Presidente da Mesa Diretora'}
                cpf={deliberacaoAtiva?.mesa_presidente_cpf}
                cargo="Presidente da Assembleia"
                formato={assinaturaPresidente?.formato_assinatura || 'em_branco'}
                assinaturaVisual={assinaturaPresidente?.assinatura_visual}
                assinaturaTexto={assinaturaPresidente?.assinatura_texto}
                larguraLinha="w-60"
              />
              <div className="mt-1 print:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalAssinaturaMesa('mesa_presidente')}
                  className="h-6 text-[10px] px-2 text-slate-700 border-slate-300 gap-1"
                >
                  <ShieldCheck className="h-3 w-3 text-cyan-700" />
                  {assinaturaPresidente ? 'Reassinar como Presidente' : 'Assinar como Presidente'}
                </Button>
              </div>
            </div>

            {/* Secretário */}
            <div className="flex flex-col items-center">
              <BlocoAssinaturaCompacto
                nome={deliberacaoAtiva?.mesa_secretario_nome || 'Secretário(a) da Mesa'}
                cpf={deliberacaoAtiva?.mesa_secretario_cpf}
                cargo="Secretário(a) dos Trabalhos"
                formato={assinaturaSecretario?.formato_assinatura || 'em_branco'}
                assinaturaVisual={assinaturaSecretario?.assinatura_visual}
                assinaturaTexto={assinaturaSecretario?.assinatura_texto}
                larguraLinha="w-60"
              />
              <div className="mt-1 print:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalAssinaturaMesa('mesa_secretario')}
                  className="h-6 text-[10px] px-2 text-slate-700 border-slate-300 gap-1"
                >
                  <ShieldCheck className="h-3 w-3 text-cyan-700" />
                  {assinaturaSecretario ? 'Reassinar como Secretário' : 'Assinar como Secretário'}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-1">
            <p>
              Documento emitido pela Plataforma Virtual Koinon — {nomeCondominio} em conformidade
              com a Lei 10.406/2002 e LGPD (Lei 13.709/2018).
            </p>
            <p className="text-slate-400 text-[9px]">
              Assinaturas eletrônicas com integridade criptográfica SHA-256 vinculadas aos registros
              de auditoria.
            </p>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 rounded-full border border-slate-200 bg-[#F3F7FC] text-[9px] text-[#5A6B82] tracking-wider">
                <strong className="text-[#002B5E] font-bold">KOINON</strong> • uma solução{' '}
                <strong className="text-[#0066FF] font-bold">A3ONE</strong>
              </span>
            </div>
          </div>
        </footer>
      </article>

      {/* Modal Reutilizável para Assinatura da Mesa Diretora */}
      {modalAssinaturaMesa && (
        <ModalAssinaturaEletronica
          aberto={!!modalAssinaturaMesa}
          onOpenChange={(ab) => !ab && setModalAssinaturaMesa(null)}
          tituloDocumento="Lista Oficial de Presença"
          subtitulo={`Assinatura da Mesa como ${
            modalAssinaturaMesa === 'mesa_presidente' ? 'Presidente' : 'Secretário(a)'
          } dos trabalhos`}
          nomeInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? deliberacaoAtiva?.mesa_presidente_nome || ''
              : deliberacaoAtiva?.mesa_secretario_nome || ''
          }
          cpfInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? deliberacaoAtiva?.mesa_presidente_cpf || ''
              : deliberacaoAtiva?.mesa_secretario_cpf || ''
          }
          cargoInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? 'Presidente da Mesa Diretora'
              : 'Secretário(a) da Mesa Diretora'
          }
          formatoInicial={
            (modalAssinaturaMesa === 'mesa_presidente'
              ? assinaturaPresidente?.formato_assinatura
              : assinaturaSecretario?.formato_assinatura) || 'desenho'
          }
          assinaturaVisualInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? assinaturaPresidente?.assinatura_visual
              : assinaturaSecretario?.assinatura_visual
          }
          assinaturaTextoInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? assinaturaPresidente?.assinatura_texto
              : assinaturaSecretario?.assinatura_texto
          }
          salvando={salvandoMesa}
          onConfirmar={handleConfirmarAssinaturaMesa}
        />
      )}

      {/* Modal ZapSign: links individuais por signatário (mesmo padrão do edital) */}
      <ModalZapsignLinks
        aberto={modalZapsignAberto}
        onOpenChange={setModalZapsignAberto}
        tituloDocumento={
          deliberacaoAtiva?.titulo
            ? `Lista de Presença — ${deliberacaoAtiva.titulo}`
            : 'Lista de Presença'
        }
        signatarios={zapsignSignatarios}
        status={zapsignStatus}
        motivo={zapsignMotivo}
      />

      {/* Modal Registrar Presença / Assinatura */}
      <Dialog open={modalPresencaAberto} onOpenChange={setModalPresencaAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Registrar Presença e Assinatura Eletrônica
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registre a presença do condômino ou procurador com geração instantânea de carimbo
              SHA-256.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarPresenca} className="space-y-3 text-xs">
            {/* Seletor de Unidade */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Selecione a Unidade</Label>
              <Select value={unidadeSelecionadaId} onValueChange={handleSelecionarUnidadeModal}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Escolha a unidade..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {unidades.map((u) => {
                    const jaRegistrado = mapaPresencas.has(u.id)
                    const idFormatado = formatarIdentificadorUnidade(
                      u.identificador,
                      u.tipo_unidade,
                      rotuloUnidade,
                    )
                    const blocoRotulo = temBlocoReal(u.bloco, u.tipo_unidade)
                      ? normalizarBloco(u.bloco, u.tipo_unidade)
                      : '—'
                    return (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {idFormatado} ({blocoRotulo}){jaRegistrado ? ' — [JÁ PRESENTE]' : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Modalidade de Participação */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Modalidade de Presença</Label>
              <Select value={formaPresenca} onValueChange={(val) => setFormaPresenca(val as any)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial (No local da assembleia)</SelectItem>
                  <SelectItem value="remoto">Remoto (Plataforma Virtual Koinon)</SelectItem>
                  <SelectItem value="procuracao">Por Procuração / Representante Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Titular da Unidade */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700">Nome do Titular</Label>
                <Input
                  type="text"
                  placeholder="Nome do condômino"
                  value={participanteNome}
                  onChange={(e) => setParticipanteNome(e.target.value)}
                  required
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700">CPF do Titular</Label>
                <Input
                  type="text"
                  placeholder="000.000.000-00"
                  value={participanteCpf}
                  onChange={(e) => {
                    setParticipanteCpf(formatarCpf(e.target.value))
                    setCpfErro(null)
                  }}
                  className={`text-xs h-9 ${cpfErro ? 'border-red-500' : ''}`}
                />
                {cpfErro && <p className="text-[10px] text-red-600">{cpfErro}</p>}
              </div>
            </div>

            {/* Campos Específicos se for por Procuração */}
            {formaPresenca === 'procuracao' && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Dados do Procurador / Representante</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700">Nome do Procurador</Label>
                    <Input
                      type="text"
                      placeholder="Nome completo do procurador"
                      value={nomeProcurador}
                      onChange={(e) => setNomeProcurador(e.target.value)}
                      required
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700">CPF do Procurador</Label>
                    <Input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpfProcurador}
                      onChange={(e) => {
                        setCpfProcurador(formatarCpf(e.target.value))
                        setProcuradorCpfErro(null)
                      }}
                      className={`text-xs h-8 bg-white ${procuradorCpfErro ? 'border-red-500' : ''}`}
                    />
                    {procuradorCpfErro && (
                      <p className="text-[10px] text-red-600">{procuradorCpfErro}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">
                    Cópia da Procuração Digitalizada (PDF ou imagem)
                  </Label>
                  <Input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setArquivoProcuracao(e.target.files[0])
                      }
                    }}
                    className="text-xs h-8 bg-white"
                  />
                  <span className="text-[10px] text-slate-500">
                    Opcional no momento da assinatura, mas recomendado para conferência cartorária.
                  </span>
                </div>
              </div>
            )}

            {/* Componente Reutilizável de Escolha da Assinatura: Tela, Nome ou Deixar em Branco */}
            <div className="pt-2">
              <SeletorAssinatura
                valorInicial={capturaPresenca}
                nomeSugerido={
                  formaPresenca === 'procuracao'
                    ? nomeProcurador || participanteNome
                    : participanteNome
                }
                onChange={(dados) => setCapturaPresenca(dados)}
                disabled={salvando}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalPresencaAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                disabled={salvando}
              >
                {salvando ? 'Gravando Assinatura...' : 'Confirmar Presença e Assinar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ListaPresencaPage

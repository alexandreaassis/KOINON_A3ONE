import React, { useState, useEffect } from 'react'
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
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
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

export const ListaPresencaPage: React.FC = () => {
  const { nomeCondominio, logoUrl, rotuloUnidade } = useCondoConfig()
  const { user } = useAuth()

  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [presencasAssinadas, setPresencasAssinadas] = useState<PresencaAssinaturaRecord[]>([])
  const [presencasAntigas, setPresencasAntigas] = useState<PresencaRecord[]>([])
  const [credenciamentos, setCredenciamentos] = useState<CredenciamentoRecord[]>([])
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
      const u = unidades.find((item) => item.id === uId)
      if (u && u.responsavel_nome) {
        setParticipanteNome(u.responsavel_nome)
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

      const formData = new FormData()
      formData.append('deliberacao', deliberacaoAtiva.id)
      formData.append('unidade', unidadeSelecionadaId)
      formData.append('nome', participanteNome.trim())
      formData.append('cpf', rawCpf)
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
  const STORAGE_KEY_LARGURAS = 'indaba_lista_presenca_colunas_v1'
  const LARGURAS_PADRAO: Record<string, number> = {
    unidade: 80, // min 64
    titular: 240, // min 140
    situacao: 110, // min 90
    procuracao: 220, // min 130
    assinatura: 210, // min 150
  }
  const LARGURAS_MINIMAS: Record<string, number> = {
    unidade: 64,
    titular: 130,
    situacao: 80,
    procuracao: 120,
    assinatura: 140,
  }

  const [largurasColunas, setLargurasColunas] = useState<Record<string, number>>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_LARGURAS)
      if (salvo) {
        const parsed = JSON.parse(salvo)
        return { ...LARGURAS_PADRAO, ...parsed }
      }
    } catch {
      /* ignore */
    }
    return LARGURAS_PADRAO
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
    const resp = (u.responsavel_nome || '').toLowerCase()
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
            onClick={() => window.print()}
            variant="outline"
            className="text-xs h-9 border-slate-300"
          >
            <Printer className="h-4 w-4 mr-1.5" /> Imprimir Documento A4
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
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#6B6259]" />
          <Input
            type="text"
            placeholder="Buscar por unidade, condômino ou procurador..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 text-xs h-9 bg-[#FFFDFA] border-[#E8E1D6]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={restaurarLargurasPadrao}
            className="text-[11px] h-8 px-2.5 border-[#E8E1D6] text-[#6B6259] hover:text-[#1E1B18] hover:bg-[#F4EFE7] rounded-[8px]"
            title="Restaurar a largura padrão de todas as colunas"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1 text-[#E39A2B]" /> Restaurar larguras
          </Button>

          <div className="p-2 rounded-[8px] bg-[#F4EFE7] border border-[#E8E1D6] text-[11px] text-[#6B6259]">
            <strong className="text-[#1E1B18]">Dica:</strong> arraste a divisória dos cabeçalhos
            para ajustar as colunas (ou duplo clique para resetar).
          </div>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL A4 IMPRIMÍVEL (Mesmo padrão do Boletim de Urna) */}
      <article className="border border-[#E8E1D6] shadow-sm bg-[#FFFDFA] rounded-lg p-6 sm:p-8 max-w-[960px] mx-auto print:border-none print:shadow-none print:p-0 print:max-w-none text-[#1E1B18] font-serif leading-normal">
        {/* Cabeçalho Institucional do Documento */}
        <header className="border-b-2 border-[#1E1B18] pb-4 mb-6 text-center font-sans">
          <div className="flex items-center justify-between mb-2">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={nomeCondominio}
                className="h-12 w-12 object-contain print:h-10 print:w-10"
              />
            )}
            <div className="flex-1 text-center px-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#E39A2B] block">
                Plataforma Oficial de Governança Condominial
              </span>
              <h1 className="text-lg font-bold text-[#1E1B18] uppercase">{nomeCondominio}</h1>
              <p className="text-xs text-[#6B6259]">
                Lista Oficial de Presença e Registro de Comparecimento em Assembleia
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-[#6B6259]">
              <span>Emissão:</span>
              <br />
              <strong className="text-[#1E1B18]">{new Date().toLocaleDateString('pt-BR')}</strong>
            </div>
          </div>

          <div className="bg-[#F4EFE7] border border-[#E8E1D6] p-2.5 rounded text-xs font-semibold text-[#1E1B18] flex items-center justify-between mt-2 font-mono">
            <span>Assembleia: {deliberacaoAtiva?.titulo || '—'}</span>
            <span>
              Quórum Presente: {totalPresentes} de {unidades.length} unidades (
              {((totalPresentes / (unidades.length || 1)) * 100).toFixed(1)}%)
            </span>
          </div>
        </header>

        {/* Tabela de Assinaturas e Presenças com Colunas Redimensionáveis */}
        <section className="font-sans text-xs">
          <div className="overflow-x-auto w-full rounded-md border border-[#E8E1D6]">
            <table
              className="w-full text-left border-collapse"
              style={{
                tableLayout: 'fixed',
                minWidth:
                  largurasColunas.unidade +
                  largurasColunas.titular +
                  largurasColunas.situacao +
                  largurasColunas.procuracao +
                  largurasColunas.assinatura,
              }}
            >
              <colgroup>
                <col style={{ width: `${largurasColunas.unidade}px` }} />
                <col style={{ width: `${largurasColunas.titular}px` }} />
                <col style={{ width: `${largurasColunas.situacao}px` }} />
                <col style={{ width: `${largurasColunas.procuracao}px` }} />
                <col style={{ width: `${largurasColunas.assinatura}px` }} />
              </colgroup>
              <thead>
                <tr className="bg-[#F4EFE7] text-[#6B6259] font-semibold text-[11px] uppercase tracking-wider select-none border-b border-[#E8E1D6]">
                  {/* Coluna 1: Unidade (apenas numeração) */}
                  <th
                    className="p-2 border-r border-[#E8E1D6] text-center relative group"
                    title="Unidade (exibindo apenas numeração; passe o mouse para detalhes da torre/bloco)"
                  >
                    <span className="truncate block font-semibold text-[#6B6259]">Unidade</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#E39A2B]/40 active:bg-[#E39A2B] z-10 print:hidden flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('unidade', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('unidade', e)}
                      onDoubleClick={() => salvarLarguraColuna('unidade', LARGURAS_PADRAO.unidade)}
                    >
                      <span className="w-0.5 h-3.5 bg-[#6B6259]/30 rounded-full group-hover:bg-[#E39A2B]" />
                    </span>
                  </th>

                  {/* Coluna 2: Nome Completo abreviado para Nome */}
                  <th
                    className="p-2 border-r border-[#E8E1D6] relative group"
                    title="Nome Completo do Titular ou Representante"
                  >
                    <span className="truncate block font-semibold text-[#6B6259]">Nome</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#E39A2B]/40 active:bg-[#E39A2B] z-10 print:hidden flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('titular', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('titular', e)}
                      onDoubleClick={() => salvarLarguraColuna('titular', LARGURAS_PADRAO.titular)}
                    >
                      <span className="w-0.5 h-3.5 bg-[#6B6259]/30 rounded-full group-hover:bg-[#E39A2B]" />
                    </span>
                  </th>

                  {/* Coluna 3: Situação de Presença abreviada para Situação */}
                  <th
                    className="p-2 border-r border-[#E8E1D6] text-center relative group"
                    title="Situação de Presença (Presencial, Remoto, Por Procuração ou Ausente)"
                  >
                    <span className="truncate block font-semibold text-[#6B6259]">Situação</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#E39A2B]/40 active:bg-[#E39A2B] z-10 print:hidden flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('situacao', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('situacao', e)}
                      onDoubleClick={() =>
                        salvarLarguraColuna('situacao', LARGURAS_PADRAO.situacao)
                      }
                    >
                      <span className="w-0.5 h-3.5 bg-[#6B6259]/30 rounded-full group-hover:bg-[#E39A2B]" />
                    </span>
                  </th>

                  {/* Coluna 4: Poderes de Procuração / Representante */}
                  <th
                    className="p-2 border-r border-[#E8E1D6] relative group"
                    title="Poderes de Procuração / Representante Legal com CPF e documento anexo"
                  >
                    <span className="truncate block font-semibold text-[#6B6259]">
                      PROCURADOR(A)
                    </span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#E39A2B]/40 active:bg-[#E39A2B] z-10 print:hidden flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('procuracao', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('procuracao', e)}
                      onDoubleClick={() =>
                        salvarLarguraColuna('procuracao', LARGURAS_PADRAO.procuracao)
                      }
                    >
                      <span className="w-0.5 h-3.5 bg-[#6B6259]/30 rounded-full group-hover:bg-[#E39A2B]" />
                    </span>
                  </th>

                  {/* Coluna 5: Assinatura / Carimbo SHA-256 abreviado para Assinatura */}
                  <th
                    className="p-2 text-center relative group"
                    title="Assinatura Eletrônica, Credenciado às (Data/Hora) e Carimbo Hash SHA-256"
                  >
                    <span className="truncate block font-semibold text-[#6B6259]">Assinatura</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#E39A2B]/40 active:bg-[#E39A2B] z-10 print:hidden flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('assinatura', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('assinatura', e)}
                      onDoubleClick={() =>
                        salvarLarguraColuna('assinatura', LARGURAS_PADRAO.assinatura)
                      }
                    >
                      <span className="w-0.5 h-3.5 bg-[#6B6259]/30 rounded-full group-hover:bg-[#E39A2B]" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E1D6]">
                {unidadesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#6B6259] italic bg-[#FFFDFA]">
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
                            ? 'bg-[#FFFDFA] hover:bg-[#F4EFE7]/50'
                            : 'bg-[#F4EFE7]/30 text-[#6B6259]/80'
                        }
                      >
                        {/* 1. Unidade: APENAS a numeração, com bloco em tooltip ou badge discreto */}
                        <td
                          className="p-2 border-r border-[#E8E1D6] font-bold text-center text-[#1E1B18]"
                          title={descricaoUnidade}
                        >
                          <span className="font-mono text-sm block tracking-tight">
                            {numeroUnidade}
                          </span>
                          {u.bloco && (
                            <span
                              className="inline-block text-[9px] font-normal text-[#6B6259] bg-[#F4EFE7] border border-[#E8E1D6] px-1 rounded mt-0.5 truncate max-w-full"
                              title={`Bloco: ${u.bloco}`}
                            >
                              {u.bloco.replace(/^Bloco\s+/i, 'Bl. ')}
                            </span>
                          )}
                        </td>

                        {/* 2. Nome do Titular / Representante */}
                        <td className="p-2 border-r border-[#E8E1D6] overflow-hidden">
                          {pres ? (
                            <div className="truncate">
                              <strong className="text-[#1E1B18] block truncate" title={pres.nome}>
                                {pres.nome}
                              </strong>
                              {pres.cpf && (
                                <span className="text-[10px] text-[#6B6259] font-mono block">
                                  CPF: {formatarCpf(pres.cpf)}
                                </span>
                              )}
                            </div>
                          ) : u.responsavel_nome ? (
                            <div className="truncate">
                              <span
                                className="text-[#1E1B18] block truncate"
                                title={u.responsavel_nome}
                              >
                                {u.responsavel_nome}
                              </span>
                              <span className="text-[10px] text-[#6B6259] italic block">
                                Cadastrado
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#6B6259]/60 italic text-[11px]">
                              Não registrado
                            </span>
                          )}
                        </td>

                        {/* 3. Situação de Presença */}
                        <td className="p-2 border-r border-[#E8E1D6] text-center">
                          {pres ? (
                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase px-1.5 py-0.5 font-bold tracking-wider rounded-[6px] ${
                                pres.forma === 'procuracao'
                                  ? 'border-[#E39A2B]/40 text-[#1E1B18] bg-[#E39A2B]/15'
                                  : pres.forma === 'remoto'
                                    ? 'border-cyan-500/30 text-cyan-800 bg-cyan-50'
                                    : 'border-emerald-600/30 text-emerald-800 bg-emerald-50'
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
                              className="text-[9px] uppercase px-1.5 py-0.5 rounded-[6px] border-[#E8E1D6] bg-[#F4EFE7] text-[#1E1B18]"
                              title={`Presença via ${presLegada.tipo}`}
                            >
                              {presLegada.tipo}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-[#6B6259]/70 font-medium">
                              Ausente
                            </span>
                          )}
                        </td>

                        {/* 4. Procurador / Representante (Proc.) */}
                        <td className="p-2 border-r border-[#E8E1D6] overflow-hidden">
                          {pres?.forma === 'procuracao' ? (
                            <div className="space-y-0.5 truncate">
                              <span
                                className="font-semibold text-[#1E1B18] block truncate"
                                title={`Procurador: ${pres.nome_procurador}`}
                              >
                                {pres.nome_procurador}
                              </span>
                              {pres.cpf_procurador && (
                                <span className="text-[10px] text-[#6B6259] font-mono block">
                                  CPF: {formatarCpf(pres.cpf_procurador)}
                                </span>
                              )}
                              {pres.procuracao_arquivo && (
                                <a
                                  href={pb.files.getURL(pres, pres.procuracao_arquivo)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-[#E39A2B] hover:underline print:hidden font-medium"
                                  title="Abrir arquivo da procuração anexado"
                                >
                                  <ExternalLink className="h-3 w-3" /> Anexo
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#6B6259]/50 text-[11px]">—</span>
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
                                  className="text-sm text-[#1E1B18] font-bold leading-none mb-0.5 block truncate max-w-[140px]"
                                  title={pres.assinatura_texto}
                                >
                                  {pres.assinatura_texto}
                                </span>
                              ) : null}

                              <div className="font-mono text-[9px] leading-tight text-[#1E1B18]">
                                <span className="font-bold text-emerald-700 block">✓ ASSINADO</span>
                                <span
                                  className="break-all text-[8px] text-[#6B6259] block"
                                  title={`Carimbo SHA-256 completo: ${pres.assinatura_hash}`}
                                >
                                  {pres.assinatura_hash.substring(0, 14)}...
                                </span>
                                {pres.data_hora_assinatura && (
                                  <span
                                    className="text-[8px] text-[#6B6259] block"
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
                            <div className="border-b border-dashed border-[#E8E1D6] h-6" />
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
        <footer className="mt-8 pt-4 border-t-2 border-slate-900 font-sans break-inside-avoid">
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

          <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-0.5">
            <p>
              Documento emitido pelo sistema de votação eletrônica {nomeCondominio} em conformidade
              com a Lei 10.406/2002 e LGPD (Lei 13.709/2018).
            </p>
            <p className="text-slate-400 text-[9px]">
              Assinaturas eletrônicas com integridade criptográfica SHA-256 vinculadas aos registros
              de auditoria.
            </p>
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
                    return (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.tipo_unidade || rotuloUnidade} {u.identificador} (
                        {u.bloco || 'Principal'}){jaRegistrado ? ' — [JÁ PRESENTE]' : ''}
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
                  <SelectItem value="remoto">Remoto (Plataforma online)</SelectItem>
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

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  type DeliberacaoRecord,
  type ItemPautaRecord,
  type AtaAssembleiaRecord,
  type FormatoAssinatura,
} from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { useAuth } from '@/context/AuthContext'
import { formatarCpf } from '@/lib/cpf'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
import { imprimirOuBaixarPdfAta, type DadosAtaPdf } from '@/lib/pdfAta'
import { gerarPdfAtaComHash } from '@/lib/pdf/gerarPdfAtaBytes'
import { BlocoAssinaturaCompacto } from '@/components/assinatura/BlocoAssinaturaCompacto'
import { ModalAssinaturaEletronica } from '@/components/assinatura/ModalAssinaturaEletronica'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { SafeHtml } from '@/components/editor/SafeHtml'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
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
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  Sparkles,
  Loader2,
  Printer,
  Download,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Clock,
  ExternalLink,
  Users,
  Eye,
  Mic,
  Square,
  UploadCloud,
  FileUp,
  Volume2,
  FileSignature,
  Copy,
} from 'lucide-react'

export const AtaAssembleiaPage: React.FC = () => {
  const navigate = useNavigate()
  const { nomeCondominio, logoUrl } = useCondoConfig()
  const { user } = useAuth()

  // Lista de deliberações e deliberação ativa
  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [itensPauta, setItensPauta] = useState<ItemPautaRecord[]>([])
  const [carregando, setCarregando] = useState(true)

  // Registro da Ata persistente no banco
  const [ataDbId, setAtaDbId] = useState<string | null>(null)
  const [statusAta, setStatusAta] = useState<'rascunho' | 'assinada' | 'publicada'>('rascunho')
  const [tituloAta, setTituloAta] = useState('')
  const [textoEntradaBruto, setTextoEntradaBruto] = useState('')
  const [conteudoHtml, setConteudoHtml] = useState('')

  // Assinaturas da Mesa Diretora
  const [presidenteNome, setPresidenteNome] = useState('')
  const [presidenteCpf, setPresidenteCpf] = useState('')
  const [presidenteFormato, setPresidenteFormato] = useState<FormatoAssinatura>('desenho')
  const [presidenteAssinaturaVisual, setPresidenteAssinaturaVisual] = useState<string | undefined>()
  const [presidenteAssinaturaTexto, setPresidenteAssinaturaTexto] = useState<string | undefined>()
  const [presidenteAssinadoEm, setPresidenteAssinadoEm] = useState<string | null>(null)
  const [presidenteHash, setPresidenteHash] = useState<string | null>(null)

  const [secretarioNome, setSecretarioNome] = useState('')
  const [secretarioCpf, setSecretarioCpf] = useState('')
  const [secretarioFormato, setSecretarioFormato] = useState<FormatoAssinatura>('desenho')
  const [secretarioAssinaturaVisual, setSecretarioAssinaturaVisual] = useState<string | undefined>()
  const [secretarioAssinaturaTexto, setSecretarioAssinaturaTexto] = useState<string | undefined>()
  const [secretarioAssinadoEm, setSecretarioAssinadoEm] = useState<string | null>(null)
  const [secretarioHash, setSecretarioHash] = useState<string | null>(null)

  // Snapshot criptográfico e integridade
  const [snapshotAssinado, setSnapshotAssinado] = useState<string | null>(null)
  const [hashAta, setHashAta] = useState<string | null>(null)
  const [hashRaizUrna, setHashRaizUrna] = useState<string | null>(null)
  const [dataPublicacao, setDataPublicacao] = useState<string | null>(null)

  // Integração ZapSign (Fase 3)
  const [zapsignStatus, setZapsignStatus] = useState<string | null>(null)
  const [zapsignDocToken, setZapsignDocToken] = useState<string | null>(null)
  const [zapsignModoAssinatura, setZapsignModoAssinatura] = useState<string | null>(null)
  const [zapsignSignatarios, setZapsignSignatarios] = useState<Array<{
    nome: string
    email?: string
    telefone?: string
    sign_url?: string
    status?: string
    signed?: boolean
  }> | null>(null)
  const [zapsignAssinadoEm, setZapsignAssinadoEm] = useState<string | null>(null)
  const [zapsignPdfUrl, setZapsignPdfUrl] = useState<string | null>(null)
  const [zapsignPdfHash, setZapsignPdfHash] = useState<string | null>(null)
  const [enviandoZapsign, setEnviandoZapsign] = useState(false)
  const [modalZapsignAberto, setModalZapsignAberto] = useState(false)

  // Estados de Operação
  const [gerandoIa, setGerandoIa] = useState(false)
  const [salvandoManual, setSalvandoManual] = useState(false)
  const [publicandoAta, setPublicandoAta] = useState(false)
  const [enviarEmailPublicacao, setEnviarEmailPublicacao] = useState(true)
  const [modalConfirmarRegeneracao, setModalConfirmarRegeneracao] = useState(false)
  const [modalPublicarAberto, setModalPublicarAberto] = useState(false)

  // Fase 3: Gravação de Áudio e Extração de Documentos
  const [gravandoAudio, setGravandoAudio] = useState(false)
  const [tempoGravacaoSegundos, setTempoGravacaoSegundos] = useState(0)
  const [modalConfirmarCancelarGravacao, setModalConfirmarCancelarGravacao] = useState(false)
  const [transcrevendoAudio, setTranscrevendoAudio] = useState(false)
  const [extraindoDocumento, setExtraindoDocumento] = useState(false)
  const [nomeArquivoProcessando, setNomeArquivoProcessando] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerGravacaoRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputDocumentoRef = useRef<HTMLInputElement | null>(null)

  // Modal Único de Assinatura Eletrônica (Mesa)
  const [modalAssinaturaMesa, setModalAssinaturaMesa] = useState<
    'presidente' | 'secretario' | null
  >(null)
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false)

  // Autosave
  const [autosaveStatus, setAutosaveStatus] = useState<
    'idle' | 'pending' | 'saving' | 'saved' | 'error'
  >('idle')
  const [ultimoSalvoHora, setUltimoSalvoHora] = useState<string | null>(null)

  // Aba ativa: 'editor' | 'previa'
  const [abaAtiva, setAbaAtiva] = useState<string>('editor')

  // Refs para controle de concorrência e debounce
  const ataDbIdRef = useRef(ataDbId)
  ataDbIdRef.current = ataDbId

  const deliberacaoAtivaRef = useRef(deliberacaoAtiva)
  deliberacaoAtivaRef.current = deliberacaoAtiva

  const textoEntradaBrutoRef = useRef(textoEntradaBruto)
  textoEntradaBrutoRef.current = textoEntradaBruto

  const conteudoHtmlRef = useRef(conteudoHtml)
  conteudoHtmlRef.current = conteudoHtml

  const tituloAtaRef = useRef(tituloAta)
  tituloAtaRef.current = tituloAta

  const statusAtaRef = useRef(statusAta)
  statusAtaRef.current = statusAta

  const snapshotAssinadoRef = useRef(snapshotAssinado)
  snapshotAssinadoRef.current = snapshotAssinado

  const isCarregandoRef = useRef(true)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  const needsResaveRef = useRef(false)

  // Gerar Hash SHA-256 no browser
  const calcularSha256 = async (texto: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(texto)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Snapshot do conteúdo atual para detectar se o texto foi modificado pós-assinatura
  const snapshotAtual = useMemo(() => {
    return JSON.stringify({
      titulo: tituloAta.trim(),
      conteudo: sanitizeHtml(conteudoHtml).trim(),
    })
  }, [tituloAta, conteudoHtml])

  // Checar se a assinatura da mesa está desatualizada (alerta visual)
  const assinaturaDesatualizada = useMemo(() => {
    if (!presidenteHash && !secretarioHash) return false
    if (!snapshotAssinado) return false
    return snapshotAtual !== snapshotAssinado
  }, [presidenteHash, secretarioHash, snapshotAssinado, snapshotAtual])

  const assinaturaDesatualizadaRef = useRef(assinaturaDesatualizada)
  assinaturaDesatualizadaRef.current = assinaturaDesatualizada

  // Limpar recursos de mídia se o componente for desmontado
  useEffect(() => {
    return () => {
      if (timerGravacaoRef.current) {
        clearInterval(timerGravacaoRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop()
        } catch {
          /* intentionally ignored */
        }
      }
    }
  }, [])

  // Formatação de cronômetro mm:ss
  const formatarTempo = (totalSegundos: number) => {
    const min = Math.floor(totalSegundos / 60)
    const seg = totalSegundos % 60
    return `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`
  }

  // Anexar texto ao campo de matéria bruta existente
  const anexarAoTextoBruto = (novoTrecho: string, cabecalho: string) => {
    const textoLimpo = novoTrecho.trim()
    if (!textoLimpo) return

    setTextoEntradaBruto((anterior) => {
      const dataHora = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const bloco = `\n\n--- [${cabecalho} • ${dataHora}] ---\n${textoLimpo}\n`
      return anterior.trim() ? `${anterior.trim()}${bloco}` : bloco.trim()
    })
  }

  // Iniciar Gravação de Áudio via MediaRecorder
  const handleIniciarGravacao = async () => {
    if (!deliberacaoAtiva) {
      toast({
        title: 'Selecione uma assembleia',
        description: 'É necessário ter uma assembleia selecionada para gravar.',
        variant: 'destructive',
      })
      return
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: 'Gravação não suportada',
        description: 'Seu navegador não suporta captura de microfone via MediaDevices.',
        variant: 'destructive',
      })
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      // Escolher melhor mimeType suportado pelo browser
      let options: MediaRecorderOptions = {}
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' }
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' }
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' }
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options = { mimeType: 'audio/ogg;codecs=opus' }
      }

      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaStreamRef.current = stream

      recorder.onstop = async () => {
        // Parar todas as faixas do microfone
        stream.getTracks().forEach((track) => track.stop())
        if (mediaStreamRef.current === stream) {
          mediaStreamRef.current = null
        }

        const duracao = tempoGravacaoSegundosRef.current
        const mimeTypeFinal = options.mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeFinal })

        if (audioBlob.size === 0) {
          toast({
            title: 'Gravação vazia',
            description: 'Nenhum sinal de áudio foi capturado pelo microfone.',
            variant: 'destructive',
          })
          return
        }

        // Enviar para o backend para transcrição
        await processarEnvioAudio(audioBlob, duracao)
      }

      recorder.start(1000) // Emitir chunks a cada 1 segundo
      setGravandoAudio(true)
      setTempoGravacaoSegundos(0)

      if (timerGravacaoRef.current) clearInterval(timerGravacaoRef.current)
      timerGravacaoRef.current = setInterval(() => {
        setTempoGravacaoSegundos((prev) => prev + 1)
      }, 1000)

      toast({
        title: 'Gravação Iniciada',
        description: 'Fale claramente ao microfone. Clique em "Parar e Transcrever" ao concluir.',
      })
    } catch (err: any) {
      console.error('Erro ao acessar microfone:', err)
      toast({
        title: 'Microfone Bloqueado ou Indisponível',
        description:
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            ? 'Permissão de microfone negada no navegador. Autorize o acesso ao microfone nas configurações.'
            : err?.message || 'Não foi possível inicializar a gravação de áudio.',
        variant: 'destructive',
      })
    }
  }

  // Ref para capturar duração no callback de onstop
  const tempoGravacaoSegundosRef = useRef(tempoGravacaoSegundos)
  tempoGravacaoSegundosRef.current = tempoGravacaoSegundos

  // Parar gravação
  const handlePararGravacao = async () => {
    if (timerGravacaoRef.current) {
      clearInterval(timerGravacaoRef.current)
      timerGravacaoRef.current = null
    }

    const recorder = mediaRecorderRef.current
    setGravandoAudio(false)

    // Se o recorder ainda estiver ativo, parar normalmente (o onstop cuidará do envio)
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
      return
    }

    // Proteger o caso "track morreu": navegador interrompeu a gravação em segundo plano
    // ou recorder já transitou para inactive antes do clique
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    const duracao = tempoGravacaoSegundosRef.current
    const mimeTypeFinal = recorder?.mimeType || 'audio/webm'
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeFinal })

    if (audioBlob.size > 0 && audioChunksRef.current.length > 0) {
      // Há áudio recuperável acumulado
      toast({
        title: 'Finalizando gravação',
        description: 'Processando os fragmentos de áudio capturados antes da interrupção...',
      })
      await processarEnvioAudio(audioBlob, duracao)
    } else {
      setTempoGravacaoSegundos(0)
      toast({
        title: 'Gravação interrompida',
        description: 'A gravação foi interrompida pelo navegador. Grave novamente.',
        variant: 'destructive',
      })
    }
  }

  // Solicitar cancelamento (abre diálogo de confirmação sem parar a gravação)
  const handleSolicitarCancelarGravacao = () => {
    setModalConfirmarCancelarGravacao(true)
  }

  // Confirmar descarte do áudio gravado
  const handleConfirmarDescarteGravacao = () => {
    setModalConfirmarCancelarGravacao(false)

    if (timerGravacaoRef.current) {
      clearInterval(timerGravacaoRef.current)
      timerGravacaoRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Remover listener onstop antes de parar para não processar
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    audioChunksRef.current = []
    setGravandoAudio(false)
    setTempoGravacaoSegundos(0)
    toast({
      title: 'Gravação cancelada',
      description: 'O áudio gravado foi descartado.',
    })
  }

  // Enviar áudio para o backend transcrever
  const processarEnvioAudio = async (audioBlob: Blob, duracao: number) => {
    if (!deliberacaoAtiva) return

    setTranscrevendoAudio(true)
    try {
      const resp = await api.transcreverAudioAta(deliberacaoAtiva.id, audioBlob, duracao)
      if (resp.success && resp.textoTranscrito) {
        anexarAoTextoBruto(resp.textoTranscrito, 'Transcrição de Áudio da Mesa')
        toast({
          title: 'Áudio transcrito via Groq Whisper',
          description: `Áudio processado e transcrito integralmente (${resp.duracaoSegundos ? `${resp.duracaoSegundos}s` : 'concluído'}). O texto foi anexado como matéria bruta para geração da ata.`,
        })
      } else {
        toast({
          title: 'Transcrição Concluída',
          description: resp.message || 'Nenhum texto detectado no áudio enviado.',
        })
      }
    } catch (err: any) {
      console.error('Erro na transcrição de áudio:', err)
      const msg =
        err?.data?.message ||
        err?.response?.message ||
        err?.message ||
        'Falha temporária ao transcrever áudio no servidor.'
      toast({
        title: 'Falha na Transcrição de Áudio',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setTranscrevendoAudio(false)
      setTempoGravacaoSegundos(0)
    }
  }

  // Upload e Extração de Documentos (PDF, TXT, MD, Imagens)
  const handleArquivoSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !deliberacaoAtiva) return

    const arquivo = files[0]
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''

    const maxBytes = 10 * 1024 * 1024 // 10 MB
    if (arquivo.size > maxBytes) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo selecionado (${(arquivo.size / (1024 * 1024)).toFixed(1)} MB) excede o limite de 10 MB.`,
        variant: 'destructive',
      })
      return
    }

    setExtraindoDocumento(true)
    setNomeArquivoProcessando(arquivo.name)

    try {
      const resp = await api.extrairDocumentoAta(deliberacaoAtiva.id, arquivo)
      if (resp.success && resp.textoExtraido) {
        anexarAoTextoBruto(resp.textoExtraido, `Documento Digitalizado: ${arquivo.name}`)
        toast({
          title: 'Documento extraído com sucesso',
          description: `Conteúdo de "${arquivo.name}" importado (${resp.caracteres ? `${resp.caracteres} caracteres` : 'extração concluída'}). O texto foi anexado como matéria bruta para redação da ata.`,
        })
      } else {
        toast({
          title: 'Processamento de Documento',
          description: resp.message || 'Nenhum texto extraído do documento.',
        })
      }
    } catch (err: any) {
      console.error('Erro na extração de documento:', err)
      const msg =
        err?.data?.message ||
        err?.message ||
        'Não foi possível extrair o texto do arquivo selecionado.'
      toast({
        title: 'Falha ao Extrair Documento',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setExtraindoDocumento(false)
      setNomeArquivoProcessando(null)
    }
  }

  // Carregar dados da assembleia e da ata correspondente
  const carregarDados = async (delibId?: string) => {
    isCarregandoRef.current = true
    setCarregando(true)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    setAutosaveStatus('idle')

    try {
      const delibs = await api.getDeliberacoes()
      setDeliberacoes(delibs)

      const delibAtual = delibId
        ? delibs.find((d) => d.id === delibId) || delibs[0]
        : delibs.find((d) => d.status === 'APURADA' || d.status === 'PUBLICADA') ||
          delibs.find((d) => d.status !== 'ENCERRADA') ||
          delibs[0]

      setDeliberacaoAtiva(delibAtual || null)

      if (delibAtual) {
        const [itens, ataSalva] = await Promise.all([
          api.getItensPauta(delibAtual.id),
          api.getAtaPorDeliberacao(delibAtual.id).catch(() => null),
        ])

        setItensPauta(itens)

        const defaultTitulo = `ATA DA ASSEMBLEIA GERAL ORDINÁRIA/EXTRAORDINÁRIA — ${delibAtual.titulo}`

        if (ataSalva) {
          setAtaDbId(ataSalva.id)
          setStatusAta(ataSalva.status || 'rascunho')
          setTituloAta(ataSalva.titulo || defaultTitulo)
          setTextoEntradaBruto(ataSalva.texto_entrada_bruto || '')
          setConteudoHtml(ataSalva.conteudo_html || '')

          setPresidenteNome(ataSalva.presidente_nome || delibAtual.mesa_presidente_nome || '')
          setPresidenteCpf(
            formatarCpf(ataSalva.presidente_cpf || delibAtual.mesa_presidente_cpf || ''),
          )
          setPresidenteFormato(ataSalva.presidente_formato || 'desenho')
          setPresidenteAssinaturaVisual(ataSalva.presidente_assinatura_visual || undefined)
          setPresidenteAssinaturaTexto(ataSalva.presidente_assinatura_texto || undefined)
          setPresidenteAssinadoEm(ataSalva.presidente_assinado_em || null)
          setPresidenteHash(ataSalva.presidente_hash || null)

          setSecretarioNome(ataSalva.secretario_nome || delibAtual.mesa_secretario_nome || '')
          setSecretarioCpf(
            formatarCpf(ataSalva.secretario_cpf || delibAtual.mesa_secretario_cpf || ''),
          )
          setSecretarioFormato(ataSalva.secretario_formato || 'desenho')
          setSecretarioAssinaturaVisual(ataSalva.secretario_assinatura_visual || undefined)
          setSecretarioAssinaturaTexto(ataSalva.secretario_assinatura_texto || undefined)
          setSecretarioAssinadoEm(ataSalva.secretario_assinado_em || null)
          setSecretarioHash(ataSalva.secretario_hash || null)

          setSnapshotAssinado(ataSalva.conteudo_assinado_snapshot || null)
          setHashAta(ataSalva.hash_ata || null)
          setHashRaizUrna(ataSalva.hash_raiz_urna || delibAtual.hash_raiz || null)
          setDataPublicacao(ataSalva.data_publicacao || null)

          // ZapSign
          setZapsignStatus(ataSalva.zapsign_status || null)
          setZapsignDocToken(ataSalva.zapsign_doc_token || null)
          setZapsignModoAssinatura(ataSalva.modo_assinatura || null)
          setZapsignSignatarios(ataSalva.zapsign_signatarios || null)
          setZapsignAssinadoEm(ataSalva.zapsign_assinado_em || null)
          setZapsignPdfUrl(ataSalva.zapsign_pdf_assinado_url || null)
          setZapsignPdfHash(ataSalva.zapsign_pdf_assinado_hash || null)
        } else {
          // Inicializar nova ata vazia
          setAtaDbId(null)
          setStatusAta('rascunho')
          setTituloAta(defaultTitulo)
          setTextoEntradaBruto('')
          setConteudoHtml('')

          setPresidenteNome(delibAtual.mesa_presidente_nome || '')
          setPresidenteCpf(formatarCpf(delibAtual.mesa_presidente_cpf || ''))
          setPresidenteFormato('desenho')
          setPresidenteAssinaturaVisual(undefined)
          setPresidenteAssinaturaTexto(undefined)
          setPresidenteAssinadoEm(null)
          setPresidenteHash(null)

          setSecretarioNome(delibAtual.mesa_secretario_nome || '')
          setSecretarioCpf(formatarCpf(delibAtual.mesa_secretario_cpf || ''))
          setSecretarioFormato('desenho')
          setSecretarioAssinaturaVisual(undefined)
          setSecretarioAssinaturaTexto(undefined)
          setSecretarioAssinadoEm(null)
          setSecretarioHash(null)

          setSnapshotAssinado(null)
          setHashAta(null)
          setHashRaizUrna(delibAtual.hash_raiz || null)
          setDataPublicacao(null)

          setZapsignStatus(null)
          setZapsignDocToken(null)
          setZapsignModoAssinatura(null)
          setZapsignSignatarios(null)
          setZapsignAssinadoEm(null)
          setZapsignPdfUrl(null)
          setZapsignPdfHash(null)
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados da Ata:', err)
      toast({
        title: 'Erro ao carregar ata',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
      setTimeout(() => {
        isCarregandoRef.current = false
      }, 100)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Ação de Envio para Assinatura via ZapSign (ou fallback manual)
  const handleEnviarZapSign = async () => {
    if (!deliberacaoAtiva) {
      toast({
        title: 'Nenhuma deliberação ativa',
        description: 'Selecione uma deliberação antes de enviar para assinatura.',
        variant: 'destructive',
      })
      return
    }

    // Salvar antes de enviar para garantir que a ata esteja atualizada no banco
    setEnviandoZapsign(true)
    try {
      const ataSalva = await persistirAtaNoBanco(false)
      const ataIdTarget = ataSalva?.id || ataDbId
      if (!ataIdTarget) {
        throw new Error('Não foi possível identificar o registro da ata para envio.')
      }

      // Montar lista de signatários da mesa
      const signatariosEnvio: Array<{ nome: string; email?: string; telefone?: string }> = []
      if (presidenteNome.trim()) {
        signatariosEnvio.push({
          nome: presidenteNome.trim(),
          email: deliberacaoAtiva.mesa_presidente_email || user?.email || undefined,
        })
      }
      if (secretarioNome.trim()) {
        signatariosEnvio.push({
          nome: secretarioNome.trim(),
          email: deliberacaoAtiva.mesa_secretario_email || undefined,
        })
      }

      // Anexar o PDF completo da ata (mesma estrutura do PDF de impressão),
      // gerado em bytes no navegador — sem ele a ZapSign renderiza apenas o título.
      let pdfBase64: string | undefined
      try {
        const prova = await gerarPdfAtaComHash(dadosPdf)
        pdfBase64 = prova.pdfBase64
      } catch (errPdf) {
        console.error('Falha ao gerar PDF da ata em bytes para ZapSign:', errPdf)
        toast({
          title: 'PDF da ata não pôde ser anexado',
          description:
            'O envio continuará sem o anexo — a ZapSign receberá apenas o texto simples da ata. Verifique o console para detalhes.',
        })
      }

      const resp = await api.enviarAtaZapsign(ataIdTarget, {
        pdf_base64: pdfBase64,
        signatarios: signatariosEnvio,
      })

      if (resp.modo_assinatura === 'manual_impressao' || resp.fallback) {
        setZapsignModoAssinatura('manual_impressao')
        toast({
          title: 'Contingência: Assinatura Manual Ativada',
          description:
            resp.motivo ||
            'A integração ZapSign não possui token configurado. A ata foi preparada para assinatura manual impressa com caneta.',
        })
        // Gerar automaticamente o PDF com advertência e sem selo eletrônico
        const dadosPdfManual: DadosAtaPdf = {
          ...dadosPdf,
          viaAssinaturaManual: true,
          motivoFallbackManual:
            resp.motivo || 'ZapSign não configurada — contingência manual ativada',
        }
        imprimirOuBaixarPdfAta(dadosPdfManual)
      } else {
        setZapsignStatus(resp.status || 'aguardando')
        setZapsignDocToken(resp.doc_token || null)
        setZapsignModoAssinatura('zapsign')
        if (resp.signatarios && Array.isArray(resp.signatarios)) {
          setZapsignSignatarios(resp.signatarios)
        }
        setModalZapsignAberto(true)
        toast({
          title: 'Documento ZapSign Criado!',
          description:
            'A ata foi enviada à ZapSign. Copie os links de assinatura ou aguarde o retorno do webhook.',
        })
      }
    } catch (err: any) {
      console.error('Erro ao enviar ata para ZapSign:', err)
      toast({
        title: 'Erro ao enviar para ZapSign',
        description: err?.message || 'Falha ao contatar o servidor para envio ZapSign.',
        variant: 'destructive',
      })
    } finally {
      setEnviandoZapsign(false)
    }
  }

  // Persistência unificada no banco (salvamento manual e autosave debounce)
  const persistirAtaNoBanco = useCallback(
    async (isAutosave = false) => {
      const delib = deliberacaoAtivaRef.current
      if (!delib) return null

      if (isSavingRef.current) {
        needsResaveRef.current = true
        return null
      }

      isSavingRef.current = true
      if (!isAutosave) {
        setSalvandoManual(true)
      } else {
        setAutosaveStatus('saving')
      }

      try {
        const conteudoSanitizado = sanitizeHtml(conteudoHtmlRef.current).trim()
        const tituloSanitizado = tituloAtaRef.current.trim() || `ATA — ${delib.titulo}`
        const rawPresCpf = presidenteCpf.replace(/\D/g, '')
        const rawSecCpf = secretarioCpf.replace(/\D/g, '')

        const ambosAssinaramValido =
          presidenteHash && secretarioHash && !assinaturaDesatualizadaRef.current

        let novoStatus = statusAtaRef.current
        if (novoStatus !== 'publicada') {
          novoStatus = ambosAssinaramValido ? 'assinada' : 'rascunho'
        }

        const payload: Partial<AtaAssembleiaRecord> = {
          titulo: tituloSanitizado,
          texto_entrada_bruto: textoEntradaBrutoRef.current,
          conteudo_html: conteudoSanitizado,
          status: novoStatus,
          presidente_nome: presidenteNome.trim(),
          presidente_cpf: rawPresCpf,
          presidente_formato: presidenteFormato,
          presidente_assinatura_visual: presidenteAssinaturaVisual,
          presidente_assinatura_texto: presidenteAssinaturaTexto,
          presidente_assinado_em: presidenteAssinadoEm || undefined,
          presidente_hash: presidenteHash || undefined,

          secretario_nome: secretarioNome.trim(),
          secretario_cpf: rawSecCpf,
          secretario_formato: secretarioFormato,
          secretario_assinatura_visual: secretarioAssinaturaVisual,
          secretario_assinatura_texto: secretarioAssinaturaTexto,
          secretario_assinado_em: secretarioAssinadoEm || undefined,
          secretario_hash: secretarioHash || undefined,

          conteudo_assinado_snapshot: snapshotAssinadoRef.current || undefined,
          hash_ata: hashAta || undefined,
          hash_raiz_urna: hashRaizUrna || delib.hash_raiz || undefined,
          data_publicacao: dataPublicacao || undefined,
        }

        const registroSalvo = await api.salvarAta(
          delib.id,
          payload,
          ataDbIdRef.current || undefined,
        )

        setAtaDbId(registroSalvo.id)
        setStatusAta(registroSalvo.status)

        const hora = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
        setUltimoSalvoHora(hora)
        setAutosaveStatus('saved')

        return registroSalvo
      } catch (err: any) {
        console.error('Erro ao persistir ata:', err)
        setAutosaveStatus('error')
        if (!isAutosave) {
          toast({
            title: 'Erro ao salvar ata',
            description: err?.message || 'Falha de comunicação com o servidor.',
            variant: 'destructive',
          })
        }
        return null
      } finally {
        isSavingRef.current = false
        if (!isAutosave) setSalvandoManual(false)

        if (needsResaveRef.current) {
          needsResaveRef.current = false
          setTimeout(() => persistirAtaNoBanco(true), 400)
        }
      }
    },
    [
      presidenteNome,
      presidenteCpf,
      presidenteFormato,
      presidenteAssinaturaVisual,
      presidenteAssinaturaTexto,
      presidenteAssinadoEm,
      presidenteHash,
      secretarioNome,
      secretarioCpf,
      secretarioFormato,
      secretarioAssinaturaVisual,
      secretarioAssinaturaTexto,
      secretarioAssinadoEm,
      secretarioHash,
      hashAta,
      hashRaizUrna,
      dataPublicacao,
    ],
  )

  // Disparo automático do debounce ~2s ao editar o HTML ou o título
  useEffect(() => {
    if (isCarregandoRef.current) return
    if (gerandoIa) return

    setAutosaveStatus('pending')
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      persistirAtaNoBanco(true)
    }, 2000)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [conteudoHtml, tituloAta, textoEntradaBruto, persistirAtaNoBanco, gerandoIa])

  // Ação de Geração com IA (Agente Skip Cloud)
  const handleGerarAtaIa = async () => {
    if (!deliberacaoAtiva) return

    // Se já houver conteúdo editado, pedir confirmação
    if (conteudoHtml.trim().length > 30 && !modalConfirmarRegeneracao) {
      setModalConfirmarRegeneracao(true)
      return
    }

    setModalConfirmarRegeneracao(false)
    setGerandoIa(true)

    const temAnotacoesDigitadas = textoEntradaBruto.trim().length > 0
    try {
      const resp = await api.gerarAtaComIa(deliberacaoAtiva.id, textoEntradaBruto)
      if (resp.success && resp.conteudoHtml) {
        setConteudoHtml(resp.conteudoHtml)
        if (resp.hashRaizUrna) {
          setHashRaizUrna(resp.hashRaizUrna)
        }

        // Se regenerou, invalidar assinaturas anteriores da mesa
        setPresidenteHash(null)
        setPresidenteAssinadoEm(null)
        setSecretarioHash(null)
        setSecretarioAssinadoEm(null)
        setSnapshotAssinado(null)
        setHashAta(null)
        setStatusAta('rascunho')

        toast({
          title: 'Minuta da ata gerada',
          description: temAnotacoesDigitadas
            ? 'A inteligência estruturou a ata conforme anotações brutas e diretrizes jurídicas. Revise os detalhes abaixo.'
            : 'A ata foi estruturada conforme os dados cadastrais da assembleia. Você pode revisá-la e editá-la.',
        })
      }
    } catch (err: any) {
      console.error('Erro na geração da ata por IA:', err)
      toast({
        title: 'Não foi possível gerar a ata com IA',
        description:
          err?.message ||
          'O serviço de IA está temporariamente ocupado. O texto digitado foi integralmente preservado. Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setGerandoIa(false)
    }
  }

  // Apor Assinatura Eletrônica da Mesa (Presidente ou Secretário)
  const handleConfirmarAssinaturaMesa = async (dados: {
    nome: string
    cpf: string
    cargo?: string
    formato: FormatoAssinatura
    assinaturaVisual?: string
    assinaturaTexto?: string
    dataHoraAssinatura?: string
  }) => {
    if (!deliberacaoAtiva || !modalAssinaturaMesa) return

    setSalvandoAssinatura(true)
    try {
      // 1. Garantir que a ata está salva antes de assinar
      await persistirAtaNoBanco(false)

      const dataHoraIso = dados.dataHoraAssinatura || new Date().toISOString()
      const snapshotParaAssinatura = JSON.stringify({
        titulo: tituloAta.trim(),
        conteudo: sanitizeHtml(conteudoHtml).trim(),
      })

      // Gerar hash individual do assinante
      const payloadAssinante = JSON.stringify({
        deliberacaoId: deliberacaoAtiva.id,
        papelMesa: modalAssinaturaMesa,
        nome: dados.nome,
        cpf: dados.cpf,
        snapshot: snapshotParaAssinatura,
        dataHora: dataHoraIso,
      })
      const hashIndividual = await calcularSha256(payloadAssinante)

      // Registrar também na collection institucional de assinaturas
      await api.registrarAssinaturaDocumento({
        documento_id: ataDbId || `ata_${deliberacaoAtiva.id}`,
        documento_tipo: 'ata_assembleia',
        deliberacao: deliberacaoAtiva.id,
        assinante_nome: dados.nome,
        assinante_cpf: dados.cpf,
        tipo: modalAssinaturaMesa === 'presidente' ? 'mesa_presidente' : 'mesa_secretario',
        hash_documento: hashIndividual,
        data_hora: dataHoraIso,
        usuario: user?.id,
        ip_dispositivo: navigator.userAgent,
        formato_assinatura: dados.formato,
        assinatura_visual: dados.assinaturaVisual,
        assinatura_texto: dados.assinaturaTexto,
      })

      if (modalAssinaturaMesa === 'presidente') {
        setPresidenteNome(dados.nome)
        setPresidenteCpf(formatarCpf(dados.cpf))
        setPresidenteFormato(dados.formato)
        setPresidenteAssinaturaVisual(dados.assinaturaVisual)
        setPresidenteAssinaturaTexto(dados.assinaturaTexto)
        setPresidenteAssinadoEm(dataHoraIso)
        setPresidenteHash(hashIndividual)
      } else {
        setSecretarioNome(dados.nome)
        setSecretarioCpf(formatarCpf(dados.cpf))
        setSecretarioFormato(dados.formato)
        setSecretarioAssinaturaVisual(dados.assinaturaVisual)
        setSecretarioAssinaturaTexto(dados.assinaturaTexto)
        setSecretarioAssinadoEm(dataHoraIso)
        setSecretarioHash(hashIndividual)
      }

      setSnapshotAssinado(snapshotParaAssinatura)

      // Calcular Hash Geral da Ata
      const hashGeral = await calcularSha256(
        `ATA:${deliberacaoAtiva.id}:${snapshotParaAssinatura}:${dataHoraIso}`,
      )
      setHashAta(hashGeral)

      // Registrar evento na trilha de auditoria
      await api.registrarEventoAuditoria({
        evento: 'assinatura_registrada',
        fator: `Mesa Diretora: ${dados.nome} assinou a Ata da Assembleia (${modalAssinaturaMesa})`,
        dispositivo: navigator.userAgent,
      })

      setModalAssinaturaMesa(null)
      toast({
        title: `Assinatura de ${modalAssinaturaMesa === 'presidente' ? 'Presidente' : 'Secretário(a)'} concluída`,
        description: `Carimbo SHA-256 gerado: ${hashIndividual.substring(0, 16)}...`,
      })
    } catch (err: any) {
      console.error('Erro ao apor assinatura na ata:', err)
      toast({
        title: 'Erro ao assinar ata',
        description: err?.message || 'Falha ao registrar assinatura eletrônica.',
        variant: 'destructive',
      })
      throw err
    } finally {
      setSalvandoAssinatura(false)
    }
  }

  // Ação de Publicar Ata aos Moradores
  const handlePublicarAta = async () => {
    if (!ataDbId) {
      toast({
        title: 'Salve a ata antes de publicar',
        description: 'É necessário que a ata esteja salva no sistema.',
        variant: 'destructive',
      })
      return
    }

    setPublicandoAta(true)
    try {
      const resp = await api.publicarAta(ataDbId, enviarEmailPublicacao)
      setStatusAta('publicada')
      setDataPublicacao(new Date().toISOString())
      setModalPublicarAberto(false)

      toast({
        title: 'Ata publicada oficialmente',
        description: resp.message,
      })
    } catch (err: any) {
      console.error('Erro ao publicar ata:', err)
      toast({
        title: 'Erro ao publicar ata',
        description: err?.message || 'Falha ao publicar ata aos condôminos.',
        variant: 'destructive',
      })
    } finally {
      setPublicandoAta(false)
    }
  }

  // Dados para PDF / Impressão A4
  const dadosPdf: DadosAtaPdf = useMemo(
    () => ({
      nomeCondominio,
      logoUrl,
      titulo: tituloAta,
      subtitulo: `Assembleia Geral de Condôminos • Convocação Editalícia`,
      conteudoHtml: sanitizeHtml(conteudoHtml),
      status: statusAta,
      hashAta,
      hashRaizUrna: hashRaizUrna || deliberacaoAtiva?.hash_raiz || null,
      dataPublicacao,

      presidenteNome: presidenteNome || deliberacaoAtiva?.mesa_presidente_nome || '',
      presidenteCpf: formatarCpf(presidenteCpf || deliberacaoAtiva?.mesa_presidente_cpf || ''),
      presidenteFormato,
      presidenteAssinaturaVisual,
      presidenteAssinaturaTexto,
      presidenteAssinadoEm,
      presidenteHash,

      secretarioNome: secretarioNome || deliberacaoAtiva?.mesa_secretario_nome || '',
      secretarioCpf: formatarCpf(secretarioCpf || deliberacaoAtiva?.mesa_secretario_cpf || ''),
      secretarioFormato,
      secretarioAssinaturaVisual,
      secretarioAssinaturaTexto,
      secretarioAssinadoEm,
      secretarioHash,
    }),
    [
      nomeCondominio,
      logoUrl,
      tituloAta,
      conteudoHtml,
      statusAta,
      hashAta,
      hashRaizUrna,
      deliberacaoAtiva,
      dataPublicacao,
      presidenteNome,
      presidenteCpf,
      presidenteFormato,
      presidenteAssinaturaVisual,
      presidenteAssinaturaTexto,
      presidenteAssinadoEm,
      presidenteHash,
      secretarioNome,
      secretarioCpf,
      secretarioFormato,
      secretarioAssinaturaVisual,
      secretarioAssinaturaTexto,
      secretarioAssinadoEm,
      secretarioHash,
    ],
  )

  if (carregando) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-700" />
          <p className="text-xs font-medium text-slate-600">
            Carregando Módulo de Ata da Assembleia...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Barra de Topo com Seleção de Deliberação e Indicador de Autosave */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800">
              Módulo da Mesa Diretora
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-bold ${
                statusAta === 'publicada'
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                  : statusAta === 'assinada'
                    ? 'border-blue-500 text-blue-700 bg-blue-50'
                    : 'border-amber-500 text-amber-700 bg-amber-50'
              }`}
            >
              {statusAta === 'publicada'
                ? 'Publicada aos Condôminos'
                : statusAta === 'assinada'
                  ? 'Assinada pela Mesa'
                  : 'Rascunho em Elaboração'}
            </Badge>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-700" /> Ata da Assembleia com Inteligência
            Artificial
          </h2>
          <p className="text-xs text-slate-500">
            Geração notarial assistida por IA, editor rich text Tiptap, salvamento contínuo e
            assinaturas eletrônicas da mesa.
          </p>
        </div>

        {/* Seletor de Assembleia */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-64 sm:w-80">
            <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1 block">
              Assembleia Selecionada
            </Label>
            <Select value={deliberacaoAtiva?.id || ''} onValueChange={(val) => carregarDados(val)}>
              <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-300">
                <SelectValue placeholder="Selecione a assembleia" />
              </SelectTrigger>
              <SelectContent>
                {deliberacoes.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.titulo} ({d.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {deliberacaoAtiva ? (
        <div className="space-y-6">
          {/* Alerta de Assinatura Desatualizada */}
          {assinaturaDesatualizada && (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-lg flex items-start gap-3 text-amber-900 shadow-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Atenção: Assinatura da Mesa Desatualizada</p>
                <p className="text-amber-800">
                  O teor da ata foi modificado após ter sido assinado pela mesa. Para assegurar a
                  validade jurídica, é necessário recolher novamente as assinaturas eletrônicas do
                  Presidente e Secretário(a).
                </p>
              </div>
            </div>
          )}

          {/* Barra de Ações Rápidas: Autosave, Impressão, Download, Publicação */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            {/* Status do Autosave */}
            <div className="flex items-center gap-2 text-slate-600">
              {autosaveStatus === 'saving' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-600" />
                  <span>Salvando alterações automaticamente...</span>
                </>
              ) : autosaveStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>
                    Salvo automaticamente às <strong>{ultimoSalvoHora}</strong>
                  </span>
                </>
              ) : autosaveStatus === 'pending' ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>Alterações pendentes de salvamento...</span>
                </>
              ) : autosaveStatus === 'error' ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-red-700 font-medium">
                    Erro ao salvar rascunho automaticamente
                  </span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 text-slate-400" />
                  <span>Pronto para edição</span>
                </>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => persistirAtaNoBanco(false)}
                disabled={salvandoManual}
                className="text-xs h-8 gap-1.5 bg-white border-slate-300"
              >
                {salvandoManual ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 text-slate-600" />
                )}
                Salvar Rascunho
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => imprimirOuBaixarPdfAta(dadosPdf)}
                className="text-xs h-8 gap-1.5 bg-white border-slate-300"
              >
                <Printer className="h-3.5 w-3.5 text-slate-700" />
                Imprimir / PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={enviandoZapsign}
                onClick={handleEnviarZapSign}
                className="text-xs h-8 gap-1.5 bg-[#F3F7FC] border-[#0066FF]/30 text-[#002B5E] hover:bg-[#0066FF]/10 font-semibold shadow-xs"
              >
                {enviandoZapsign ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0066FF]" />
                ) : (
                  <FileSignature className="h-3.5 w-3.5 text-[#0066FF]" />
                )}
                Enviar para assinatura (ZapSign)
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/mesa/ata/imprimir/${deliberacaoAtiva.id}`)}
                className="text-xs h-8 gap-1.5 bg-white border-slate-300"
                title="Abrir página dedicada em formato A4"
              >
                <ExternalLink className="h-3.5 w-3.5 text-slate-700" />
                Visão A4 Dedicada
              </Button>

              {statusAta !== 'publicada' ? (
                <Button
                  size="sm"
                  onClick={() => setModalPublicarAberto(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Publicar Ata aos Condôminos
                </Button>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs py-1 px-2.5">
                  ✓ Ata Publicada aos Moradores
                </Badge>
              )}
            </div>
          </div>

          {/* Abas Principais: Entrada & Editor vs Visualização A4 */}
          <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-4">
            <TabsList className="bg-slate-200/80 p-1">
              <TabsTrigger value="editor" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Elaboração & Editor da Ata
              </TabsTrigger>
              <TabsTrigger value="previa" className="text-xs gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Pré-Visualização Oficial A4
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: ELABORAÇÃO, IA E EDITOR TIPTAP */}
            <TabsContent value="editor" className="space-y-6">
              {/* ETAPA 1: ENTRADA DE TEXTO BRUTO + IA */}
              <Card className="border-slate-300 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-cyan-600" /> 1. Matéria Bruta & Geração
                        Notarial por IA
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        Cole ou digite os rascunhos, transcrições e anotações da mesa. A IA
                        consolidará o texto com os dados reais de presença, quórum, pautas e votos.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {/* Barra de Ações de Entrada: Gravar Áudio + Upload Documento */}
                  <div className="p-3 bg-slate-50/90 rounded-lg border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Volume2 className="h-3.5 w-3.5 text-cyan-700" />
                        Métodos de Captura de Matéria Bruta:
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Áudio, Documento Digitalizado ou Digitação Direta
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Botão de Gravação de Áudio */}
                      {!gravandoAudio ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleIniciarGravacao}
                          disabled={transcrevendoAudio || extraindoDocumento || gerandoIa}
                          className="text-xs h-9 min-h-[44px] px-3 gap-1.5 bg-white border-slate-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                        >
                          <Mic className="h-4 w-4 text-red-600" />
                          Gravar Áudio da Sessão
                        </Button>
                      ) : (
                        <div className="w-full sm:w-auto flex flex-wrap items-center justify-between gap-3 bg-red-50/90 px-3 py-2 rounded-lg border border-red-300 shadow-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                            <span className="text-xs font-mono font-bold text-red-700">
                              Gravando: {formatarTempo(tempoGravacaoSegundos)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              onClick={handlePararGravacao}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold h-11 min-h-[44px] px-4 gap-2 shadow-xs transition-colors"
                            >
                              <Square className="h-3.5 w-3.5 fill-current" />
                              Parar e Transcrever
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleSolicitarCancelarGravacao}
                              className="text-xs font-medium h-11 min-h-[44px] px-3 bg-white/80 border-slate-300 text-slate-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition-colors"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Botão de Upload de Documento Digitalizado / Arquivo de Texto */}
                      <input
                        ref={inputDocumentoRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
                        className="hidden"
                        onChange={handleArquivoSelecionado}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => inputDocumentoRef.current?.click()}
                        disabled={
                          gravandoAudio || transcrevendoAudio || extraindoDocumento || gerandoIa
                        }
                        className="text-xs h-8 gap-1.5 bg-white border-slate-300 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-800 transition-colors"
                      >
                        <FileUp className="h-3.5 w-3.5 text-cyan-700" />
                        Anexar Documento Digitalizado (PDF/Img/TXT)
                      </Button>

                      {/* Limpar matéria bruta se houver */}
                      {textoEntradaBruto.trim().length > 0 &&
                        !gravandoAudio &&
                        !transcrevendoAudio && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Deseja realmente limpar toda a matéria bruta digitada/anexada?',
                                )
                              ) {
                                setTextoEntradaBruto('')
                              }
                            }}
                            className="text-[11px] h-8 px-2 text-slate-500 hover:text-red-600 ml-auto"
                          >
                            Limpar Texto
                          </Button>
                        )}
                    </div>

                    {/* Feedback visual durante processamento de áudio ou documento */}
                    {transcrevendoAudio && (
                      <div className="flex items-center gap-2 p-2 bg-cyan-50 rounded border border-cyan-200 text-xs text-cyan-900">
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-700 shrink-0" />
                        <span>
                          Transcrevendo áudio gravado via inteligência artificial... Aguarde.
                        </span>
                      </div>
                    )}

                    {extraindoDocumento && (
                      <div className="flex items-center gap-2 p-2 bg-cyan-50 rounded border border-cyan-200 text-xs text-cyan-900">
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-700 shrink-0" />
                        <span>
                          Extraindo conteúdo do documento{' '}
                          <strong>{nomeArquivoProcessando || 'selecionado'}</strong>... Aguarde.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <span>
                          Rascunhos, Notas de Debate e Transcrição da Assembleia (Fonte Primária):
                        </span>
                        {textoEntradaBruto.trim().length > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-cyan-50 border-cyan-200 text-cyan-800 font-normal"
                          >
                            {textoEntradaBruto.trim().length} caracteres fornecidos
                          </Badge>
                        )}
                      </Label>
                    </div>
                    <Textarea
                      placeholder="Ex: A assembleia iniciou com a palavra do Presidente. Houve debate acalorado sobre a reforma da guarita e os condôminos aprovaram o orçamento número 2. Foram registradas manifestações dos moradores sobre a taxa de condomínio... (Você também pode gravar áudio ou anexar documento acima)"
                      value={textoEntradaBruto}
                      onChange={(e) => setTextoEntradaBruto(e.target.value)}
                      rows={7}
                      disabled={gerandoIa}
                      className="text-xs font-mono bg-slate-50/50 resize-y border-slate-300 focus:bg-white"
                    />
                    <p className="text-[11px] text-cyan-900 bg-cyan-50/70 p-2 rounded border border-cyan-100 flex items-start gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-700 shrink-0 mt-0.5" />
                      <span>
                        <strong>Fonte Primária dos Debates:</strong> A IA prioriza todo o conteúdo
                        deste campo (seja digitado, gravado por voz ou extraído de documentos) para
                        redigir a narrativa fática dos trabalhos, mantendo as intervenções e nomes
                        de condôminos.
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-slate-500">
                      O agente inteligente incorporará automaticamente a qualificação da Mesa
                      Diretora, a lista de presença (física e remota) e a apuração da urna.
                    </p>
                    <Button
                      type="button"
                      onClick={handleGerarAtaIa}
                      disabled={gerandoIa}
                      className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-9 gap-2 shrink-0 shadow-xs"
                    >
                      {gerandoIa ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
                          Redigindo Ata com IA (Aguarde)...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-cyan-200" />
                          {conteudoHtml.trim().length > 0
                            ? 'Regenerar Ata com IA'
                            : 'Gerar Ata com IA'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ETAPA 2: EDITOR DE TEXTO FORMATADO TIPTAP */}
              <Card className="border-slate-300 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-cyan-700" /> 2. Editor da Ata Notarial
                        (Tiptap Rich Text)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        Edite o texto formal conforme a soberania da mesa diretora antes de colher
                        as assinaturas eletrônicas.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Título da Ata */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Título Formal do Documento:
                    </Label>
                    <Input
                      type="text"
                      value={tituloAta}
                      onChange={(e) => setTituloAta(e.target.value)}
                      placeholder="Ex: ATA DA ASSEMBLEIA GERAL ORDINÁRIA DE 25 DE MARÇO DE 2026"
                      className="text-xs font-semibold h-9 bg-slate-50"
                    />
                  </div>

                  {/* Editor Tiptap */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Corpo da Ata:</Label>
                    <RichTextEditor
                      value={conteudoHtml}
                      onChange={(html) => setConteudoHtml(html)}
                      minHeight="420px"
                      placeholder="O texto estruturado da ata aparecerá aqui para você ler, editar e formatar..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ETAPA 3: INTEGRAÇÃO ZAPSIGN / ASSINATURA ELETRÔNICA EXTERNA */}
              <Card className="border-[#002B5E]/20 shadow-xs bg-white overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 bg-[#F3F7FC]/70">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-bold text-[#002B5E] flex items-center gap-2">
                        <FileSignature className="h-4 w-4 text-[#0066FF]" /> Assinatura Digital e
                        Eletrônica (ZapSign)
                      </CardTitle>
                      <CardDescription className="text-xs text-[#5A6B82] mt-0.5">
                        Envio da ata para signatários da mesa com links exclusivos de assinatura,
                        validação jurídica e retorno via webhook.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[11px] font-semibold px-2.5 py-0.5 ${
                          zapsignStatus === 'signed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : zapsignStatus === 'pending' || zapsignStatus === 'aguardando'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : zapsignModoAssinatura === 'manual_impressao'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {zapsignStatus === 'signed'
                          ? '✓ Ata Assinada (ZapSign)'
                          : zapsignStatus === 'pending' || zapsignStatus === 'aguardando'
                            ? '⏳ Aguardando Signatários'
                            : zapsignModoAssinatura === 'manual_impressao'
                              ? 'Fallback: Impressão Manual'
                              : 'Não enviada à ZapSign'}
                      </Badge>

                      <Button
                        type="button"
                        size="sm"
                        disabled={enviandoZapsign}
                        onClick={handleEnviarZapSign}
                        className="bg-[#002B5E] hover:bg-[#002B5E]/90 text-white text-xs h-8 gap-1.5 shadow-xs"
                      >
                        {enviandoZapsign ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        {zapsignDocToken
                          ? 'Reenviar / Atualizar ZapSign'
                          : 'Enviar para assinatura (ZapSign)'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Alerta de Fallback Manual */}
                  {zapsignModoAssinatura === 'manual_impressao' && (
                    <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50/80 text-amber-950 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                        Modo de Contingência Ativo: Assinatura Manual Impressa
                      </div>
                      <p className="text-amber-800 leading-relaxed">
                        A integração ZapSign não possui token cadastrado ou o serviço externo está
                        indisponível. O documento foi configurado no modo{' '}
                        <strong>manual_impressao</strong>: gere o PDF pela impressão oficial para
                        colher as assinaturas físicas a caneta. O PDF gerado incluirá uma tarja de
                        advertência explícita, sem selo eletrônico.
                      </p>
                      <div className="pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const dadosPdfManual: DadosAtaPdf = {
                              ...dadosPdf,
                              viaAssinaturaManual: true,
                              motivoFallbackManual:
                                'ZapSign não configurada — contingência manual ativada',
                            }
                            imprimirOuBaixarPdfAta(dadosPdfManual)
                          }}
                          className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 text-xs h-8 gap-1.5"
                        >
                          <Printer className="h-3.5 w-3.5" /> Imprimir Documento com Tarja Manual
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Detalhes do Documento ZapSign quando criado */}
                  {zapsignDocToken && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Token do Documento ZapSign
                          </span>
                          <span className="font-mono text-[11px] text-[#002B5E] break-all font-semibold">
                            {zapsignDocToken}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Status do Processo
                          </span>
                          <span className="font-semibold text-slate-800 capitalize">
                            {zapsignStatus || 'Aguardando'}
                          </span>
                          {zapsignAssinadoEm && (
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Concluído em: {new Date(zapsignAssinadoEm).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              PDF Assinado / Hash
                            </span>
                            {zapsignPdfHash ? (
                              <span className="font-mono text-[10px] text-emerald-800 truncate block">
                                {zapsignPdfHash.slice(0, 20)}...
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                Aguardando assinaturas
                              </span>
                            )}
                          </div>
                          {zapsignPdfUrl && (
                            <a
                              href={zapsignPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[#0066FF] hover:underline font-semibold mt-1"
                            >
                              <ExternalLink className="h-3 w-3" /> Abrir PDF Oficial Assinado
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Tabela de Signatários e Links de Assinatura */}
                      {zapsignSignatarios && zapsignSignatarios.length > 0 && (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-100/80 px-3.5 py-2 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                            <span>Links de Assinatura dos Signatários</span>
                            <span className="text-[11px] text-slate-500 font-normal">
                              Compartilhe com cada membro da mesa
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {zapsignSignatarios.map((sig, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900">{sig.nome}</span>
                                    {sig.signed ? (
                                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-emerald-300">
                                        ✓ Assinou
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-amber-700 border-amber-400 text-[10px]"
                                      >
                                        Pendente
                                      </Badge>
                                    )}
                                  </div>
                                  {(sig.email || sig.telefone) && (
                                    <span className="text-[11px] text-slate-500">
                                      {sig.email || ''} {sig.telefone ? `• ${sig.telefone}` : ''}
                                    </span>
                                  )}
                                </div>

                                {sig.sign_url ? (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        navigator.clipboard.writeText(sig.sign_url || '')
                                        toast({
                                          title: 'Link copiado!',
                                          description: `Link de assinatura de ${sig.nome} copiado para a área de transferência.`,
                                        })
                                      }}
                                      className="text-xs h-7 gap-1 border-slate-300"
                                    >
                                      <Copy className="h-3 w-3" /> Copiar Link
                                    </Button>
                                    <a
                                      href={sig.sign_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-medium h-7"
                                    >
                                      <ExternalLink className="h-3 w-3" /> Assinar Agora
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">
                                    Link enviado diretamente por e-mail/WhatsApp
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!zapsignDocToken && zapsignModoAssinatura !== 'manual_impressao' && (
                    <div className="p-3 text-xs text-slate-600 bg-slate-50 rounded-lg border border-slate-200">
                      Clique no botão <strong>"Enviar para assinatura (ZapSign)"</strong> acima para
                      submeter a ata à ZapSign. Se as credenciais estiverem configuradas em{' '}
                      <em>Configurações do Condomínio</em>, os links de assinatura serão gerados
                      imediatamente; caso contrário, o sistema ativa a contingência para assinatura
                      física a caneta.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ETAPA 3: ASSINATURA ELETRÔNICA DA MESA DIRETORA */}
              <Card className="border-slate-300 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-700" /> 3. Assinaturas Eletrônicas da
                    Mesa Diretora
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Conforme o Código Civil e a convenção, a ata deve ser assinada pelo Presidente e
                    pelo(a) Secretário(a).
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    {/* Presidente da Mesa */}
                    <div className="space-y-3 p-4 bg-white rounded-md border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
                            Presidente da Mesa
                          </span>
                          {presidenteHash && !assinaturaDesatualizada ? (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-emerald-300">
                              ✓ Assinado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-700 border-amber-400 text-[10px]"
                            >
                              Pendente
                            </Badge>
                          )}
                        </div>

                        {/* Bloco Compacto Padronizado */}
                        <div className="py-2 text-center">
                          <BlocoAssinaturaCompacto
                            nome={presidenteNome || 'Presidente da Mesa'}
                            cpf={presidenteCpf}
                            cargo="Presidente da Assembleia"
                            formato={presidenteFormato}
                            assinaturaVisual={presidenteAssinaturaVisual}
                            assinaturaTexto={presidenteAssinaturaTexto}
                            larguraLinha="w-56"
                          />
                        </div>

                        {presidenteHash && (
                          <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-200 text-[10px] text-emerald-900 font-mono space-y-0.5">
                            <p className="font-semibold">
                              Assinado em:{' '}
                              {new Date(presidenteAssinadoEm || '').toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </p>
                            <p className="truncate">Hash SHA-256: {presidenteHash}</p>
                          </div>
                        )}
                      </div>

                      <Button
                        type="button"
                        onClick={() => setModalAssinaturaMesa('presidente')}
                        variant={presidenteHash && !assinaturaDesatualizada ? 'outline' : 'default'}
                        className={`w-full text-xs h-8 gap-1.5 ${
                          presidenteHash && !assinaturaDesatualizada
                            ? 'bg-white hover:bg-slate-100 text-slate-700'
                            : 'bg-cyan-700 hover:bg-cyan-800 text-white'
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {presidenteHash ? 'Substituir Assinatura' : 'Assinar como Presidente'}
                      </Button>
                    </div>

                    {/* Secretário(a) da Mesa */}
                    <div className="space-y-3 p-4 bg-white rounded-md border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
                            Secretário(a) da Mesa
                          </span>
                          {secretarioHash && !assinaturaDesatualizada ? (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-emerald-300">
                              ✓ Assinado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-700 border-amber-400 text-[10px]"
                            >
                              Pendente
                            </Badge>
                          )}
                        </div>

                        {/* Bloco Compacto Padronizado */}
                        <div className="py-2 text-center">
                          <BlocoAssinaturaCompacto
                            nome={secretarioNome || 'Secretário(a) da Mesa'}
                            cpf={secretarioCpf}
                            cargo="Secretário(a) da Assembleia"
                            formato={secretarioFormato}
                            assinaturaVisual={secretarioAssinaturaVisual}
                            assinaturaTexto={secretarioAssinaturaTexto}
                            larguraLinha="w-56"
                          />
                        </div>

                        {secretarioHash && (
                          <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-200 text-[10px] text-emerald-900 font-mono space-y-0.5">
                            <p className="font-semibold">
                              Assinado em:{' '}
                              {new Date(secretarioAssinadoEm || '').toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </p>
                            <p className="truncate">Hash SHA-256: {secretarioHash}</p>
                          </div>
                        )}
                      </div>

                      <Button
                        type="button"
                        onClick={() => setModalAssinaturaMesa('secretario')}
                        variant={secretarioHash && !assinaturaDesatualizada ? 'outline' : 'default'}
                        className={`w-full text-xs h-8 gap-1.5 ${
                          secretarioHash && !assinaturaDesatualizada
                            ? 'bg-white hover:bg-slate-100 text-slate-700'
                            : 'bg-cyan-700 hover:bg-cyan-800 text-white'
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {secretarioHash ? 'Substituir Assinatura' : 'Assinar como Secretário(a)'}
                      </Button>
                    </div>
                  </div>

                  {/* Ressalva Jurídica Padronizada */}
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-900 block mb-0.5">
                      Validade Jurídica e ICP-Brasil:
                    </span>
                    As assinaturas eletrônicas apostas neste documento atendem aos requisitos do
                    Código Civil Brasileiro (arts. 1.331 e 1.350) e da Medida Provisória nº
                    2.200-2/2001, possuindo integridade e tempestividade auditáveis mediante carimbo
                    SHA-256 encadeado à urna de votação.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 2: PRÉ-VISUALIZAÇÃO OFICIAL FORMATO A4 */}
            <TabsContent value="previa" className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs text-slate-500">
                  Visualização fidedigna de impressão em folha formato A4 institucional.
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => imprimirOuBaixarPdfAta(dadosPdf)}
                    className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-8 gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimir Documento A4
                  </Button>
                </div>
              </div>

              {/* Folha A4 renderizada */}
              <article className="max-w-[850px] mx-auto bg-white border border-slate-300 shadow-md p-8 sm:p-12 rounded-lg font-serif leading-relaxed text-slate-900">
                {/* Cabeçalho */}
                <header className="border-b-2 border-slate-900 pb-4 mb-6 font-sans">
                  <div className="flex items-center justify-between gap-4">
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt={nomeCondominio}
                        className="h-12 w-12 object-contain"
                      />
                    )}
                    <div className="flex-1 text-center">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-800 block">
                        Ata Notarial e Deliberativa
                      </span>
                      <h1 className="text-lg font-bold text-slate-950 uppercase">
                        {nomeCondominio}
                      </h1>
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Assembleia Geral de Condôminos
                      </p>
                    </div>
                    <div className="text-right text-[11px] font-mono text-slate-600">
                      <span>Emissão:</span>
                      <br />
                      <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
                    </div>
                  </div>
                </header>

                {/* Título */}
                <div className="text-center my-6 p-2 bg-slate-50 border border-slate-200 rounded font-sans">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-950">
                    {tituloAta || 'ATA DA ASSEMBLEIA GERAL'}
                  </h2>
                </div>

                {/* Conteúdo HTML Sanitizado */}
                <div className="text-justify text-xs space-y-3 font-serif leading-relaxed">
                  <SafeHtml
                    content={conteudoHtml || '<p>Ata em elaboração pela mesa diretora.</p>'}
                  />
                </div>

                {/* Caixa Criptográfica Padronizada Koinon */}
                <div className="mt-8 p-4 bg-gradient-to-br from-[#F3F7FC] to-white border border-[#0066FF] rounded-lg text-slate-800 space-y-2.5 font-sans shadow-sm">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <p className="font-bold text-xs uppercase tracking-wider text-[#002B5E] flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-[#0066FF]" />
                      Certificação e Integridade Criptográfica (SHA-256)
                    </p>
                    <span className="text-[10px] font-bold text-[#0066FF] font-mono tracking-wider">
                      ICP-BRASIL / KOINON
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 border border-slate-200 rounded p-2">
                      <span className="block text-[10px] font-bold uppercase text-slate-500">
                        Hash Raiz da Urna
                      </span>
                      <span className="font-mono text-[11px] text-[#002B5E] break-all">
                        {hashRaizUrna ||
                          deliberacaoAtiva.hash_raiz ||
                          'Em consolidação no encerramento'}
                      </span>
                    </div>

                    <div className="bg-white/80 border border-slate-200 rounded p-2">
                      <span className="block text-[10px] font-bold uppercase text-slate-500">
                        Status da Homologação
                      </span>
                      <span className="font-sans text-[11px] font-medium text-[#002B5E]">
                        {hashAta
                          ? 'Ata assinada e selada pela Mesa Diretora'
                          : 'Minuta aguardando assinatura da Mesa'}
                      </span>
                    </div>
                  </div>

                  {hashAta && (
                    <div className="bg-white border border-slate-300 rounded p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#002B5E]">
                        <span>Carimbo SHA-256 da Ata Homologada</span>
                        <span className="font-mono text-slate-500 text-[9px]">256-bit Digest</span>
                      </div>
                      <div className="font-mono text-[11px] text-[#002B5E] break-all bg-slate-50 p-2 rounded border border-slate-200 font-semibold tracking-wide">
                        {hashAta}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Esta ata foi lavrada sob a fé pública da Mesa Diretora eleita, com integridade
                    garantida por assinatura eletrônica e trilha de auditoria digital encadeada.
                  </p>
                </div>

                {/* Bloco de Assinaturas da Mesa */}
                <footer className="mt-10 pt-4 border-t-2 border-slate-900 font-sans">
                  <div className="grid grid-cols-2 gap-8 text-center pt-4">
                    <BlocoAssinaturaCompacto
                      nome={presidenteNome || 'Presidente da Mesa'}
                      cpf={presidenteCpf}
                      cargo="Presidente da Assembleia"
                      formato={presidenteFormato}
                      assinaturaVisual={presidenteAssinaturaVisual}
                      assinaturaTexto={presidenteAssinaturaTexto}
                      larguraLinha="w-60"
                    />

                    <BlocoAssinaturaCompacto
                      nome={secretarioNome || 'Secretário(a) da Mesa'}
                      cpf={secretarioCpf}
                      cargo="Secretário(a) da Assembleia"
                      formato={secretarioFormato}
                      assinaturaVisual={secretarioAssinaturaVisual}
                      assinaturaTexto={secretarioAssinaturaTexto}
                      larguraLinha="w-60"
                    />
                  </div>
                </footer>
              </article>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card className="p-8 text-center border-slate-200">
          <p className="text-xs text-slate-500">Nenhuma assembleia ativa ou cadastrada.</p>
        </Card>
      )}

      {/* MODAL DE ASSINATURA ELETRÔNICA REUTILIZADO */}
      <ModalAssinaturaEletronica
        aberto={modalAssinaturaMesa !== null}
        onOpenChange={(aberto) => !aberto && setModalAssinaturaMesa(null)}
        tituloDocumento={tituloAta || 'Ata da Assembleia Geral'}
        subtitulo={
          modalAssinaturaMesa === 'presidente'
            ? 'Assinatura Oficial do(a) Presidente da Mesa Diretora'
            : 'Assinatura Oficial do(a) Secretário(a) da Mesa Diretora'
        }
        nomeInicial={
          modalAssinaturaMesa === 'presidente'
            ? presidenteNome || deliberacaoAtiva?.mesa_presidente_nome || ''
            : secretarioNome || deliberacaoAtiva?.mesa_secretario_nome || ''
        }
        cpfInicial={
          modalAssinaturaMesa === 'presidente'
            ? formatarCpf(presidenteCpf || deliberacaoAtiva?.mesa_presidente_cpf || '')
            : formatarCpf(secretarioCpf || deliberacaoAtiva?.mesa_secretario_cpf || '')
        }
        cargoInicial={
          modalAssinaturaMesa === 'presidente' ? 'Presidente da Mesa' : 'Secretário(a) da Mesa'
        }
        formatoInicial={
          modalAssinaturaMesa === 'presidente' ? presidenteFormato : secretarioFormato
        }
        assinaturaVisualInicial={
          modalAssinaturaMesa === 'presidente'
            ? presidenteAssinaturaVisual
            : secretarioAssinaturaVisual
        }
        assinaturaTextoInicial={
          modalAssinaturaMesa === 'presidente'
            ? presidenteAssinaturaTexto
            : secretarioAssinaturaTexto
        }
        onConfirmar={handleConfirmarAssinaturaMesa}
        salvando={salvandoAssinatura}
        permitirEditarIdentificacao={true}
        permitirDataHoraHistorica={true}
        dataHoraInicial={
          modalAssinaturaMesa === 'presidente'
            ? presidenteAssinadoEm || undefined
            : secretarioAssinadoEm || undefined
        }
      />

      {/* MODAL CONFIRMAÇÃO PARA CANCELAR E DESCARTAR GRAVAÇÃO DE ÁUDIO */}
      <Dialog
        open={modalConfirmarCancelarGravacao}
        onOpenChange={(open) => {
          // Se fechar o diálogo pelo backdrop ou ESC, apenas mantém gravando normalmente
          setModalConfirmarCancelarGravacao(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              Descartar gravação em andamento?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-1 leading-relaxed">
              Deseja descartar a gravação de {formatarTempo(tempoGravacaoSegundos)}? O áudio
              capturado será permanentemente eliminado e não poderá ser recuperado para transcrição.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalConfirmarCancelarGravacao(false)}
              className="text-xs min-h-[40px] px-3.5"
            >
              Continuar gravando
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmarDescarteGravacao}
              className="bg-red-600 hover:bg-red-700 text-white text-xs min-h-[40px] px-3.5 font-medium"
            >
              Descartar áudio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAÇÃO PARA REGENERAR ATA POR IA */}
      <Dialog open={modalConfirmarRegeneracao} onOpenChange={setModalConfirmarRegeneracao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Confirmar Regeneração por IA
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-1">
              Já existe um texto editado na ata. Uma nova rodada da IA substituirá o texto atual e
              invalidará as assinaturas prévias da mesa. Deseja prosseguir?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalConfirmarRegeneracao(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleGerarAtaIa}
              className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs"
            >
              Sim, Gerar Nova Versão com IA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAÇÃO DE PUBLICAÇÃO AOS MORADORES */}
      <Dialog open={modalPublicarAberto} onOpenChange={setModalPublicarAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-700" /> Publicar Ata aos Condôminos
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-1">
              Ao publicar, a ata torna-se imediatamente disponível para leitura de todos os
              condôminos na área do morador.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enviarEmailNotif"
                checked={enviarEmailPublicacao}
                onChange={(e) => setEnviarEmailPublicacao(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <Label
                htmlFor="enviarEmailNotif"
                className="text-xs text-slate-700 font-medium cursor-pointer"
              >
                Disparar comunicado por e-mail a todos os condôminos credenciados
              </Label>
            </div>

            {(!presidenteHash || !secretarioHash) && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
                Aviso: A ata ainda não possui ambas as assinaturas da mesa (Presidente e
                Secretário). Recomendamos apor as assinaturas antes de publicar.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalPublicarAberto(false)}
              disabled={publicandoAta}
              className="text-xs"
            >
              Voltar
            </Button>
            <Button
              size="sm"
              onClick={handlePublicarAta}
              disabled={publicandoAta}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5"
            >
              {publicandoAta ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Publicando...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Confirmar e Publicar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE SUCESSO ZAPSIGN COM LINKS */}
      <Dialog open={modalZapsignAberto} onOpenChange={setModalZapsignAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-[#0066FF]" /> Documento Criado na ZapSign
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-1">
              A ata foi submetida para assinatura eletrônica. Compartilhe os links individuais
              abaixo com cada membro da mesa diretora.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {zapsignDocToken && (
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Token ZapSign
                </span>
                <span className="font-mono text-[11px] text-[#002B5E] break-all">
                  {zapsignDocToken}
                </span>
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {zapsignSignatarios?.map((sig, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-slate-200 rounded-lg bg-white space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{sig.nome}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {sig.signed ? '✓ Assinado' : 'Pendente'}
                    </Badge>
                  </div>
                  {sig.sign_url && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        readOnly
                        value={sig.sign_url}
                        className="w-full text-[11px] font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 select-all"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(sig.sign_url || '')
                          toast({
                            title: 'Copiado!',
                            description: `Link de ${sig.nome} copiado.`,
                          })
                        }}
                        className="text-xs h-7 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <a
                        href={sig.sign_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] bg-[#0066FF] hover:bg-[#0052cc] text-white rounded px-2.5 py-1 font-medium h-7 shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" /> Abrir
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500">
              Assim que todos assinarem, o webhook da ZapSign atualizará a ata automaticamente com o
              carimbo de data/hora e o hash SHA-256 do PDF final.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setModalZapsignAberto(false)}
              className="bg-[#002B5E] text-white text-xs"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AtaAssembleiaPage

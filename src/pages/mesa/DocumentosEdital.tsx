import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  api,
  type DeliberacaoRecord,
  type ItemPautaRecord,
  type DocumentoPautaRecord,
  type NotificacaoRecord,
  type TipoDocumentoPauta,
  type CargoCandidato,
  type EditalDeliberacaoRecord,
  type FormatoAssinatura,
} from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { useAuth } from '@/context/AuthContext'
import { formatarCpf, validarCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
import { imprimirOuBaixarPdfEdital, type DadosEditalPdf } from '@/lib/pdfEdital'
import { gerarPdfEditalComHash, type ProvaEditalPdf } from '@/lib/pdf/gerarPdfEditalBytes'
import {
  decidirSelo,
  validarInstrucoesEdital,
  type InstrucoesAcessoVotacao,
} from '@/lib/selo/honestidade'
import { MARCA_VALIDACAO_ADVOGADO, gerarClausulaAceite } from '@/lib/organizacao/config'
import { BlocoAssinaturaCompacto } from '@/components/assinatura/BlocoAssinaturaCompacto'
import { SeloAssinaturaCriptografica } from '@/components/assinatura/SeloAssinaturaCriptografica'
import { ModalAssinaturaEletronica } from '@/components/assinatura/ModalAssinaturaEletronica'
import { ModalZapsignLinks } from '@/components/assinatura/ModalZapsignLinks'
import type { ZapSignSignatarioUrl } from '@/lib/api'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { FileSignature } from 'lucide-react'
import { CardInstrucoesAcesso } from '@/pages/mesa/documentos/CardInstrucoesAcesso'
import { ProvasEnvio } from '@/pages/mesa/documentos/ProvasEnvio'
import { ClausulaAceite } from '@/pages/mesa/documentos/ClausulaAceite'
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
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { SafeHtml } from '@/components/editor/SafeHtml'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
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
  UploadCloud,
  Send,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  FileSpreadsheet,
  Printer,
  Save,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react'

export const DocumentosEditalPage: React.FC = () => {
  const navigate = useNavigate()
  const { nomeCondominio, logoUrl } = useCondoConfig()
  const { user } = useAuth()

  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [itensPauta, setItensPauta] = useState<ItemPautaRecord[]>([])
  const [documentos, setDocumentos] = useState<DocumentoPautaRecord[]>([])
  const [notificacoes, setNotificacoes] = useState<NotificacaoRecord[]>([])
  const [carregando, setCarregando] = useState(true)

  // Registro do banco correspondente ao edital
  const [editalDbId, setEditalDbId] = useState<string | null>(null)

  // Estado do Edital - Totalmente Editável
  const [editalForm, setEditalForm] = useState({
    titulo: '',
    subtitulo: 'Convocação Formal aos Senhores Condôminos e Moradores',
    textoAbertura: '',
    primeiraConvocacao: '19:00',
    segundaConvocacao: '19:30',
    dataAssembleia: '',
    localTexto: 'Salão de Festas do Condomínio / Plataforma Virtual Koinon',
    ordemDiaCustom: '',
    disposicoesGerais:
      'Os condôminos poderão votar presencialmente ou por meio da Plataforma Virtual Koinon. É admitida representação por procuração com firma reconhecida ou assinatura eletrônica idônea.',
    regrasParticipacao: '',
    sindicoNome: '',
    sindicoCpf: '',
    cargoConvocante: 'Síndico(a) / Representante Legal',
  })

  const [sindicoCpfErro, setSindicoCpfErro] = useState<string | null>(null)
  const [salvandoEdital, setSalvandoEdital] = useState(false)
  const [assinandoEdital, setAssinandoEdital] = useState(false)
  const [disparandoEmails, setDisparandoEmails] = useState(false)

  // Integração ZapSign (mesmo padrão da ata)
  const [zapsignStatus, setZapsignStatus] = useState<string>('')
  const [zapsignDocToken, setZapsignDocToken] = useState<string | null>(null)
  const [zapsignSignatarios, setZapsignSignatarios] = useState<ZapSignSignatarioUrl[] | null>(null)
  const [zapsignEnviando, setZapsignEnviando] = useState(false)
  const [zapsignMotivo, setZapsignMotivo] = useState<string | null>(null)
  const [modalZapsignAberto, setModalZapsignAberto] = useState(false)
  const [modalAssinaturaAberto, setModalAssinaturaAberto] = useState(false)

  // Estado do Autosave
  const [autosaveStatus, setAutosaveStatus] = useState<
    'idle' | 'pending' | 'saving' | 'saved' | 'error'
  >('idle')
  const [ultimoSalvoHora, setUltimoSalvoHora] = useState<string | null>(null)

  // Assinatura e Snapshot Criptográfico
  const [editalAssinadoHash, setEditalAssinadoHash] = useState<string | null>(null)
  const [editalAssinadoData, setEditalAssinadoData] = useState<string | null>(null)
  const [snapshotAssinado, setSnapshotAssinado] = useState<string | null>(null)
  const [formatoAssinatura, setFormatoAssinatura] = useState<FormatoAssinatura>('desenho')
  const [assinaturaVisual, setAssinaturaVisual] = useState<string | undefined>(undefined)
  const [assinaturaTexto, setAssinaturaTexto] = useState<string | undefined>(undefined)

  // Modal Upload de Documento da Pauta
  const [modalUploadAberto, setModalUploadAberto] = useState(false)
  const [tipoDoc, setTipoDoc] = useState<TipoDocumentoPauta>('prestacao_contas')
  const [tituloDoc, setTituloDoc] = useState('')
  const [descricaoDoc, setDescricaoDoc] = useState('')
  const [cargoCandidato, setCargoCandidato] = useState<CargoCandidato>('sindico')
  const [nomeCandidato, setNomeCandidato] = useState('')
  const [arquivoFile, setArquivoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Item 1 — data declarada pelo signatário (distinta do registro técnico da plataforma)
  const [dataDeclaradaSignatario, setDataDeclaradaSignatario] = useState<string | null>(null)

  // Item 2 — Instruções de Acesso e Votação Eletrônica (8 campos, persistidos em configuracoes)
  const [instrucoesAcesso, setInstrucoesAcesso] = useState<InstrucoesAcessoVotacao | null>(null)
  const [salvandoInstrucoes, setSalvandoInstrucoes] = useState(false)
  const [configuracaoId, setConfiguracaoId] = useState<string | null>(null)

  // Item 5 — Cláusula de aceite registrada na configuração
  const [clausulaAceiteTexto, setClausulaAceiteTexto] = useState<string | null>(null)
  const [clausulaAceiteVersao, setClausulaAceiteVersao] = useState<string | null>(null)
  const [clausulaAceiteStatus, setClausulaAceiteStatus] = useState<string | null>(null)

  // Refs de controle para isolar debounce, corrida e bloqueio de transição/modal
  const editalFormRef = useRef(editalForm)
  editalFormRef.current = editalForm

  const deliberacaoAtivaRef = useRef(deliberacaoAtiva)
  deliberacaoAtivaRef.current = deliberacaoAtiva

  const editalDbIdRef = useRef(editalDbId)
  editalDbIdRef.current = editalDbId

  const editalAssinadoHashRef = useRef(editalAssinadoHash)
  editalAssinadoHashRef.current = editalAssinadoHash

  const editalAssinadoDataRef = useRef(editalAssinadoData)
  editalAssinadoDataRef.current = editalAssinadoData

  const snapshotAssinadoRef = useRef(snapshotAssinado)
  snapshotAssinadoRef.current = snapshotAssinado

  const isCarregandoRef = useRef(true)

  const modalUploadAbertoRef = useRef(modalUploadAberto)
  modalUploadAbertoRef.current = modalUploadAberto

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  const needsResaveRef = useRef(false)

  // Snapshot normalizado para detecção precisa de alteração
  const gerarSnapshotDeEstado = useCallback((form: typeof editalForm, itens: ItemPautaRecord[]) => {
    return JSON.stringify({
      titulo: form.titulo,
      subtitulo: form.subtitulo,
      textoAbertura: form.textoAbertura,
      dataAssembleia: form.dataAssembleia,
      primeiraConvocacao: form.primeiraConvocacao,
      segundaConvocacao: form.segundaConvocacao,
      localTexto: form.localTexto,
      ordemDiaCustom: form.ordemDiaCustom,
      disposicoesGerais: form.disposicoesGerais,
      regrasParticipacao: form.regrasParticipacao,
      sindicoNome: form.sindicoNome.trim(),
      sindicoCpf: form.sindicoCpf.replace(/\D/g, ''),
      cargoConvocante: form.cargoConvocante,
      pautaPadrao: itens.map((it) => `${it.ordem}. ${it.titulo}: ${it.texto || ''}`).join('; '),
    })
  }, [])

  // Snapshot Atual do Conteúdo para Comparação
  const snapshotAtual = useMemo(() => {
    return gerarSnapshotDeEstado(editalForm, itensPauta)
  }, [editalForm, itensPauta, gerarSnapshotDeEstado])

  // Checar se o edital foi modificado após ter sido assinado
  const hashDesatualizado = useMemo(() => {
    if (!editalAssinadoHash) return false
    if (!snapshotAssinado) return false
    return snapshotAtual !== snapshotAssinado
  }, [editalAssinadoHash, snapshotAssinado, snapshotAtual])

  const hashDesatualizadoRef = useRef(hashDesatualizado)
  hashDesatualizadoRef.current = hashDesatualizado

  // Carregar dados
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
        : delibs.find((d) => d.status !== 'PUBLICADA' && d.status !== 'ENCERRADA') || delibs[0]

      setDeliberacaoAtiva(delibAtual || null)

      if (delibAtual) {
        const [itens, docs, notifs, assinaturas, editalSalvo] = await Promise.all([
          api.getItensPauta(delibAtual.id),
          api.getDocumentosPauta(delibAtual.id),
          api.getNotificacoes(delibAtual.id),
          api.getAssinaturasPorDeliberacao(delibAtual.id),
          api.getEditalPorDeliberacao(delibAtual.id).catch(() => null),
        ])
        setItensPauta(itens)
        setDocumentos(docs)
        setNotificacoes(notifs)

        // Itens 2 e 5 — carregar instruções de acesso e cláusula de aceite da configuração
        try {
          const cfg = await api.getConfiguracao()
          if (cfg) {
            setConfiguracaoId(cfg.id)
            const ia = (cfg as Record<string, unknown>).instrucoes_acesso
            if (typeof ia === 'string' && ia.trim()) {
              try {
                setInstrucoesAcesso(JSON.parse(ia) as InstrucoesAcessoVotacao)
              } catch {
                setInstrucoesAcesso(null)
              }
            } else {
              setInstrucoesAcesso(null)
            }
            setClausulaAceiteTexto(
              ((cfg as Record<string, unknown>).clausula_aceite_texto as string) || null,
            )
            setClausulaAceiteVersao(
              ((cfg as Record<string, unknown>).clausula_aceite_versao as string) || null,
            )
            setClausulaAceiteStatus(
              ((cfg as Record<string, unknown>).clausula_aceite_status as string) || null,
            )
          }
        } catch (errCfg) {
          console.warn('Configuração da organização indisponível para instruções/cláusula:', errCfg)
        }

        const defaultTextoAbertura = `O Síndico e a Mesa Diretora do ${nomeCondominio}, no uso de suas atribuições legais conferidas pelo Código Civil Brasileiro (Lei nº 10.406/2002, art. 1.350) e pela Convenção Condominial, vêm por meio deste CONVOCAR todos os senhores condôminos titulares de unidades autônomas a se reunirem em Assembleia Geral, que será realizada sob as seguintes condições:`

        const defaultRegras = `• Quórum de aprovação por matéria: ${delibAtual.quorum_materia || 'Maioria simples'}.\n• Voto de condômino inadimplente: ${delibAtual.inadimplente_pode_votar ? 'Permitido' : 'Vedado'} (conforme convenção).\n• Voto de locatário: ${delibAtual.locatario_pode_votar ? 'Permitido' : 'Vedado'}.\n• Modalidade de voto: ${delibAtual.tipo_cedula === 'secreta' ? 'Cédula Secreta com criptografia SHA-256' : 'Votação Aberta Nominal'}.`

        // Checar assinatura prévia gravada
        const assEdital = assinaturas.find(
          (a) => a.documento_tipo === 'edital' && a.status === 'valida',
        )

        if (editalSalvo) {
          // Edital salvo existente no banco
          setEditalDbId(editalSalvo.id)
          setEditalForm({
            titulo: editalSalvo.titulo || delibAtual.titulo,
            subtitulo:
              editalSalvo.subtitulo || 'Convocação Formal aos Senhores Condôminos e Moradores',
            textoAbertura: editalSalvo.texto_abertura || defaultTextoAbertura,
            dataAssembleia: editalSalvo.data_assembleia || '',
            primeiraConvocacao: editalSalvo.primeira_convocacao || '19:00',
            segundaConvocacao: editalSalvo.segunda_convocacao || '19:30',
            localTexto:
              editalSalvo.local_texto ||
              'Salão de Festas do Condomínio / Plataforma Virtual Koinon',
            ordemDiaCustom: editalSalvo.ordem_dia_custom || '',
            disposicoesGerais:
              editalSalvo.disposicoes_gerais ||
              'Os condôminos poderão votar presencialmente ou por meio da Plataforma Virtual Koinon. É admitida representação por procuração com firma reconhecida ou assinatura eletrônica idônea.',
            regrasParticipacao: editalSalvo.regras_participacao || defaultRegras,
            sindicoNome:
              editalSalvo.sindico_nome ||
              assEdital?.assinante_nome ||
              delibAtual.mesa_presidente_nome ||
              '',
            sindicoCpf: formatarCpf(
              editalSalvo.sindico_cpf ||
                assEdital?.assinante_cpf ||
                delibAtual.mesa_presidente_cpf ||
                '',
            ),
            cargoConvocante:
              editalSalvo.cargo_convocante || `Representante Legal do ${nomeCondominio}`,
          })

          const hash = editalSalvo.hash_assinado || assEdital?.hash_documento || null
          setEditalAssinadoHash(hash)

          // Restaurar estado ZapSign persistido no registro do edital
          setZapsignStatus(editalSalvo.zapsign_status || '')
          setZapsignDocToken(editalSalvo.zapsign_documento_token || null)
          setZapsignSignatarios(
            (editalSalvo.zapsign_urls as ZapSignSignatarioUrl[] | undefined) || null,
          )
          setZapsignMotivo(editalSalvo.zapsign_motivo_erro || null)
          setEditalAssinadoData(
            editalSalvo.data_assinatura || assEdital?.data_hora || assEdital?.created || null,
          )
          setSnapshotAssinado(editalSalvo.conteudo_assinado_snapshot || null)
          setFormatoAssinatura(
            editalSalvo.formato_assinatura || assEdital?.formato_assinatura || 'desenho',
          )
          setAssinaturaVisual(
            editalSalvo.assinatura_visual || assEdital?.assinatura_visual || undefined,
          )
          setAssinaturaTexto(
            editalSalvo.assinatura_texto || assEdital?.assinatura_texto || undefined,
          )
        } else {
          // Nenhum edital salvo previamente: inicializar com padrões inteligentes
          setEditalDbId(null)
          setZapsignStatus('')
          setZapsignDocToken(null)
          setZapsignSignatarios(null)
          setZapsignMotivo(null)
          setEditalForm({
            titulo: delibAtual.titulo,
            subtitulo: 'Convocação Formal aos Senhores Condôminos e Moradores',
            textoAbertura: defaultTextoAbertura,
            dataAssembleia: '',
            primeiraConvocacao: '19:00',
            segundaConvocacao: '19:30',
            localTexto: 'Salão de Festas do Condomínio / Plataforma Virtual Koinon',
            ordemDiaCustom: '',
            disposicoesGerais:
              'Os condôminos poderão votar presencialmente ou por meio da Plataforma Virtual Koinon. É admitida representação por procuração com firma reconhecida ou assinatura eletrônica idônea.',
            regrasParticipacao: defaultRegras,
            sindicoNome: assEdital?.assinante_nome || delibAtual.mesa_presidente_nome || '',
            sindicoCpf: formatarCpf(
              assEdital?.assinante_cpf || delibAtual.mesa_presidente_cpf || '',
            ),
            cargoConvocante: `Representante Legal do ${nomeCondominio}`,
          })

          if (assEdital) {
            setEditalAssinadoHash(assEdital.hash_documento)
            setEditalAssinadoData(assEdital.data_hora || assEdital.created)
            setFormatoAssinatura(assEdital.formato_assinatura || 'desenho')
            setAssinaturaVisual(assEdital.assinatura_visual || undefined)
            setAssinaturaTexto(assEdital.assinatura_texto || undefined)
          } else {
            setEditalAssinadoHash(null)
            setEditalAssinadoData(null)
            setSnapshotAssinado(null)
            setFormatoAssinatura('desenho')
            setAssinaturaVisual(undefined)
            setAssinaturaTexto(undefined)
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados de documentos & edital:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
      // Pequeno atraso para liberar flag de carregando pós-render inicial
      setTimeout(() => {
        isCarregandoRef.current = false
      }, 100)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Gerar Hash SHA-256 no browser via crypto.subtle
  const calcularSha256Browser = async (texto: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(texto)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Execução unificada de persistência do rascunho com sanitização completa
  const persistirRascunhoNoBanco = useCallback(
    async (isAutosave = false) => {
      const delib = deliberacaoAtivaRef.current
      if (!delib) return null

      // Bloquear se outro salvamento estiver em voo; sinalizar remarcação para evitar perder mudanças
      if (isSavingRef.current) {
        needsResaveRef.current = true
        return null
      }

      isSavingRef.current = true
      if (!isAutosave) {
        setSalvandoEdital(true)
      } else {
        setAutosaveStatus('saving')
      }

      try {
        const currentForm = editalFormRef.current
        const rawCpf = currentForm.sindicoCpf.replace(/\D/g, '')

        // Sanitização idêntica para campos ricos e formatação de texto simples
        const textoAberturaSanitizado = sanitizeHtml(currentForm.textoAbertura).trim()
        const ordemDiaSanitizado = sanitizeHtml(currentForm.ordemDiaCustom).trim()
        const disposicoesSanitizado = sanitizeHtml(currentForm.disposicoesGerais).trim()
        const regrasSanitizado = sanitizeHtml(currentForm.regrasParticipacao).trim()

        const assinadoValido = editalAssinadoHashRef.current && !hashDesatualizadoRef.current

        const payload: Partial<EditalDeliberacaoRecord> = {
          titulo: currentForm.titulo.trim() || delib.titulo,
          subtitulo: currentForm.subtitulo.trim(),
          texto_abertura: textoAberturaSanitizado,
          data_assembleia: currentForm.dataAssembleia.trim(),
          primeira_convocacao: currentForm.primeiraConvocacao.trim(),
          segunda_convocacao: currentForm.segundaConvocacao.trim(),
          local_texto: currentForm.localTexto.trim(),
          ordem_dia_custom: ordemDiaSanitizado,
          disposicoes_gerais: disposicoesSanitizado,
          regras_participacao: regrasSanitizado,
          sindico_nome: currentForm.sindicoNome.trim(),
          sindico_cpf: rawCpf,
          cargo_convocante: currentForm.cargoConvocante.trim(),
          status: assinadoValido ? 'assinado' : 'rascunho',
          hash_assinado: assinadoValido ? editalAssinadoHashRef.current || '' : '',
          data_assinatura: editalAssinadoDataRef.current || undefined,
          conteudo_assinado_snapshot: snapshotAssinadoRef.current || undefined,
        }

        const salvo = await api.salvarEditalDeliberacao(
          delib.id,
          payload,
          editalDbIdRef.current || undefined,
        )
        setEditalDbId(salvo.id)
        editalDbIdRef.current = salvo.id

        // Registrar auditoria apenas em salvamentos manuais explícitos para não poluir a trilha a cada tecla
        if (!isAutosave) {
          await api.registrarEventoAuditoria({
            evento: 'configuracao_atualizada',
            fator: `Mesa: salvamento do Edital (Rascunho) da deliberação ${delib.id} por ${user?.name || 'Mesa'}`,
            dispositivo: navigator.userAgent,
          })
        }

        const agora = new Date()
        const hh = String(agora.getHours()).padStart(2, '0')
        const mm = String(agora.getMinutes()).padStart(2, '0')
        const horaFormatada = `${hh}:${mm}`
        setUltimoSalvoHora(horaFormatada)
        setAutosaveStatus('saved')

        return salvo
      } catch (err: any) {
        console.error('Erro ao salvar rascunho do edital:', err)
        setAutosaveStatus('error')
        toast({
          title: isAutosave ? 'Falha no salvamento automático' : 'Erro ao salvar edital',
          description:
            err?.message ||
            'Não foi possível salvar as alterações no servidor. Verifique a conexão.',
          variant: 'destructive',
        })
        throw err
      } finally {
        isSavingRef.current = false
        if (!isAutosave) {
          setSalvandoEdital(false)
        }

        // Se houve edição enquanto o salvamento estava em voo, reagendar imediatamente
        if (needsResaveRef.current) {
          needsResaveRef.current = false
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = setTimeout(() => {
            persistirRascunhoNoBanco(true).catch(() => {})
          }, 1500)
        }
      }
    },
    [user],
  )

  // Ação: Salvar Rascunho Manual Imediato (cancela debounce pendente)
  const handleSalvarRascunho = async (silencioso = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    try {
      const salvo = await persistirRascunhoNoBanco(false)
      if (!silencioso) {
        toast({
          title: 'Edital salvo com sucesso',
          description: 'Todas as alterações de texto e parâmetros foram persistidas no banco.',
        })
      }
      return salvo
    } catch {
      /* Erro já exibido pelo persistirRascunhoNoBanco */
    }
  }

  // Notificador de alteração com debounce de 2.2 segundos para autosave
  const notificarAlteracaoEdital = useCallback(
    (novoForm: typeof editalForm) => {
      setEditalForm(novoForm)

      // Não disparar autosave durante carregamento inicial ou quando modal de upload/mesa estiver aberto
      if (isCarregandoRef.current || modalUploadAbertoRef.current) {
        return
      }

      // Reiniciar timer a cada digitação contínua
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      setAutosaveStatus('pending')

      debounceTimerRef.current = setTimeout(() => {
        // Se modal abriu durante a espera do debounce, suspender
        if (modalUploadAbertoRef.current) {
          return
        }
        persistirRascunhoNoBanco(true).catch(() => {})
      }, 2200)
    },
    [persistirRascunhoNoBanco],
  )

  // Limpeza do timer ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Troca de deliberação no seletor: salvar imediatamente antes de carregar nova
  const handleTrocarDeliberacao = async (novaDelibId: string) => {
    if (novaDelibId === deliberacaoAtiva?.id) return

    // Se houver debounce pendente ou status pending, salvar antes de transicionar
    if (debounceTimerRef.current || autosaveStatus === 'pending') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      try {
        await persistirRascunhoNoBanco(true)
      } catch {
        /* falha mantida na tela via toast */
      }
    }

    const encontrada = deliberacoes.find((d) => d.id === novaDelibId)
    if (encontrada) {
      carregarDados(encontrada.id)
    }
  }

  // Ação: Abrir modal de assinatura com opções gráficas (tela, texto, em branco)
  const handleAbrirModalAssinatura = () => {
    if (!deliberacaoAtiva) return
    setModalAssinaturaAberto(true)
  }

  // Ação executada pelo modal após escolher modo e confirmar
  const handleConfirmarAssinaturaComModo = async (dadosAssinatura: {
    nome: string
    cpf: string
    cargo?: string
    formato: FormatoAssinatura
    assinaturaVisual?: string
    assinaturaTexto?: string
    dataHoraAssinatura?: string
  }) => {
    if (!deliberacaoAtiva) return

    setAssinandoEdital(true)
    try {
      // Momento técnico da operação no sistema
      const momentoTecnicoIso = new Date().toISOString()
      // Data declarada da assinatura (histórica ou momento presente se omitida)
      const dataAssinaturaIso = dadosAssinatura.dataHoraAssinatura || momentoTecnicoIso
      const rawCpf = dadosAssinatura.cpf.replace(/\D/g, '')

      // Atualizar estado do form com os dados confirmados
      const formAtualizado = {
        ...editalForm,
        sindicoNome: dadosAssinatura.nome,
        sindicoCpf: formatarCpf(rawCpf),
        cargoConvocante: dadosAssinatura.cargo || editalForm.cargoConvocante,
      }
      setEditalForm(formAtualizado)

      // Conteúdo estrito a ser carimbado incluindo dados, data declarada e modo da assinatura
      const conteudoEdital = JSON.stringify({
        condominio: nomeCondominio,
        deliberacaoId: deliberacaoAtiva.id,
        titulo: formAtualizado.titulo.trim() || deliberacaoAtiva.titulo,
        subtitulo: formAtualizado.subtitulo.trim(),
        textoAbertura: formAtualizado.textoAbertura.trim(),
        dataAssembleia: formAtualizado.dataAssembleia.trim(),
        primeiraConvocacao: formAtualizado.primeiraConvocacao.trim(),
        segundaConvocacao: formAtualizado.segundaConvocacao.trim(),
        local: formAtualizado.localTexto.trim(),
        ordemDiaCustom: formAtualizado.ordemDiaCustom.trim(),
        pauta: itensPauta.map((it) => `${it.ordem}. ${it.titulo}`),
        disposicoes: formAtualizado.disposicoesGerais.trim(),
        regras: formAtualizado.regrasParticipacao.trim(),
        sindicoNome: dadosAssinatura.nome,
        sindicoCpf: rawCpf,
        cargo: dadosAssinatura.cargo || formAtualizado.cargoConvocante.trim(),
        formatoAssinatura: dadosAssinatura.formato,
        momentoAssinatura: dataAssinaturaIso,
      })

      const hash = await calcularSha256Browser(conteudoEdital)

      // 1. Gravar registro oficial na collection assinaturas_documento com imagem/texto
      await api.registrarAssinaturaDocumento({
        documento_id: `edital_${deliberacaoAtiva.id}`,
        documento_tipo: 'edital',
        deliberacao: deliberacaoAtiva.id,
        assinante_nome: dadosAssinatura.nome,
        assinante_cpf: rawCpf,
        tipo: 'sindico',
        hash_documento: hash,
        data_hora: dataAssinaturaIso,
        usuario: user?.id,
        ip_dispositivo: navigator.userAgent,
        formato_assinatura: dadosAssinatura.formato,
        assinatura_visual: dadosAssinatura.assinaturaVisual,
        assinatura_texto: dadosAssinatura.assinaturaTexto,
      })

      // 2. Persistir na collection editais_deliberacao com snapshot e dados gráficos
      const novoSnapshot = gerarSnapshotDeEstado(formAtualizado, itensPauta)
      const salvo = await api.salvarEditalDeliberacao(
        deliberacaoAtiva.id,
        {
          titulo: formAtualizado.titulo.trim() || deliberacaoAtiva.titulo,
          subtitulo: formAtualizado.subtitulo.trim(),
          texto_abertura: formAtualizado.textoAbertura.trim(),
          data_assembleia: formAtualizado.dataAssembleia.trim(),
          primeira_convocacao: formAtualizado.primeiraConvocacao.trim(),
          segunda_convocacao: formAtualizado.segundaConvocacao.trim(),
          local_texto: formAtualizado.localTexto.trim(),
          ordem_dia_custom: formAtualizado.ordemDiaCustom.trim(),
          disposicoes_gerais: formAtualizado.disposicoesGerais.trim(),
          regras_participacao: formAtualizado.regrasParticipacao.trim(),
          sindico_nome: dadosAssinatura.nome,
          sindico_cpf: rawCpf,
          cargo_convocante: dadosAssinatura.cargo || formAtualizado.cargoConvocante.trim(),
          status: 'assinado',
          hash_assinado: hash,
          data_assinatura: dataAssinaturaIso,
          conteudo_assinado_snapshot: novoSnapshot,
          formato_assinatura: dadosAssinatura.formato,
          assinatura_visual: dadosAssinatura.assinaturaVisual,
          assinatura_texto: dadosAssinatura.assinaturaTexto,
        },
        editalDbId || undefined,
      )

      setEditalDbId(salvo.id)
      setEditalAssinadoHash(hash)
      setEditalAssinadoData(dataAssinaturaIso)
      // Item 1: data declarada pelo signatário no modal (pode ser histórica)
      setDataDeclaradaSignatario(dadosAssinatura.dataHoraAssinatura || dataAssinaturaIso)
      setSnapshotAssinado(novoSnapshot)
      setFormatoAssinatura(dadosAssinatura.formato)
      setAssinaturaVisual(dadosAssinatura.assinaturaVisual)
      setAssinaturaTexto(dadosAssinatura.assinaturaTexto)

      // 3. Registrar na trilha de auditoria encadeada mantendo data declarada e momento técnico
      const dataDeclaradaFmt = new Date(dataAssinaturaIso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      const momentoTecnicoFmt = new Date(momentoTecnicoIso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      const fatorAuditoria = dadosAssinatura.dataHoraAssinatura
        ? `Convocante: ${dadosAssinatura.nome} assinou eletronicamente o Edital (${dadosAssinatura.formato}) da deliberação ${deliberacaoAtiva.id} com Data Declarada de Assinatura: ${dataDeclaradaFmt} (Registro técnico na plataforma: ${momentoTecnicoFmt}, Hash: ${hash.substring(0, 16)}...)`
        : `Convocante: ${dadosAssinatura.nome} assinou eletronicamente o Edital (${dadosAssinatura.formato}) da deliberação ${deliberacaoAtiva.id} (Hash: ${hash.substring(0, 16)}...)`

      await api.registrarEventoAuditoria({
        evento: 'assinatura_registrada',
        fator: fatorAuditoria,
        dispositivo: navigator.userAgent,
      })

      setModalAssinaturaAberto(false)

      toast({
        title: 'Edital assinado eletronicamente',
        description: `Modo: ${dadosAssinatura.formato === 'desenho' ? 'Tela desenhada' : dadosAssinatura.formato === 'texto' ? 'Nome digitado' : 'Em branco'}. Hash: ${hash.substring(0, 16)}...`,
      })
    } catch (err: any) {
      const isRede =
        !err?.status ||
        err?.status === 0 ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError')
      const msg = isRede
        ? 'Falha de conexão com o servidor. O traço da sua assinatura foi preservado — clique em "Confirmar e Assinar" novamente.'
        : err?.message || 'Falha ao registrar assinatura eletrônica.'
      toast({
        title: 'Falha ao registrar assinatura',
        description: msg,
        variant: 'destructive',
      })
      throw err // Repassar para que o ModalAssinaturaEletronica exiba o aviso e mantenha o modal aberto sem descartar o desenho
    } finally {
      setAssinandoEdital(false)
    }
  }

  // Ação: Publicar edital e notificar moradores por e-mail
  const handlePublicarENotificar = async () => {
    if (!deliberacaoAtiva) return
    if (!editalAssinadoHash || hashDesatualizado) {
      toast({
        title: 'Edital requer assinatura válida',
        description: hashDesatualizado
          ? 'O conteúdo do edital foi modificado após a assinatura. Atualize a assinatura eletrônica antes de notificar.'
          : 'É necessário gerar a assinatura eletrônica do convocante antes do disparo aos moradores.',
        variant: 'destructive',
      })
      return
    }

    // Item 2 — bloqueio: instruções de acesso e votação eletrônica incompletas
    const faltantesInstrucoes = validarInstrucoesEdital(instrucoesAcesso)
    if (faltantesInstrucoes.length > 0) {
      toast({
        title: 'Emissão bloqueada — instruções incompletas',
        description: `Preencha os 8 campos de Instruções de Acesso e Votação Eletrônica. Faltando: ${faltantesInstrucoes.join('; ')}.`,
        variant: 'destructive',
        duration: 8000,
      })
      return
    }

    if (
      !confirm(
        `Confirma o envio do Edital de Convocação por e-mail para todos os moradores ativos cadastrados no ${nomeCondominio}?`,
      )
    ) {
      return
    }

    setDisparandoEmails(true)
    try {
      const resumoPauta =
        editalForm.ordemDiaCustom.trim() ||
        itensPauta.map((it) => `${it.ordem}. ${it.titulo}`).join('\n')

      // Item 3 — gerar o PDF assinado em bytes, calcular SHA-256 e anexar ao disparo
      let pdfBase64: string | undefined
      let pdfNome: string | undefined
      let hashDocumento: string | undefined
      try {
        // Via natural (não ZapSign): o anexo do disparo por e-mail mantém o bloco
        // de certificação nativo quando o edital já está assinado.
        const prova: ProvaEditalPdf = await gerarPdfEditalComHash({
          ...dadosParaPdf,
          viaZapsign: false,
        })
        pdfBase64 = prova.pdfBase64
        pdfNome = prova.nomeArquivo
        hashDocumento = prova.hashSha256
      } catch (errPdf) {
        console.error('Falha ao gerar PDF em bytes para anexo:', errPdf)
        toast({
          title: 'PDF não pôde ser anexado',
          description:
            'O disparo continuará sem anexo. Verifique o console para detalhes do erro de geração.',
        })
      }

      const resp = await api.dispararEditalConvocacao({
        deliberacaoId: deliberacaoAtiva.id,
        tituloEdital: `Convocação: ${editalForm.titulo || deliberacaoAtiva.titulo}`,
        resumoPauta,
        dataAssembleia: editalForm.dataAssembleia || 'Conforme Edital Oficial',
        linkApp: window.location.origin,
        pdfBase64,
        pdfNome,
        hashDocumento,
      })

      // Atualizar status para publicado
      if (editalDbId) {
        await api.salvarEditalDeliberacao(deliberacaoAtiva.id, { status: 'publicado' }, editalDbId)
      }

      toast({
        title: 'Notificações enfileiradas com sucesso',
        description: resp.message || `Disparado para ${resp.totalDestinatarios} moradores.`,
      })

      // Recarregar notificações
      const notifs = await api.getNotificacoes(deliberacaoAtiva.id)
      setNotificacoes(notifs)
    } catch (err: any) {
      toast({
        title: 'Falha no disparo do edital',
        description: err?.message || 'Ocorreu um erro ao enfileirar os e-mails.',
        variant: 'destructive',
      })
    } finally {
      setDisparandoEmails(false)
    }
  }

  // Integração ZapSign: enviar o PDF completo do edital (margens oficiais) para assinatura eletrônica
  const handleEnviarZapsignEdital = async () => {
    if (!deliberacaoAtiva) return
    if (!editalForm.sindicoNome.trim() || !editalForm.sindicoCpf.replace(/\D/g, '')) {
      toast({
        title: 'Informe o convocante',
        description: 'Preencha nome e CPF do convocante antes de enviar à ZapSign.',
        variant: 'destructive',
      })
      return
    }

    setZapsignEnviando(true)
    try {
      // Salvar rascunho para garantir persistência do edital antes do envio
      try {
        await handleSalvarRascunho(true)
      } catch {
        /* falha de rascunho não impede o envio */
      }

      const dadosZapsign: DadosEditalPdf = {
        ...dadosParaPdf,
        viaZapsign: true,
      }
      const prova: ProvaEditalPdf = await gerarPdfEditalComHash(dadosZapsign)

      const editalIdParaEnvio = editalDbIdRef.current || editalDbId
      if (!editalIdParaEnvio) {
        throw new Error('Salve o edital antes de enviar para assinatura.')
      }
      const resp = await api.enviarEditalZapsign(editalIdParaEnvio, {
        deliberacaoId: deliberacaoAtiva.id,
        nomeDocumento: `Edital de Convocação — ${nomeCondominio}`,
        pdfBase64: prova.pdfBase64,
        signatarios: [
          {
            nome: editalForm.sindicoNome.trim(),
            cpf: editalForm.sindicoCpf.replace(/\D/g, ''),
            email: user?.email || '',
            cargo: editalForm.cargoConvocante || 'Convocante',
          },
        ],
      })

      setZapsignStatus(resp.zapsign_status || resp.status || '')
      setZapsignDocToken(resp.documento_token)
      setZapsignSignatarios(resp.zapsign_urls || null)
      setZapsignMotivo(resp.message || null)
      setModalZapsignAberto(true)

      await api.registrarEventoAuditoria({
        evento: 'documento_upload',
        fator: `Mesa: edital enviado para assinatura externa (ZapSign) — documento ${resp.documento_token || 'sem token'}`,
        dispositivo: navigator.userAgent,
      })

      toast({
        title:
          resp.zapsign_status === 'fallback_manual'
            ? 'ZapSign não criou o documento — via manual liberada'
            : 'Edital enviado para assinatura',
        description:
          resp.zapsign_status === 'fallback_manual'
            ? resp.message || 'A ZapSign retornou erro; verifique o motivo exibido no modal.'
            : 'Os links individuais de assinatura estão disponíveis no modal.',
        variant: resp.zapsign_status === 'fallback_manual' ? 'destructive' : 'default',
      })
    } catch (err) {
      toast({
        title: 'Falha no envio à ZapSign',
        description: getErrorMessage(err, 'Não foi possível enviar o edital para assinatura.'),
        variant: 'destructive',
      })
    } finally {
      setZapsignEnviando(false)
    }
  }

  // Montar objeto de dados para PDF e Impressão
  const dadosParaPdf: DadosEditalPdf = {
    nomeCondominio,
    logoUrl: logoUrl || undefined,
    titulo: editalForm.titulo || deliberacaoAtiva?.titulo || 'Edital Oficial de Convocação',
    subtitulo: editalForm.subtitulo,
    textoAbertura: editalForm.textoAbertura,
    dataAssembleia: editalForm.dataAssembleia,
    primeiraConvocacao: editalForm.primeiraConvocacao,
    segundaConvocacao: editalForm.segundaConvocacao,
    localTexto: editalForm.localTexto,
    itensPauta: itensPauta.map((it) => ({
      ordem: it.ordem,
      titulo: it.titulo,
      texto: it.texto,
    })),
    ordemDiaCustom: editalForm.ordemDiaCustom,
    disposicoesGerais: editalForm.disposicoesGerais,
    regrasParticipacao: editalForm.regrasParticipacao,
    sindicoNome: editalForm.sindicoNome,
    sindicoCpf: editalForm.sindicoCpf,
    cargoConvocante: editalForm.cargoConvocante,
    status: hashDesatualizado ? 'rascunho' : editalAssinadoHash ? 'assinado' : 'rascunho',
    hashAssinatura: hashDesatualizado ? null : editalAssinadoHash,
    dataAssinatura: hashDesatualizado ? null : editalAssinadoData,
    formatoAssinatura: hashDesatualizado ? 'em_branco' : formatoAssinatura,
    assinaturaVisual: hashDesatualizado ? undefined : assinaturaVisual,
    assinaturaTexto: hashDesatualizado ? undefined : assinaturaTexto,
    instrucoesAcesso: instrucoesAcesso,
  }

  // Ação: Baixar PDF
  const handleBaixarPdf = async () => {
    // Salvar silenciosamente se tiver alteração
    try {
      await handleSalvarRascunho(true)
    } catch {
      /* intentionally ignored */
    }

    // Registrar auditoria
    if (deliberacaoAtiva) {
      await api.registrarEventoAuditoria({
        evento: 'documento_upload',
        fator: `Mesa: geração e download de documento PDF do Edital (${deliberacaoAtiva.id})`,
        dispositivo: navigator.userAgent,
      })
    }

    imprimirOuBaixarPdfEdital(dadosParaPdf)
    toast({
      title: 'Gerando PDF do Edital',
      description: 'Na janela de impressão, selecione "Salvar como PDF" com formato A4.',
    })
  }

  // Ação: Abrir Visão de Impressão Dedicada
  const handleImprimirEdital = () => {
    if (deliberacaoAtiva) {
      navigate(`/mesa/documentos/edital/${deliberacaoAtiva.id}`)
    } else {
      navigate('/mesa/documentos/edital')
    }
  }

  // Ação: Reenviar notificação individual
  const handleReenviarNotificacao = async (notifId: string) => {
    try {
      const resp = await api.reenviarNotificacao(notifId)
      if (resp.success) {
        toast({ title: 'E-mail reenviado com sucesso' })
      } else {
        toast({
          title: 'Erro no reenvio',
          description: resp.message,
          variant: 'destructive',
        })
      }
      if (deliberacaoAtiva) {
        const notifs = await api.getNotificacoes(deliberacaoAtiva.id)
        setNotificacoes(notifs)
      }
    } catch (err: any) {
      toast({
        title: 'Falha ao reenviar',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  // Item 2 — salvar instruções de acesso na configuração da organização (valem para todos os editais)
  const handleSalvarInstrucoesAcesso = async () => {
    if (!configuracaoId) {
      toast({
        title: 'Configuração não encontrada',
        description: 'Não foi possível identificar a configuração da organização para salvar.',
        variant: 'destructive',
      })
      return
    }
    try {
      setSalvandoInstrucoes(true)
      await api.updateConfiguracao(configuracaoId, {
        instrucoes_acesso: JSON.stringify(instrucoesAcesso ?? {}),
      })
      toast({ title: 'Instruções de acesso salvas' })
    } catch (err: any) {
      console.error('Erro ao salvar instruções de acesso:', err)
      toast({
        title: 'Erro ao salvar instruções',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoInstrucoes(false)
    }
  }

  // Item 5 — registrar cláusula de aceite gerada na configuração da organização
  const handleRegistrarClausulaAceite = async (texto: string) => {
    if (!configuracaoId) {
      toast({
        title: 'Configuração não encontrada',
        description: 'Não foi possível identificar a configuração da organização para registrar.',
        variant: 'destructive',
      })
      return
    }
    try {
      const versao = `v1-${new Date().toISOString().slice(0, 10)}`
      await api.updateConfiguracao(configuracaoId, {
        clausula_aceite_texto: texto,
        clausula_aceite_versao: versao,
        clausula_aceite_status: 'rascunho',
      })
      setClausulaAceiteTexto(texto)
      setClausulaAceiteVersao(versao)
      setClausulaAceiteStatus('rascunho')
      toast({ title: 'Cláusula de aceite registrada na configuração' })
    } catch (err: any) {
      console.error('Erro ao registrar cláusula de aceite:', err)
      toast({
        title: 'Erro ao registrar cláusula',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  // Ação: Upload de Documento da Pauta
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliberacaoAtiva) return
    if (!tituloDoc.trim()) {
      toast({ title: 'Informe o título do documento', variant: 'destructive' })
      return
    }
    if (!arquivoFile) {
      toast({ title: 'Selecione um arquivo (PDF ou imagem)', variant: 'destructive' })
      return
    }

    if (arquivoFile.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo não pode exceder 10MB.',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('deliberacao', deliberacaoAtiva.id)
      formData.append('tipo', tipoDoc)
      formData.append('titulo', tituloDoc.trim())
      formData.append('descricao', descricaoDoc.trim())
      formData.append('arquivo', arquivoFile)
      formData.append('ordem', String(documentos.length + 1))
      if (user?.id) formData.append('criado_por', user.id)

      if (tipoDoc === 'curriculo_candidato') {
        formData.append('cargo_candidato', cargoCandidato)
        formData.append('nome_candidato', nomeCandidato.trim())
      }

      await api.uploadDocumentoPauta(formData)

      await api.registrarEventoAuditoria({
        evento: 'documento_upload',
        fator: `Mesa: upload do documento "${tituloDoc.trim()}" (${tipoDoc}) na deliberação ${deliberacaoAtiva.id}`,
        dispositivo: navigator.userAgent,
      })

      toast({ title: 'Documento anexado à pauta' })
      setModalUploadAberto(false)
      setTituloDoc('')
      setDescricaoDoc('')
      setNomeCandidato('')
      setArquivoFile(null)

      const docs = await api.getDocumentosPauta(deliberacaoAtiva.id)
      setDocumentos(docs)
    } catch (err: any) {
      toast({
        title: 'Falha no upload',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  // Ação: Excluir Documento da Pauta
  const handleExcluirDoc = async (docId: string, docTitulo: string) => {
    if (!confirm(`Deseja realmente remover o documento "${docTitulo}"?`)) return
    try {
      await api.deleteDocumentoPauta(docId)
      toast({ title: 'Documento Removido' })
      if (deliberacaoAtiva) {
        const docs = await api.getDocumentosPauta(deliberacaoAtiva.id)
        setDocumentos(docs)
      }
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err?.message, variant: 'destructive' })
    }
  }

  const getArquivoUrl = (doc: DocumentoPautaRecord) => {
    if (!doc.arquivo) return ''
    return pb.files.getURL(doc, doc.arquivo)
  }

  const formatarTipoDoc = (tipo: TipoDocumentoPauta) => {
    switch (tipo) {
      case 'convencao_proposta':
        return 'Proposta de Convenção'
      case 'regimento_interno':
        return 'Regimento Interno'
      case 'prestacao_contas':
        return 'Prestação de Contas'
      case 'curriculo_candidato':
        return 'Currículo de Candidato'
      case 'edital':
        return 'Edital de Convocação'
      case 'procuracao':
        return 'Modelo de Procuração'
      default:
        return 'Outro Documento'
    }
  }

  const formatarCargo = (cargo?: CargoCandidato) => {
    switch (cargo) {
      case 'sindico':
        return 'Síndico(a)'
      case 'vice_sindico':
        return 'Vice-Síndico(a)'
      case 'conselheiro_fiscal':
        return 'Conselheiro Fiscal'
      case 'conselheiro_consultivo':
        return 'Conselheiro Consultivo'
      default:
        return 'Candidato'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Seletor de Assembleia */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" /> Documentos da Pauta & Edital de
            Convocação
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Edital 100% editável e persistente, com assinatura eletrônica SHA-256, geração de PDF,
            impressão A4 e disparo por e-mail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {deliberacoes.length > 0 && (
            <Select value={deliberacaoAtiva?.id || ''} onValueChange={handleTrocarDeliberacao}>
              <SelectTrigger className="w-60 text-xs h-9 bg-white border-slate-300">
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
            onClick={handleBaixarPdf}
            variant="outline"
            className="text-xs h-9 bg-white border-slate-300 gap-1.5"
            disabled={!deliberacaoAtiva}
          >
            <Download className="h-3.5 w-3.5" /> Baixar PDF
          </Button>

          <Button
            size="sm"
            onClick={handleImprimirEdital}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 gap-1.5"
            disabled={!deliberacaoAtiva}
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir Edital
          </Button>
        </div>
      </div>

      {/* Tabs Principais */}
      <Tabs defaultValue="edital" className="w-full">
        <TabsList className="bg-slate-200/80 p-1 border border-slate-200 grid grid-cols-4 max-w-3xl">
          <TabsTrigger value="edital" className="text-xs font-semibold">
            Edital de Convocação
          </TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs font-semibold">
            Documentos da Pauta ({documentos.length})
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="text-xs font-semibold">
            Notificações E-mail ({notificacoes.length})
          </TabsTrigger>
          <TabsTrigger value="clausula-aceite" className="text-xs font-semibold">
            Cláusula de Aceite
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: EDITAL DE CONVOCAÇÃO EDITÁVEL & PERSISTENTE */}
        <TabsContent value="edital" className="space-y-6 pt-3">
          {deliberacaoAtiva ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Coluna de Configuração / Edição do Edital (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border-slate-200 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-cyan-600" />
                        Editor Completo do Edital
                      </CardTitle>
                      {hashDesatualizado ? (
                        <Badge
                          variant="destructive"
                          className="text-[10px] bg-amber-600 hover:bg-amber-700 animate-pulse"
                        >
                          Assinatura Desatualizada
                        </Badge>
                      ) : editalAssinadoHash ? (
                        <Badge
                          className="text-[10px] bg-emerald-600 hover:bg-emerald-700"
                          title={
                            editalAssinadoData
                              ? `Assinado em ${new Date(editalAssinadoData).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                              : undefined
                          }
                        >
                          Assinado
                          {editalAssinadoData
                            ? ` • ${new Date(editalAssinadoData).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                            : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-slate-300">
                          Rascunho
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      Todos os blocos de texto e parâmetros do edital são editáveis e salvos no
                      banco.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3.5 text-xs">
                    {/* Alerta de Hash Desatualizado após Edição */}
                    {hashDesatualizado && (
                      <div className="p-2.5 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Atenção:</strong> Você alterou o conteúdo do edital após a
                          assinatura anterior. O carimbo hash SHA-256 está desatualizado. Clique em{' '}
                          <strong>"Atualizar Assinatura Eletrônica"</strong> para recertificar o
                          documento.
                        </div>
                      </div>
                    )}

                    {/* Bloco 1: Título e Subtítulo */}
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700 font-semibold">
                        Título do Edital / Assembleia
                      </Label>
                      <Input
                        type="text"
                        value={editalForm.titulo}
                        onChange={(e) =>
                          notificarAlteracaoEdital({ ...editalForm, titulo: e.target.value })
                        }
                        placeholder="Ex: Assembleia Geral Extraordinária"
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700">Subtítulo / Chamada Formal</Label>
                      <Input
                        type="text"
                        value={editalForm.subtitulo}
                        onChange={(e) =>
                          notificarAlteracaoEdital({ ...editalForm, subtitulo: e.target.value })
                        }
                        className="text-xs h-8"
                      />
                    </div>

                    {/* Bloco 2: Texto de Abertura / Fundamentação Legal */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-700 font-semibold">
                          Texto de Abertura / Convocação Formal
                        </Label>
                        <span className="text-[10px] text-cyan-700 font-medium">
                          Editor Rico (formatação completa)
                        </span>
                      </div>
                      <RichTextEditor
                        value={editalForm.textoAbertura}
                        onChange={(html) =>
                          notificarAlteracaoEdital({ ...editalForm, textoAbertura: html })
                        }
                        placeholder="O Síndico e a Mesa Diretora vêm por meio deste convocar..."
                        minHeight="110px"
                      />
                    </div>

                    {/* Bloco 3: Horários e Local */}
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700 font-semibold">
                        Data e Horário da Assembleia
                      </Label>
                      <Input
                        type="text"
                        placeholder="Ex: 28 de Outubro de 2026, das 19h00 às 22h00"
                        value={editalForm.dataAssembleia}
                        onChange={(e) =>
                          notificarAlteracaoEdital({
                            ...editalForm,
                            dataAssembleia: e.target.value,
                          })
                        }
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-700">1ª Convocação</Label>
                        <Input
                          type="text"
                          value={editalForm.primeiraConvocacao}
                          onChange={(e) =>
                            notificarAlteracaoEdital({
                              ...editalForm,
                              primeiraConvocacao: e.target.value,
                            })
                          }
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-700">2ª Convocação</Label>
                        <Input
                          type="text"
                          value={editalForm.segundaConvocacao}
                          onChange={(e) =>
                            notificarAlteracaoEdital({
                              ...editalForm,
                              segundaConvocacao: e.target.value,
                            })
                          }
                          className="text-xs h-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700">
                        Local / Plataforma dos Trabalhos
                      </Label>
                      <Input
                        type="text"
                        value={editalForm.localTexto}
                        onChange={(e) =>
                          notificarAlteracaoEdital({ ...editalForm, localTexto: e.target.value })
                        }
                        className="text-xs h-8"
                      />
                    </div>

                    {/* Bloco 4: Ordem do Dia Customizada (Opcional) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-700 font-semibold">
                          Texto Customizado da Ordem do Dia (Opcional)
                        </Label>
                        <span className="text-[10px] text-slate-400">
                          Deixe em branco para usar os itens da pauta
                        </span>
                      </div>
                      <RichTextEditor
                        value={editalForm.ordemDiaCustom}
                        onChange={(html) =>
                          notificarAlteracaoEdital({ ...editalForm, ordemDiaCustom: html })
                        }
                        placeholder="Se desejar substituir a lista de itens por texto livre formatado com marcadores e numeração..."
                        minHeight="90px"
                      />
                    </div>

                    {/* Bloco 5: Disposições Gerais e Regras de Participação */}
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700 font-semibold">
                        Disposições Gerais / Procurações
                      </Label>
                      <RichTextEditor
                        value={editalForm.disposicoesGerais}
                        onChange={(html) =>
                          notificarAlteracaoEdital({ ...editalForm, disposicoesGerais: html })
                        }
                        placeholder="Regras de representação, procuração, instrução aos condôminos..."
                        minHeight="100px"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700 font-semibold">
                        Regras de Participação / Convenção
                      </Label>
                      <RichTextEditor
                        value={editalForm.regrasParticipacao}
                        onChange={(html) =>
                          notificarAlteracaoEdital({ ...editalForm, regrasParticipacao: html })
                        }
                        placeholder="Quóruns legais, regras de adimplência e disposições regimentais..."
                        minHeight="100px"
                      />
                    </div>

                    {/* Bloco 6: Dados do Convocante e Assinatura */}
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-700 font-semibold">
                            Nome do Convocante
                          </Label>
                          <Input
                            type="text"
                            placeholder="Nome completo do Síndico"
                            value={editalForm.sindicoNome}
                            onChange={(e) =>
                              notificarAlteracaoEdital({
                                ...editalForm,
                                sindicoNome: e.target.value,
                              })
                            }
                            className="text-xs h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-slate-700 font-semibold">
                            CPF do Convocante
                          </Label>
                          <Input
                            type="text"
                            placeholder="000.000.000-00"
                            value={editalForm.sindicoCpf}
                            onChange={(e) => {
                              notificarAlteracaoEdital({
                                ...editalForm,
                                sindicoCpf: formatarCpf(e.target.value),
                              })
                              setSindicoCpfErro(null)
                            }}
                            className={`text-xs h-8 ${sindicoCpfErro ? 'border-red-500' : ''}`}
                          />
                          {sindicoCpfErro && (
                            <p className="text-[10px] text-red-600 font-medium">{sindicoCpfErro}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-700">Cargo / Representação</Label>
                        <Input
                          type="text"
                          value={editalForm.cargoConvocante}
                          onChange={(e) =>
                            notificarAlteracaoEdital({
                              ...editalForm,
                              cargoConvocante: e.target.value,
                            })
                          }
                          className="text-xs h-8"
                        />
                      </div>
                    </div>

                    {/* Resalva Jurídica */}
                    <div className="p-2 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-700 block">Validade Jurídica:</span>
                      A assinatura eletrônica deste sistema (nome + CPF + carimbo hash SHA-256)
                      atesta a integridade e autoria da convocação perante a comunidade condominial.
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2 pt-0">
                    {/* Indicador Sutil de Status do Salvamento Automático */}
                    <div className="w-full flex items-center justify-between text-[11px] px-0.5 text-slate-500 min-h-[18px]">
                      <div className="flex items-center gap-1.5">
                        {autosaveStatus === 'saving' || salvandoEdital ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-cyan-600" />
                            <span className="text-cyan-700 font-medium">Salvando alterações…</span>
                          </>
                        ) : autosaveStatus === 'pending' ? (
                          <>
                            <Clock className="h-3 w-3 text-amber-500" />
                            <span className="text-slate-500">
                              Alterações não salvas (aguardando pausa…)
                            </span>
                          </>
                        ) : autosaveStatus === 'saved' && ultimoSalvoHora ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-700">
                              Salvo automaticamente às {ultimoSalvoHora}
                            </span>
                          </>
                        ) : autosaveStatus === 'error' ? (
                          <>
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                            <span className="text-red-600 font-medium">
                              Erro ao salvar rascunho
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">Todas as alterações salvas</span>
                        )}
                      </div>

                      {ultimoSalvoHora &&
                        autosaveStatus !== 'saving' &&
                        autosaveStatus !== 'pending' && (
                          <span className="text-[10px] text-slate-400">Backup em nuvem</span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full">
                      <Button
                        variant="outline"
                        className="text-xs h-9 border-slate-300"
                        onClick={() => handleSalvarRascunho(false)}
                        disabled={salvandoEdital}
                      >
                        {salvandoEdital ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5 mr-1" />
                            Salvar Rascunho
                          </>
                        )}
                      </Button>

                      <Button
                        className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-9"
                        onClick={handleAbrirModalAssinatura}
                        disabled={assinandoEdital}
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        {hashDesatualizado
                          ? 'Atualizar Assinatura'
                          : editalAssinadoHash
                            ? 'Reassinar Edital'
                            : 'Assinar Eletronicamente'}
                      </Button>
                    </div>

                    <Button
                      variant="default"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                      onClick={handlePublicarENotificar}
                      disabled={disparandoEmails || !editalAssinadoHash || hashDesatualizado}
                    >
                      {disparandoEmails ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Disparando convocação…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1.5" />
                          Publicar Edital e Notificar Moradores
                        </>
                      )}
                    </Button>

                    {/* Assinatura externa via ZapSign (mesmo padrão da ata) */}
                    {zapsignStatus && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <FileSignature className="h-3.5 w-3.5 text-cyan-700" />
                        <span>
                          Assinatura externa:{' '}
                          {zapsignStatus === 'assinado'
                            ? 'concluída'
                            : zapsignStatus === 'fallback_manual'
                              ? 'falhou — via manual liberada'
                              : zapsignStatus === 'aguardando'
                                ? 'aguardando signatários'
                                : 'enviada'}
                          {zapsignSignatarios && zapsignSignatarios.length > 0 && (
                            <button
                              type="button"
                              className="ml-1 underline text-cyan-700"
                              onClick={() => setModalZapsignAberto(true)}
                            >
                              ver links
                            </button>
                          )}
                        </span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      className="w-full border-cyan-700 text-cyan-800 hover:bg-cyan-50 text-xs h-9"
                      onClick={handleEnviarZapsignEdital}
                      disabled={zapsignEnviando || hashDesatualizado}
                    >
                      {zapsignEnviando ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Enviando à ZapSign…
                        </>
                      ) : (
                        <>
                          <FileSignature className="h-4 w-4 mr-1.5" />
                          Enviar para assinatura (ZapSign)
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                {/* Item 2 — Instruções de Acesso e Votação Eletrônica (8 campos) */}
                <CardInstrucoesAcesso
                  instrucoes={instrucoesAcesso}
                  salvando={salvandoInstrucoes}
                  onChange={setInstrucoesAcesso}
                  onSalvar={handleSalvarInstrucoesAcesso}
                  faltantes={validarInstrucoesEdital(instrucoesAcesso)}
                />
              </div>

              {/* Coluna de Visualização Profissional A4 em Tempo Real (7 cols) */}
              <div className="lg:col-span-7">
                <Card className="border-slate-300 shadow-md bg-white">
                  <CardHeader className="bg-slate-900 text-white rounded-t-lg p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={nomeCondominio}
                            className="h-10 w-10 object-contain bg-white rounded p-1"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs">
                            LA
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] tracking-widest uppercase text-cyan-300 font-bold">
                            Edital Oficial de Convocação
                          </p>
                          <h3 className="text-base font-bold text-white leading-tight">
                            {nomeCondominio}
                          </h3>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-300 block">
                          Assembleia Geral
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] border-cyan-400 text-cyan-200 px-2 py-0"
                        >
                          {deliberacaoAtiva.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 sm:p-8 space-y-5 text-slate-800 font-serif leading-relaxed text-sm bg-white">
                    {/* Alerta Visual no Topo do Documento */}
                    {hashDesatualizado && (
                      <div className="p-2.5 rounded bg-amber-50 border border-amber-300 font-sans text-xs text-amber-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-amber-600" />
                          Edital modificado após assinatura: o carimbo abaixo está pendente de
                          atualização.
                        </span>
                        <Button
                          size="sm"
                          onClick={handleAbrirModalAssinatura}
                          className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Atualizar Agora
                        </Button>
                      </div>
                    )}

                    {/* Título */}
                    <div className="text-center space-y-1 border-b border-slate-200 pb-3">
                      <h4 className="text-base sm:text-lg font-bold text-slate-950 uppercase tracking-wide">
                        {editalForm.titulo || deliberacaoAtiva.titulo}
                      </h4>
                      {editalForm.subtitulo && (
                        <p className="text-xs text-slate-600 font-sans italic">
                          {editalForm.subtitulo}
                        </p>
                      )}
                    </div>

                    {/* Texto Abertura */}
                    <div className="space-y-3 text-xs font-sans">
                      <div className="text-justify leading-relaxed text-slate-800">
                        <SafeHtml
                          content={editalForm.textoAbertura}
                          fallbackText="Texto de abertura da convocação..."
                        />
                      </div>

                      {/* Quadro de Convocação */}
                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-md space-y-1.5">
                        <p>
                          <strong>• Data da Assembleia:</strong>{' '}
                          {editalForm.dataAssembleia || 'Conforme cronograma da assembleia'}
                        </p>
                        <p>
                          <strong>• 1ª Convocação:</strong> às {editalForm.primeiraConvocacao} horas
                          (com quórum legal).
                        </p>
                        <p>
                          <strong>• 2ª Convocação:</strong> às {editalForm.segundaConvocacao} horas
                          (com qualquer número de presentes).
                        </p>
                        <p>
                          <strong>• Local / Plataforma:</strong> {editalForm.localTexto}
                        </p>
                      </div>

                      {/* Ordem do Dia */}
                      <div className="space-y-2 pt-2">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-sans border-b border-slate-100 pb-1">
                          Ordem do Dia / Pauta de Deliberações:
                        </h5>
                        {editalForm.ordemDiaCustom &&
                        editalForm.ordemDiaCustom.trim().length > 0 ? (
                          <div className="text-slate-800 pl-2 text-xs">
                            <SafeHtml content={editalForm.ordemDiaCustom} />
                          </div>
                        ) : (
                          <ol className="list-decimal list-inside space-y-1.5 pl-2">
                            {itensPauta.length > 0 ? (
                              itensPauta.map((it) => (
                                <li key={it.id} className="text-xs text-slate-800">
                                  <strong>{it.titulo}</strong>
                                  {it.texto && (
                                    <span className="text-slate-600 block pl-4 font-normal">
                                      {it.texto}
                                    </span>
                                  )}
                                </li>
                              ))
                            ) : (
                              <li className="text-xs text-slate-500 italic">
                                Nenhum item de pauta adicionado ainda nesta deliberação.
                              </li>
                            )}
                          </ol>
                        )}
                      </div>

                      {/* Disposições Gerais */}
                      <div className="space-y-2 pt-2">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-sans border-b border-slate-100 pb-1">
                          Disposições Gerais e Instruções:
                        </h5>
                        <div className="text-justify leading-relaxed text-slate-700">
                          <SafeHtml content={editalForm.disposicoesGerais} />
                        </div>
                      </div>

                      {/* Regras Regimentais */}
                      {editalForm.regrasParticipacao && (
                        <div className="space-y-2 pt-2">
                          <h5 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-sans border-b border-slate-100 pb-1">
                            Regras Regimentais de Participação:
                          </h5>
                          <div className="text-justify leading-relaxed text-slate-600">
                            <SafeHtml content={editalForm.regrasParticipacao} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Assinatura do Convocante com Bloco Compacto v0.0.21 e Assinatura Gráfica */}
                    <div className="pt-8 border-t-2 border-slate-900 font-sans text-center">
                      <BlocoAssinaturaCompacto
                        nome={editalForm.sindicoNome || 'Síndico / Mesa Diretora'}
                        cpf={editalForm.sindicoCpf}
                        cargo={editalForm.cargoConvocante}
                        formato={hashDesatualizado ? 'em_branco' : formatoAssinatura}
                        assinaturaVisual={hashDesatualizado ? undefined : assinaturaVisual}
                        assinaturaTexto={hashDesatualizado ? undefined : assinaturaTexto}
                        alinhamento="center"
                      />

                      {/* Carimbo da Assinatura Eletrônica */}
                      {editalAssinadoHash && !hashDesatualizado ? (
                        <div className="mt-6 text-left">
                          <SeloAssinaturaCriptografica
                            tipoDocumento="edital"
                            nomeSignatario={editalForm.sindicoNome || 'Síndico / Mesa Diretora'}
                            cpfSignatario={editalForm.sindicoCpf}
                            cargoSignatario={editalForm.cargoConvocante}
                            hashSha256={editalAssinadoHash}
                            dataHoraAssinatura={editalAssinadoData}
                            dataDeclaradaSignatario={dataDeclaradaSignatario}
                            status="valido"
                          />
                        </div>
                      ) : hashDesatualizado ? (
                        <div className="mt-6 text-left space-y-3">
                          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 font-sans text-xs text-amber-900 space-y-1.5">
                            <span className="font-bold flex items-center gap-1.5 text-amber-950">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                              Assinatura Eletrônica Pendente de Atualização
                            </span>
                            <p className="text-slate-700 text-[11px] leading-relaxed">
                              O edital foi editado após a assinatura anterior. Para restabelecer o
                              selo criptográfico válido, assine novamente o documento.
                            </p>
                          </div>
                          <SeloAssinaturaCriptografica
                            tipoDocumento="edital"
                            nomeSignatario={editalForm.sindicoNome || 'Síndico / Mesa Diretora'}
                            cpfSignatario={editalForm.sindicoCpf}
                            cargoSignatario={editalForm.cargoConvocante}
                            hashSha256={editalAssinadoHash}
                            dataHoraAssinatura={editalAssinadoData}
                            dataDeclaradaSignatario={dataDeclaradaSignatario}
                            status="desatualizado"
                          />
                        </div>
                      ) : (
                        <div className="mt-6">
                          <SeloAssinaturaCriptografica
                            tipoDocumento="edital"
                            nomeSignatario={editalForm.sindicoNome || 'Síndico / Mesa Diretora'}
                            cpfSignatario={editalForm.sindicoCpf}
                            cargoSignatario={editalForm.cargoConvocante}
                            dataDeclaradaSignatario={dataDeclaradaSignatario}
                            status="pendente"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
              <p className="text-slate-500 text-sm">Nenhuma assembleia selecionada.</p>
            </div>
          )}
        </TabsContent>

        {/* ABA 2: DOCUMENTOS DA PAUTA */}
        <TabsContent value="documentos" className="space-y-6 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pauta Documental da Assembleia</h3>
              <p className="text-xs text-slate-500">
                Anexe propostas, convenções, prestações de contas e currículos de candidatos para
                consulta pública dos condôminos.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setModalUploadAberto(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9"
              disabled={!deliberacaoAtiva}
            >
              <UploadCloud className="h-4 w-4 mr-1.5" /> Anexar Novo Documento
            </Button>
          </div>

          {documentos.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-xl border border-dashed border-slate-300">
              <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-700">
                Nenhum documento anexado ainda
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Adicione a proposta de convenção, regimento interno ou relatórios financeiros para
                que os moradores visualizem inline.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalUploadAberto(true)}
                className="mt-4 text-xs"
              >
                Fazer Upload
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentos.map((doc) => {
                const url = getArquivoUrl(doc)
                return (
                  <Card
                    key={doc.id}
                    className="border-slate-200 shadow-xs flex flex-col justify-between"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                          {formatarTipoDoc(doc.tipo)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExcluirDoc(doc.id, doc.titulo)}
                          className="h-7 w-7 text-red-500 hover:bg-red-50"
                          title="Remover documento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <CardTitle className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">
                        {doc.titulo}
                      </CardTitle>
                      {doc.descricao && (
                        <CardDescription className="text-xs text-slate-600 line-clamp-2">
                          {doc.descricao}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-2 text-xs py-2">
                      {doc.tipo === 'curriculo_candidato' && (
                        <div className="p-2 rounded bg-cyan-50 border border-cyan-100 text-[11px] text-cyan-900">
                          <p>
                            <strong>Candidato:</strong> {doc.nome_candidato || '—'}
                          </p>
                          <p>
                            <strong>Cargo:</strong> {formatarCargo(doc.cargo_candidato)}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{doc.arquivo || 'Arquivo anexado'}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      {url ? (
                        <>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold py-1.5 px-3 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Visualizar
                          </a>
                          <a
                            href={url}
                            download
                            className="inline-flex items-center justify-center p-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800"
                            title="Baixar arquivo"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sem arquivo</span>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA 3: NOTIFICAÇÕES POR E-MAIL */}
        <TabsContent value="notificacoes" className="space-y-6 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Histórico de Notificações Eletrônicas
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe o status de entrega dos e-mails de convocação, avisos de credenciamento e
                publicação.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => deliberacaoAtiva && carregarDados(deliberacaoAtiva.id)}
              className="text-xs h-9 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar Status
            </Button>
          </div>

          {/* Cards de Métricas de Entrega */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block">Total Registradas</span>
              <span className="text-2xl font-bold text-slate-900">{notificacoes.length}</span>
            </Card>
            <Card className="p-4 border-emerald-200 bg-emerald-50/40">
              <span className="text-xs text-emerald-700 font-semibold block">
                Enviadas com Sucesso
              </span>
              <span className="text-2xl font-bold text-emerald-700">
                {notificacoes.filter((n) => n.status === 'enviada').length}
              </span>
            </Card>
            <Card className="p-4 border-red-200 bg-red-50/40">
              <span className="text-xs text-red-700 font-semibold block">Falhas de Envio</span>
              <span className="text-2xl font-bold text-red-700">
                {notificacoes.filter((n) => n.status === 'falha').length}
              </span>
            </Card>
          </div>

          {/* Tabela de Notificações */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Destinatário</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Assunto</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Data Envio</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notificacoes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                        Nenhuma notificação registrada para esta deliberação.
                      </td>
                    </tr>
                  ) : (
                    notificacoes.map((n) => (
                      <tr key={n.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-medium text-slate-900">{n.destinatario}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {n.tipo.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate" title={n.titulo}>
                          {n.titulo}
                        </td>
                        <td className="p-3">
                          <Badge
                            className={`text-[10px] uppercase ${
                              n.status === 'enviada'
                                ? 'bg-emerald-600 text-white'
                                : n.status === 'pendente'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-red-600 text-white'
                            }`}
                          >
                            {n.status}
                          </Badge>
                          {n.mensagem_erro && (
                            <span
                              className="block text-[10px] text-red-600 mt-0.5 truncate max-w-xs"
                              title={n.mensagem_erro}
                            >
                              {n.mensagem_erro}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500">
                          {n.enviada_em
                            ? new Date(n.enviada_em).toLocaleString('pt-BR')
                            : new Date(n.created).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3 text-right">
                          {n.status === 'falha' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReenviarNotificacao(n.id)}
                              className="text-[11px] h-7 px-2 border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Reenviar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seção "Provas de envio" — trilha prova_* gravada pelo hook no disparo */}
          <ProvasEnvio notificacoes={notificacoes} />
        </TabsContent>

        {/* ABA 4: CLÁUSULA DE ACEITE */}
        <TabsContent value="clausula-aceite" className="space-y-6 pt-3">
          <ClausulaAceite
            nomeOrganizacao={nomeCondominio}
            nomeDocumentoNormativo={
              editalForm.titulo || deliberacaoAtiva?.titulo || 'Edital de Convocação'
            }
            cargoSignatario={editalForm.cargoConvocante}
            clausulaSalva={clausulaAceiteTexto}
            versaoSalva={clausulaAceiteVersao}
            statusSalvo={clausulaAceiteStatus}
            onSalvar={handleRegistrarClausulaAceite}
          />
        </TabsContent>
      </Tabs>

      {/* Modal Reutilizável de Assinatura Eletrônica (Desenho, Nome Digitado ou Em Branco) */}
      <ModalAssinaturaEletronica
        aberto={modalAssinaturaAberto}
        onOpenChange={setModalAssinaturaAberto}
        tituloDocumento={editalForm.titulo || deliberacaoAtiva?.titulo || 'Edital de Convocação'}
        subtitulo="Selecione o modo de assinatura (desenhar na tela, digitar nome ou deixar em branco para papel)"
        nomeInicial={editalForm.sindicoNome}
        cpfInicial={editalForm.sindicoCpf}
        cargoInicial={editalForm.cargoConvocante}
        formatoInicial={formatoAssinatura}
        assinaturaVisualInicial={assinaturaVisual}
        assinaturaTextoInicial={assinaturaTexto}
        salvando={assinandoEdital}
        permitirEditarIdentificacao={true}
        permitirDataHoraHistorica={true}
        dataHoraInicial={editalAssinadoData || undefined}
        onConfirmar={handleConfirmarAssinaturaComModo}
      />

      {/* Modal ZapSign: links individuais por signatário (mesmo padrão da ata) */}
      <ModalZapsignLinks
        aberto={modalZapsignAberto}
        onOpenChange={setModalZapsignAberto}
        tituloDocumento={editalForm.titulo || deliberacaoAtiva?.titulo || 'Edital de Convocação'}
        signatarios={zapsignSignatarios}
        status={zapsignStatus}
        motivo={zapsignMotivo}
      />

      {/* Modal de Upload de Documento da Pauta */}
      <Dialog open={modalUploadAberto} onOpenChange={setModalUploadAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Anexar Documento à Pauta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Faça upload de arquivos PDF ou imagens (até 10MB) que compõem a pauta da assembleia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadDoc} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Tipo de Documento</Label>
              <Select
                value={tipoDoc}
                onValueChange={(val) => setTipoDoc(val as TipoDocumentoPauta)}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="convencao_proposta">Proposta de Convenção</SelectItem>
                  <SelectItem value="regimento_interno">Regimento Interno</SelectItem>
                  <SelectItem value="prestacao_contas">Prestação de Contas / Balancete</SelectItem>
                  <SelectItem value="curriculo_candidato">Currículo de Candidato</SelectItem>
                  <SelectItem value="edital">Edital de Convocação</SelectItem>
                  <SelectItem value="procuracao">Modelo de Procuração</SelectItem>
                  <SelectItem value="outro">Outro Documento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoDoc === 'curriculo_candidato' && (
              <div className="grid grid-cols-2 gap-2 p-2 rounded bg-slate-50 border border-slate-200">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Cargo Pretendido</Label>
                  <Select
                    value={cargoCandidato}
                    onValueChange={(val) => setCargoCandidato(val as CargoCandidato)}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sindico">Síndico(a)</SelectItem>
                      <SelectItem value="vice_sindico">Vice-Síndico(a)</SelectItem>
                      <SelectItem value="conselheiro_fiscal">Conselheiro Fiscal</SelectItem>
                      <SelectItem value="conselheiro_consultivo">Conselheiro Consultivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Nome do Candidato</Label>
                  <Input
                    type="text"
                    placeholder="Nome completo"
                    value={nomeCandidato}
                    onChange={(e) => setNomeCandidato(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Título de Exibição</Label>
              <Input
                type="text"
                placeholder="Ex: Minuta da Nova Convenção 2026"
                value={tituloDoc}
                onChange={(e) => setTituloDoc(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Descrição / Instruções aos Moradores</Label>
              <Textarea
                rows={2}
                placeholder="Breve resumo explicativo sobre o documento..."
                value={descricaoDoc}
                onChange={(e) => setDescricaoDoc(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Arquivo (PDF ou Imagem - máx. 10MB)</Label>
              <Input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setArquivoFile(e.target.files[0])
                  }
                }}
                required
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalUploadAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                disabled={uploading}
              >
                {uploading ? 'Enviando...' : 'Confirmar Upload'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DocumentosEditalPage

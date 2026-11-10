import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SeletorAssinatura, DadosCapturaAssinatura } from './SeletorAssinatura'
import { formatarCpf, validarCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import {
  ShieldCheck,
  Loader2,
  Calendar,
  Clock,
  Smartphone,
  Laptop,
  QrCode,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { QrCodeSvg } from './QrCodeSvg'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'

export interface ModalAssinaturaEletronicaProps {
  aberto: boolean
  onOpenChange: (aberto: boolean) => void
  tituloDocumento: string
  subtitulo?: string
  documentoId?: string
  documentoTipo?: 'edital' | 'ata' | 'lista_presenca' | 'dossie'
  deliberacaoId?: string
  hashDocumento?: string
  nomeInicial?: string
  cpfInicial?: string
  cargoInicial?: string
  formatoInicial?: 'desenho' | 'texto' | 'em_branco'
  assinaturaVisualInicial?: string
  assinaturaTextoInicial?: string
  onConfirmar: (dados: {
    nome: string
    cpf: string
    cargo?: string
    formato: 'desenho' | 'texto' | 'em_branco'
    assinaturaVisual?: string
    assinaturaTexto?: string
    dataHoraAssinatura?: string // ISO string da data/hora declarada da assinatura
  }) => Promise<void> | void
  salvando?: boolean
  permitirEditarIdentificacao?: boolean
  permitirDataHoraHistorica?: boolean
  dataHoraInicial?: string // ISO string opcional para pré-preencher
}

function extrairDataHoraLocal(isoOuData?: string) {
  const d = isoOuData ? new Date(isoOuData) : new Date()
  const dataValida = !isNaN(d.getTime()) ? d : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const data = `${dataValida.getFullYear()}-${pad(dataValida.getMonth() + 1)}-${pad(dataValida.getDate())}`
  const hora = `${pad(dataValida.getHours())}:${pad(dataValida.getMinutes())}:${pad(dataValida.getSeconds())}`
  return { data, hora }
}

export const ModalAssinaturaEletronica: React.FC<ModalAssinaturaEletronicaProps> = ({
  aberto,
  onOpenChange,
  tituloDocumento,
  subtitulo,
  documentoId,
  documentoTipo = 'edital',
  deliberacaoId,
  hashDocumento = '',
  nomeInicial = '',
  cpfInicial = '',
  cargoInicial = '',
  formatoInicial = 'desenho',
  assinaturaVisualInicial,
  assinaturaTextoInicial,
  onConfirmar,
  salvando = false,
  permitirEditarIdentificacao = true,
  permitirDataHoraHistorica = false,
  dataHoraInicial,
}) => {
  const [nome, setNome] = useState(nomeInicial)
  const [cpf, setCpf] = useState(cpfInicial)
  const [cargo, setCargo] = useState(cargoInicial)
  const [cpfErro, setCpfErro] = useState<string | null>(null)

  // Data e hora declaradas da assinatura (pode ser histórica ou momento presente)
  const [dataAssinaturaCustom, setDataAssinaturaCustom] = useState('')
  const [horaAssinaturaCustom, setHoraAssinaturaCustom] = useState('')
  const [usarDataCustomizada, setUsarDataCustomizada] = useState(false)
  const [dataHoraErro, setDataHoraErro] = useState<string | null>(null)

  const [captura, setCaptura] = useState<DadosCapturaAssinatura>({
    formato: formatoInicial,
    assinaturaVisual: assinaturaVisualInicial,
    assinaturaTexto: assinaturaTextoInicial || nomeInicial,
  })

  const [erroEnvio, setErroEnvio] = useState<string | null>(null)

  // Modo de assinatura: 'desktop' (traço/texto/branco nesta tela) ou 'mobile' (QR Code lido no celular)
  const [modoAba, setModoAba] = useState<'desktop' | 'mobile'>('desktop')
  const [sessaoToken, setSessaoToken] = useState<string | null>(null)
  const [sessaoUrl, setSessaoUrl] = useState<string>('')
  const [gerandoSessao, setGerandoSessao] = useState(false)
  const [erroSessao, setErroSessao] = useState<string | null>(null)
  const [assinadoMobileSucesso, setAssinadoMobileSucesso] = useState(false)
  const [dadosMobileAssinado, setDadosMobileAssinado] = useState<{
    nome: string
    cpf: string
    formato: 'desenho' | 'texto' | 'em_branco'
    assinaturaVisual?: string
    assinaturaTexto?: string
    dataHoraAssinatura?: string
  } | null>(null)

  // Sincronizar quando o modal abrir
  React.useEffect(() => {
    if (aberto) {
      setNome(nomeInicial)
      setCpf(cpfInicial)
      setCargo(cargoInicial)
      setCpfErro(null)
      setErroEnvio(null)
      setDataHoraErro(null)

      const inicial = extrairDataHoraLocal(dataHoraInicial)
      setDataAssinaturaCustom(inicial.data)
      setHoraAssinaturaCustom(inicial.hora)
      // Se vier dataHoraInicial informada diferente de agora ou se a prop permitir estiver ativa
      setUsarDataCustomizada(!!dataHoraInicial)

      setCaptura({
        formato: formatoInicial,
        assinaturaVisual: assinaturaVisualInicial,
        assinaturaTexto: assinaturaTextoInicial || nomeInicial,
      })

      // Reset do estado mobile
      setModoAba('desktop')
      setSessaoToken(null)
      setSessaoUrl('')
      setErroSessao(null)
      setAssinadoMobileSucesso(false)
      setDadosMobileAssinado(null)
    }
  }, [
    aberto,
    nomeInicial,
    cpfInicial,
    cargoInicial,
    formatoInicial,
    assinaturaVisualInicial,
    assinaturaTextoInicial,
    dataHoraInicial,
  ])

  // Função para criar a sessão mobile ao selecionar a aba celular ou ao pedir novo QR
  const iniciarSessaoMobile = async () => {
    setGerandoSessao(true)
    setErroSessao(null)
    setAssinadoMobileSucesso(false)

    try {
      let dataHoraIso: string | undefined = undefined
      if (permitirDataHoraHistorica && usarDataCustomizada && dataAssinaturaCustom) {
        const horaLimpa = (horaAssinaturaCustom || '12:00:00').trim()
        const partesHora = horaLimpa.split(':')
        const hh = String(partesHora[0] || '00').padStart(2, '0')
        const mm = String(partesHora[1] || '00').padStart(2, '0')
        const ss = String(partesHora[2] || '00').padStart(2, '0')
        const isoCandidate = `${dataAssinaturaCustom}T${hh}:${mm}:${ss}`
        const dateObj = new Date(isoCandidate)
        if (!isNaN(dateObj.getTime())) {
          dataHoraIso = dateObj.toISOString()
        }
      }

      const resp = await api.criarSessaoAssinaturaMobile({
        documentoId: documentoId || 'novo',
        documentoTipo: documentoTipo || 'edital',
        deliberacaoId: deliberacaoId,
        tituloDocumento: tituloDocumento,
        hashDocumento: hashDocumento || 'hash-provisorio',
        signatarioNome: nome.trim(),
        signatarioCpf: cpf.replace(/\D/g, ''),
        signatarioCargo: cargo.trim(),
        permitirDataHistorica: permitirDataHistorica,
        dataHoraDeclarada: dataHoraIso,
      })

      if (resp && resp.token) {
        setSessaoToken(resp.token)
        // A URL do QR deve apontar para o app publicado (produção), não para preview/localhost
        const hostAtual = window.location.host
        const originProd =
          hostAtual.includes('localhost') || hostAtual.includes('preview')
            ? 'https://koinon.goskip.app'
            : window.location.origin
        const urlCompleta = `${originProd}/assinar/${resp.token}`
        setSessaoUrl(urlCompleta)
      } else {
        setErroSessao('Não foi possível gerar a sessão de assinatura.')
      }
    } catch (err: any) {
      console.error('Erro ao criar sessão de assinatura mobile:', err)
      setErroSessao(err?.message || 'Falha ao gerar QR Code para assinatura no celular.')
    } finally {
      setGerandoSessao(false)
    }
  }

  // Efeito ao trocar para aba mobile: gerar sessão se ainda não tiver token
  React.useEffect(() => {
    if (
      aberto &&
      modoAba === 'mobile' &&
      !sessaoToken &&
      !gerandoSessao &&
      !assinadoMobileSucesso
    ) {
      iniciarSessaoMobile()
    }
  }, [aberto, modoAba, sessaoToken])

  // Polling automático para verificar se o usuário assinou no celular
  React.useEffect(() => {
    if (!aberto || modoAba !== 'mobile' || !sessaoToken || assinadoMobileSucesso) {
      return
    }

    let ativo = true
    const intervalo = setInterval(async () => {
      try {
        const info = await api.consultarSessaoAssinatura(sessaoToken)
        if (!ativo) return

        if (info.status === 'assinada') {
          setAssinadoMobileSucesso(true)
          clearInterval(intervalo)

          const dadosRecebidos = {
            nome: info.signatarioNome || nome,
            cpf: info.signatarioCpf || cpf.replace(/\D/g, ''),
            cargo: info.signatarioCargo || cargo,
            formato: (info.formatoAssinatura as 'desenho' | 'texto' | 'em_branco') || 'desenho',
            assinaturaVisual: info.assinaturaVisual,
            assinaturaTexto: info.assinaturaTexto,
            dataHoraAssinatura: info.dataHoraDeclarada || info.assinadoEm,
          }
          setDadosMobileAssinado(dadosRecebidos)

          // Disparar confirmação do modal para sincronizar automaticamente com a tela pai
          try {
            await onConfirmar(dadosRecebidos)
          } catch (e) {
            console.error('Erro ao sincronizar assinatura mobile na tela pai:', e)
          }
        } else if (info.status === 'expirada') {
          setErroSessao(
            'Esta sessão de assinatura expirou (limite de 15 minutos). Gere um novo QR Code.',
          )
          clearInterval(intervalo)
        } else if (info.status === 'cancelada') {
          setErroSessao('Esta sessão de assinatura foi cancelada.')
          clearInterval(intervalo)
        }
      } catch (err) {
        // Erros transitórios de rede no polling são ignorados para não assustar o usuário
        console.debug('Polling sessão assinatura:', err)
      }
    }, 2500)

    return () => {
      ativo = false
      clearInterval(intervalo)
    }
  }, [aberto, modoAba, sessaoToken, assinadoMobileSucesso, nome, cpf, cargo, onConfirmar])

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome.trim()) {
      return
    }

    const rawCpf = cpf.replace(/\D/g, '')
    if (rawCpf.length > 0 && !validarCpf(cpf)) {
      setCpfErro(MSG_CPF_INVALIDO)
      return
    }
    setCpfErro(null)
    setErroEnvio(null)
    setDataHoraErro(null)

    let dataHoraIso: string | undefined = undefined

    if (permitirDataHoraHistorica && usarDataCustomizada) {
      if (!dataAssinaturaCustom) {
        setDataHoraErro('Informe a data da assinatura.')
        return
      }

      // Validar data e hora informadas
      const horaLimpa = (horaAssinaturaCustom || '12:00:00').trim()
      const partesHora = horaLimpa.split(':')
      const hh = String(partesHora[0] || '00').padStart(2, '0')
      const mm = String(partesHora[1] || '00').padStart(2, '0')
      const ss = String(partesHora[2] || '00').padStart(2, '0')

      // Construir data no fuso local e obter ISO
      const isoCandidate = `${dataAssinaturaCustom}T${hh}:${mm}:${ss}`
      const dateObj = new Date(isoCandidate)
      if (isNaN(dateObj.getTime())) {
        setDataHoraErro('Data ou hora inválida.')
        return
      }
      dataHoraIso = dateObj.toISOString()
    }

    try {
      await onConfirmar({
        nome: nome.trim(),
        cpf: rawCpf,
        cargo: cargo.trim(),
        formato: captura.formato,
        assinaturaVisual: captura.formato === 'desenho' ? captura.assinaturaVisual : undefined,
        assinaturaTexto:
          captura.formato === 'texto' ? captura.assinaturaTexto || nome.trim() : undefined,
        dataHoraAssinatura: dataHoraIso,
      })
    } catch (err: any) {
      const msg =
        err?.message?.includes('Failed to fetch') || !err?.status || err?.status === 0
          ? 'Falha de comunicação com o servidor (conexão interrompida). O traço desenhado foi preservado. Por favor, tente novamente.'
          : err?.message ||
            'Falha ao registrar assinatura eletrônica. O traço desenhado foi preservado para nova tentativa.'
      setErroEnvio(msg)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white border-[#5A6B82]/25 rounded-[14px] shadow-[0_4px_24px_rgba(0,43,94,0.06)] text-[#002B5E]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[8px] bg-[#0066FF]/10 border border-[#0066FF]/25 flex items-center justify-center text-[#002B5E]">
              <ShieldCheck className="h-5 w-5 text-[#0066FF]" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[#002B5E] tracking-[-0.02em]">
                Assinatura Eletrônica
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5A6B82]">
                {subtitulo || `Autenticação do documento "${tituloDocumento}" com carimbo SHA-256`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Abas de Modo: Assinar no Computador ou Assinar via Celular (QR Code) */}
        <div className="grid grid-cols-2 p-1 bg-[#F3F7FC] rounded-[10px] border border-[#5A6B82]/20 text-xs gap-1">
          <button
            type="button"
            onClick={() => setModoAba('desktop')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[8px] font-medium transition-colors ${
              modoAba === 'desktop'
                ? 'bg-white text-[#002B5E] shadow-sm font-semibold'
                : 'text-[#5A6B82] hover:text-[#002B5E]'
            }`}
          >
            <Laptop className="h-3.5 w-3.5" />
            Neste Computador
          </button>
          <button
            type="button"
            onClick={() => setModoAba('mobile')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[8px] font-medium transition-colors ${
              modoAba === 'mobile'
                ? 'bg-white text-[#0066FF] shadow-sm font-semibold'
                : 'text-[#5A6B82] hover:text-[#002B5E]'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 text-[#0066FF]" />
            Celular (QR Code)
          </button>
        </div>

        {modoAba === 'mobile' ? (
          <div className="space-y-4 pt-1">
            {assinadoMobileSucesso ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-[12px] text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-2.5 py-0.5">
                    Assinado
                  </Badge>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">
                    Assinatura Mobile Confirmada!
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Signatário: <strong>{dadosMobileAssinado?.nome || nome}</strong>
                    {dadosMobileAssinado?.cpf
                      ? ` (CPF: ${formatarCpf(dadosMobileAssinado.cpf)})`
                      : ''}
                  </p>
                  {dadosMobileAssinado?.dataHoraAssinatura && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Data declarada:{' '}
                      {new Date(dadosMobileAssinado.dataHoraAssinatura).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-emerald-800 bg-emerald-100/70 p-2.5 rounded-[8px]">
                  Os dados foram recebidos do dispositivo móvel e sincronizados com este documento.
                </p>
                <div className="pt-2 flex justify-center">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="bg-[#002B5E] hover:bg-[#001D40] text-white text-xs font-medium rounded-[10px]"
                  >
                    Fechar e Ver Documento
                  </Button>
                </div>
              </div>
            ) : gerandoSessao ? (
              <div className="p-8 border border-[#5A6B82]/20 rounded-[12px] text-center space-y-3 bg-[#F3F7FC]">
                <Loader2 className="w-8 h-8 text-[#0066FF] animate-spin mx-auto" />
                <p className="text-xs text-[#002B5E] font-medium">
                  Gerando sessão segura e QR Code para assinatura mobile...
                </p>
              </div>
            ) : erroSessao ? (
              <div className="p-5 bg-red-50 border border-red-200 rounded-[12px] text-center space-y-3">
                <p className="text-xs text-red-700 font-medium">{erroSessao}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={iniciarSessaoMobile}
                  className="text-xs gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Gerar Novo QR Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-white border border-[#0066FF]/25 rounded-[12px] text-center space-y-3 shadow-sm">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#002B5E]">
                    <QrCode className="w-4 h-4 text-[#0066FF]" />
                    <span>Aponte a câmera do celular para assinar</span>
                  </div>

                  {sessaoUrl && (
                    <div className="flex justify-center py-2">
                      <div className="p-3 bg-white border border-slate-200 rounded-[12px] shadow-sm">
                        <QrCodeSvg value={sessaoUrl} size={200} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0066FF] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0066FF]"></span>
                    </span>
                    <span className="text-xs text-[#0066FF] font-medium">
                      Aguardando assinatura no dispositivo móvel...
                    </span>
                  </div>

                  <p className="text-[11px] text-[#5A6B82] leading-relaxed max-w-sm mx-auto">
                    Ao concluir o desenho ou digitação no celular, este computador registrará e
                    atualizará o documento automaticamente com o selo{' '}
                    <strong className="text-emerald-700">Assinado</strong>.
                  </p>
                </div>

                <div className="p-3 bg-[#F3F7FC] border border-[#5A6B82]/20 rounded-[10px] space-y-1.5 text-[11px] text-[#5A6B82]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#002B5E]">Validade do QR Code:</span>
                    <span className="text-amber-700 font-medium">15 minutos (uso único)</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="truncate max-w-[280px] font-mono text-slate-500">
                      {sessaoUrl}
                    </span>
                    <button
                      type="button"
                      onClick={iniciarSessaoMobile}
                      className="text-[#0066FF] hover:underline flex items-center gap-1 font-medium"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Renovar
                    </button>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="text-xs border-[#5A6B82]/25 text-[#002B5E] rounded-[10px]"
                  >
                    Fechar
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleConfirmar} className="space-y-4 pt-1">
            {/* Identificação do Assinante */}
            {permitirEditarIdentificacao ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs text-[#002B5E] font-medium">Nome Completo</Label>
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    disabled={salvando}
                    className="text-xs h-8 bg-white border-[#5A6B82]/25 rounded-[10px]"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-[#002B5E] font-medium">CPF</Label>
                  <Input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => {
                      setCpf(formatarCpf(e.target.value))
                      setCpfErro(null)
                    }}
                    disabled={salvando}
                    className={`text-xs h-8 bg-white border-[#5A6B82]/25 rounded-[10px] ${cpfErro ? 'border-red-600' : ''}`}
                  />
                  {cpfErro && <p className="text-[10px] text-red-600">{cpfErro}</p>}
                </div>

                {cargoInicial !== undefined && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-[#5A6B82]">Cargo / Representação</Label>
                    <Input
                      type="text"
                      placeholder="Ex: Síndico, Presidente da Mesa..."
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      disabled={salvando}
                      className="text-xs h-8 bg-white border-[#5A6B82]/25 rounded-[10px]"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-[10px] bg-[#F3F7FC] border border-[#5A6B82]/25 text-xs flex justify-between items-center">
                <div>
                  <p className="font-semibold text-[#002B5E]">{nome}</p>
                  {cpf && (
                    <p className="text-[10px] text-[#5A6B82] font-mono">CPF: {formatarCpf(cpf)}</p>
                  )}
                </div>
                {cargo && <span className="text-[11px] text-[#5A6B82]">{cargo}</span>}
              </div>
            )}

            {/* Data e Hora Declaradas da Assinatura (para documentos históricos ou registro no ato) */}
            {permitirDataHoraHistorica && (
              <div className="p-3 bg-[#F3F7FC] border border-[#5A6B82]/25 rounded-[10px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#0066FF]" />
                    <Label className="text-xs font-semibold text-[#002B5E] cursor-pointer">
                      Data e Hora da Assinatura
                    </Label>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-[#5A6B82] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={usarDataCustomizada}
                      onChange={(e) => {
                        setUsarDataCustomizada(e.target.checked)
                        setDataHoraErro(null)
                      }}
                      className="rounded border-[#5A6B82]/30 text-[#0066FF] focus:ring-[#0066FF] h-3.5 w-3.5"
                      disabled={salvando}
                    />
                    <span>Informar data/hora histórica</span>
                  </label>
                </div>

                {usarDataCustomizada ? (
                  <div className="space-y-2 pt-1 border-t border-[#5A6B82]/15">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-[#002B5E] font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-[#5A6B82]" />
                          Data da Assinatura
                        </Label>
                        <Input
                          type="date"
                          value={dataAssinaturaCustom}
                          onChange={(e) => {
                            setDataAssinaturaCustom(e.target.value)
                            setDataHoraErro(null)
                          }}
                          disabled={salvando}
                          className="text-xs h-8 bg-white border-[#5A6B82]/25 rounded-[10px]"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-[#002B5E] font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#5A6B82]" />
                          Hora (HH:mm:ss)
                        </Label>
                        <Input
                          type="time"
                          step="1"
                          value={horaAssinaturaCustom}
                          onChange={(e) => {
                            setHoraAssinaturaCustom(e.target.value)
                            setDataHoraErro(null)
                          }}
                          disabled={salvando}
                          className="text-xs h-8 bg-white border-[#5A6B82]/25 rounded-[10px]"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-[#5A6B82] leading-tight">
                      A data e hora informadas serão carimbadas no documento como{' '}
                      <strong className="text-[#002B5E]">Data da Assinatura</strong>. A auditoria
                      técnica continuará registrando o momento exato da operação no sistema.
                    </p>

                    {dataHoraErro && (
                      <p className="text-[10px] text-red-600 font-medium">{dataHoraErro}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#5A6B82]">
                    Será registrado o <strong className="text-[#002B5E]">momento atual</strong> como
                    data e hora da assinatura.
                  </p>
                )}
              </div>
            )}

            {/* Componente Reutilizável de Escolha do Modo de Assinatura */}
            <SeletorAssinatura
              valorInicial={captura}
              nomeSugerido={nome}
              onChange={(dados) => setCaptura(dados)}
              disabled={salvando}
            />

            {erroEnvio && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-[10px] text-xs text-red-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-red-700">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-600" />
                  Erro ao gravar assinatura
                </p>
                <p className="text-[11px] leading-relaxed">{erroEnvio}</p>
              </div>
            )}

            <div className="p-2.5 bg-[#F3F7FC] border border-[#5A6B82]/25 rounded-[10px] text-[11px] text-[#5A6B82] leading-relaxed">
              <span className="font-semibold text-[#002B5E] block">Integridade Criptográfica:</span>
              A confirmação gerará um hash SHA-256 do documento vinculado aos seus dados.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={salvando}
                className="text-xs border-[#5A6B82]/25 text-[#002B5E] rounded-[10px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvando || !nome.trim()}
                className="bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-medium gap-1.5 rounded-[10px] border-0"
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gravando Assinatura...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" /> Assinar Documento
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

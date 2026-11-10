import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileCheck2,
  Smartphone,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
  User,
  PenTool,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { KoinonLogo } from '@/components/brand/KoinonLogo'
import { EndossoA3One } from '@/components/brand/EndossoA3One'
import {
  SeletorAssinatura,
  DadosCapturaAssinatura,
} from '@/components/assinatura/SeletorAssinatura'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatarCpf, validarCpf } from '@/lib/cpf'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface SessaoMobileInfo {
  token: string
  status: 'pendente' | 'assinada' | 'expirada' | 'cancelada'
  documentoId?: string
  documentoTipo: string
  deliberacaoId?: string
  tituloDocumento: string
  hashDocumento: string
  signatarioNome: string
  signatarioCpf: string
  signatarioCargo: string
  permitirDataHistorica: boolean
  dataHoraDeclarada?: string
  expiraEm: string
  assinadoEm?: string
}

export function AssinaturaMobilePublicaPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [carregando, setCarregando] = useState(true)
  const [erroSessao, setErroSessao] = useState<string | null>(null)
  const [sessao, setSessao] = useState<SessaoMobileInfo | null>(null)

  // Formulário de confirmação do signatário
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [usarDataHistorica, setUsarDataHistorica] = useState(false)
  const [dataHoraHistorica, setDataHoraHistorica] = useState('')

  // Captura da assinatura
  const [dadosCaptura, setDadosCaptura] = useState<DadosCapturaAssinatura>({
    formato: 'desenho',
    assinaturaTexto: '',
    assinaturaVisual: '',
  })

  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)

  // Carregar dados da sessão
  useEffect(() => {
    if (!token) {
      setErroSessao('Token de assinatura não fornecido.')
      setCarregando(false)
      return
    }

    const carregar = async () => {
      try {
        setCarregando(true)
        setErroSessao(null)
        const resp = await api.consultarSessaoAssinatura(token)

        setSessao(resp)

        // Pré-preencher com dados da sessão ou do usuário logado
        const nomeInicial = resp.signatarioNome || user?.name || ''
        const cpfInicial = resp.signatarioCpf
          ? formatarCpf(resp.signatarioCpf)
          : user?.cpf
            ? formatarCpf(user.cpf)
            : ''
        setNome(nomeInicial)
        setCpf(cpfInicial)

        if (resp.dataHoraDeclarada) {
          setUsarDataHistorica(true)
          setDataHoraHistorica(resp.dataHoraDeclarada)
        }
      } catch (err: any) {
        console.error('Erro ao consultar sessão:', err)
        setErroSessao(getErrorMessage(err, 'Sessão de assinatura não encontrada ou expirada.'))
      } finally {
        setCarregando(false)
      }
    }

    carregar()
  }, [token, user])

  // Submissão da assinatura pelo mobile
  const handleConfirmarAssinatura = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !sessao) return

    if (!nome.trim()) {
      setErroEnvio('Informe o nome completo do signatário.')
      return
    }

    if (cpf.trim() && !validarCpf(cpf)) {
      setErroEnvio('CPF informado é inválido.')
      return
    }

    if (dadosCaptura.formato === 'desenho' && !dadosCaptura.assinaturaVisual) {
      setErroEnvio('Desenhe sua assinatura na área indicada antes de confirmar.')
      return
    }

    if (dadosCaptura.formato === 'texto' && !dadosCaptura.assinaturaTexto.trim()) {
      setErroEnvio('Digite seu nome completo para a assinatura por extenso.')
      return
    }

    setEnviando(true)
    setErroEnvio(null)

    try {
      const dataHoraFinal =
        usarDataHistorica && dataHoraHistorica.trim() ? dataHoraHistorica : undefined

      const resp = await api.confirmarAssinaturaMobile(token, {
        nome: nome.trim(),
        cpf: cpf.trim() ? cpf.replace(/\D/g, '') : undefined,
        formato: dadosCaptura.formato,
        assinaturaVisual: dadosCaptura.assinaturaVisual,
        assinaturaTexto: dadosCaptura.assinaturaTexto || nome.trim(),
        dataHoraDeclarada: dataHoraFinal,
      })

      setSucesso(true)
      setMensagemSucesso(resp.message || 'Assinatura eletrônica concluída com sucesso!')
    } catch (err: any) {
      console.error('Erro ao confirmar assinatura no celular:', err)
      setErroEnvio(getErrorMessage(err, 'Falha ao registrar assinatura. Tente novamente.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/40 text-slate-800 flex flex-col justify-between p-4 sm:p-6">
      <header className="max-w-lg mx-auto w-full pt-4 pb-2 flex items-center justify-between">
        <KoinonLogo size={36} />
        <Badge
          variant="outline"
          className="gap-1.5 border-blue-200 text-[#0066FF] bg-blue-50/60 font-medium"
        >
          <Smartphone className="w-3.5 h-3.5" />
          Assinatura Mobile
        </Badge>
      </header>

      <main className="max-w-lg mx-auto w-full my-auto py-4">
        {carregando ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
            <div className="w-10 h-10 border-4 border-[#0066FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-600 font-medium">
              Validando sessão de assinatura segura...
            </p>
          </div>
        ) : erroSessao || !sessao ? (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-red-200 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sessão Inválida ou Expirada</h2>
              <p className="text-sm text-slate-600 mt-1">
                {erroSessao || 'Este link de assinatura não é mais válido ou expirou.'}
              </p>
            </div>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              Gere um novo QR Code no computador para realizar a assinatura. Cada link tem uso único
              e expira em 15 minutos por segurança.
            </p>
          </div>
        ) : sessao.status === 'assinada' || sucesso ? (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-emerald-200 shadow-sm text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 mb-2">
                Documento Assinado
              </Badge>
              <h2 className="text-xl font-bold text-slate-900">Assinatura Concluída!</h2>
              <p className="text-sm text-slate-600 mt-2">
                {mensagemSucesso ||
                  'Sua assinatura eletrônica foi confirmada e encadeada na trilha de auditoria do condomínio.'}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Documento:</span>
                <span className="font-semibold text-slate-800">{sessao.tituloDocumento}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Signatário:</span>
                <span className="font-semibold text-slate-800">
                  {nome || sessao.signatarioNome}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Canal:</span>
                <span className="font-semibold text-emerald-700">assinado via mobile</span>
              </div>
              {sessao.hashDocumento && (
                <div className="pt-1">
                  <span className="text-slate-500 block mb-0.5">Hash SHA-256:</span>
                  <code className="font-mono text-[10px] text-slate-700 break-all block bg-white p-1.5 rounded border border-slate-200">
                    {sessao.hashDocumento}
                  </code>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/70 text-xs text-blue-900 flex items-start gap-2 text-left">
              <ShieldCheck className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
              <span>
                A tela no computador já foi atualizada automaticamente para o estado{' '}
                <strong>Assinado</strong>. Você já pode fechar esta aba no celular.
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            {/* Cabeçalho do documento */}
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className="text-xs uppercase font-semibold text-[#0066FF] border-blue-300 bg-blue-50"
                >
                  {sessao.documentoTipo === 'edital'
                    ? 'Edital de Convocação'
                    : sessao.documentoTipo === 'ata'
                      ? 'Ata de Assembleia'
                      : 'Documento Oficial'}
                </Badge>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 15 min
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 leading-snug">
                {sessao.tituloDocumento}
              </h1>
              {sessao.hashDocumento && (
                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">Hash: {sessao.hashDocumento.substring(0, 24)}...</span>
                </div>
              )}
            </div>

            {erroEnvio && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Não foi possível assinar</AlertTitle>
                <AlertDescription className="text-xs">{erroEnvio}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleConfirmarAssinatura} className="space-y-4">
              {/* Identificação do Signatário */}
              <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <User className="w-3.5 h-3.5 text-[#0066FF]" />
                  <span>Identificação do Signatário</span>
                </div>

                <div>
                  <Label htmlFor="signatarioNome" className="text-xs text-slate-600">
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="signatarioNome"
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: João da Silva"
                    required
                    className="mt-1 bg-white text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="signatarioCpf" className="text-xs text-slate-600">
                    CPF (opcional para identificação no carimbo)
                  </Label>
                  <Input
                    id="signatarioCpf"
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatarCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="mt-1 bg-white text-sm font-mono"
                  />
                </div>
              </div>

              {/* Data declarada histórica (se configurada na sessão) */}
              {sessao.permitirDataHistorica && (
                <div className="space-y-2 bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-xs">
                  <div className="flex items-center gap-2 font-medium text-amber-900">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>Data Declarada da Assinatura</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Esta sessão possui data de assinatura histórica declarada. O registro preservará
                    a auditoria técnica de momento no servidor.
                  </p>
                  <Input
                    type="datetime-local"
                    step="1"
                    value={dataHoraHistorica}
                    onChange={(e) => setDataHoraHistorica(e.target.value)}
                    className="bg-white text-xs mt-1 font-mono"
                  />
                </div>
              )}

              {/* Desenho ou Texto da Assinatura */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-[#0066FF]" />
                    <span>Assinatura Digital (desenhe na tela com o dedo)</span>
                  </Label>
                  <span className="text-[10px] text-blue-600 font-medium">Área ampliada</span>
                </div>
                <div className="border border-slate-200 rounded-xl p-2.5 sm:p-3 bg-white shadow-xs">
                  <SeletorAssinatura
                    nomeSugerido={nome || sessao.signatarioNome}
                    onChange={setDadosCaptura}
                  />
                </div>
              </div>

              {/* Botão de confirmação */}
              <Button
                type="submit"
                disabled={enviando}
                className="w-full bg-[#0066FF] hover:bg-blue-700 text-white font-semibold py-6 rounded-xl shadow-md gap-2"
              >
                {enviando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registrando Assinatura...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Confirmar e Assinar pelo Celular
                  </>
                )}
              </Button>

              <div className="text-[11px] text-slate-500 text-center leading-relaxed">
                Ao clicar em confirmar, os metadados técnicos deste dispositivo móvel e o hash do
                documento serão vinculados na cadeia criptográfica de auditoria regimental.
              </div>
            </form>
          </div>
        )}
      </main>

      <footer className="max-w-lg mx-auto w-full pt-4 pb-2 text-center">
        <EndossoA3One variant="color" layout="inline" className="justify-center" />
      </footer>
    </div>
  )
}

export default AssinaturaMobilePublicaPage

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCondoConfig } from '@/context/CondoConfigContext'
import {
  api,
  type DeliberacaoRecord,
  type ItemPautaRecord,
  type CredenciamentoRecord,
} from '@/lib/api'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  Vote,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { urnaAudio } from '@/lib/urnaAudio'
import { Switch } from '@/components/ui/switch'

type PassoVotacao = '2fa_cpf' | '2fa_otp' | 'cabine' | 'revisao' | 'concluido'
type OpcaoVoto = 'favoravel' | 'contrario' | 'abstencao'

export const VotacaoPage: React.FC = () => {
  const { user, unidadeSelecionada, isOnline } = useAuth()
  const { somVotoUrl } = useCondoConfig()
  const navigate = useNavigate()

  // Estados principais
  const [passo, setPasso] = useState<PassoVotacao>('2fa_cpf')
  const [deliberacao, setDeliberacao] = useState<DeliberacaoRecord | null>(null)
  const [itensPauta, setItensPauta] = useState<ItemPautaRecord[]>([])
  const [credenciamento, setCredenciamento] = useState<CredenciamentoRecord | null>(null)
  const [jaVotou, setJaVotou] = useState(false)
  const [isPresencial, setIsPresencial] = useState(false)
  const [carregando, setCarregando] = useState(true)

  // Estados 2FA / OTP
  const [cpf, setCpf] = useState('')
  const [sessaoId, setSessaoId] = useState<string | null>(null)
  const [tokenVoto, setTokenVoto] = useState<string | null>(null)
  const [celularMascara, setCelularMascara] = useState('')
  const [otpCodigo, setOtpCodigo] = useState('')
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null)
  const [tentativasRestantes, setTentativasRestantes] = useState(3)
  const [segundosRestantes, setSegundosRestantes] = useState(300)
  const [bloqueadoProgressivo, setBloqueadoProgressivo] = useState(false)

  // Estados dos votos { [itemId]: 'favoravel' | 'contrario' | 'abstencao' }
  const [votosSelecionados, setVotosSelecionados] = useState<Record<string, OpcaoVoto>>({})
  const [dialogConfirmacaoAberto, setDialogConfirmacaoAberto] = useState(false)
  const [enviandoVoto, setEnviandoVoto] = useState(false)
  const [somUrnaAtivo, setSomUrnaAtivo] = useState(() => urnaAudio.isSomAtivado())
  const [resultadoRecibo, setResultadoRecibo] = useState<{
    reciboCodigo: string
    hashAbreviado: string
    dataHora: string
  } | null>(null)

  // Carregar dados iniciais
  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      if (!unidadeSelecionada) {
        setCarregando(false)
        return
      }
      setCarregando(true)
      try {
        const [delib, cred] = await Promise.all([
          api.getDeliberacaoAtiva(),
          api.getCredenciamentoPorUnidade(unidadeSelecionada.id),
        ])

        if (!ativo) return
        setDeliberacao(delib)
        setCredenciamento(cred)

        if (cred) {
          setCpf(cred.cpf)
        }

        if (delib) {
          // Itens de pauta
          const itens = await api.getItensPauta(delib.id)
          if (!ativo) return
          setItensPauta(itens)

          // Já votou?
          const comp = await api.getComparecimento(delib.id, unidadeSelecionada.id)
          if (!ativo) return
          if (comp) setJaVotou(true)

          // Presença física?
          const presencas = await api.getPresencas(delib.id)
          if (!ativo) return
          const temPresencial = presencas.some(
            (p) => p.unidade === unidadeSelecionada.id && p.tipo === 'presencial',
          )
          setIsPresencial(temPresencial)
        }
      } catch (err) {
        console.error('Erro ao inicializar cabine de votação:', err)
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [unidadeSelecionada])

  // Timer regressivo do OTP (5 minutos)
  useEffect(() => {
    if (passo !== '2fa_otp' || segundosRestantes <= 0) return
    const interval = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [passo, segundosRestantes])

  // 1. Enviar OTP (valida CPF e vínculo)
  const handleSolicitarOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliberacao || !unidadeSelecionada) return
    if (!isOnline) {
      toast({
        title: 'Sem conexão com a internet',
        description: 'Aguarde o restabelecimento da rede para solicitar o código OTP.',
        variant: 'destructive',
      })
      return
    }

    setCarregando(true)
    try {
      const resp = await api.enviarOtp({
        unidadeId: unidadeSelecionada.id,
        cpf: cpf,
        deliberacaoId: deliberacao.id,
      })

      setSessaoId(resp.sessaoId)
      setCelularMascara(resp.celularMascara)
      setSegundosRestantes(resp.expiraEmSegundos || 300)
      if (resp.devOtpCode) {
        setDevOtpCode(resp.devOtpCode)
      }
      setPasso('2fa_otp')
      toast({
        title: 'Código OTP Gerado',
        description: `Código enviado para o telefone ${resp.celularMascara}.`,
      })
    } catch (err: any) {
      console.error('Erro ao solicitar OTP:', err)
      const mensagemErro =
        getErrorMessage(err) ||
        err?.message ||
        'Verifique o CPF informado e a situação cadastral da unidade.'
      toast({
        title: 'Falha na validação',
        description: mensagemErro,
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  // 2. Validar OTP e emitir token de voto
  const handleValidarOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessaoId || !otpCodigo) return

    setCarregando(true)
    try {
      const resp = await api.validarOtp({
        sessaoId: sessaoId,
        codigo: otpCodigo,
      })

      setTokenVoto(resp.tokenVoto)
      setPasso('cabine')
      toast({
        title: 'Identidade 2FA Confirmada',
        description: 'Token criptográfico de uso único emitido. Cabine de votação liberada.',
      })
    } catch (err: any) {
      console.error('Erro ao validar OTP:', err)
      const msg = getErrorMessage(err) || err?.message || ''
      if (msg.includes('tentativa')) {
        setTentativasRestantes((prev) => Math.max(0, prev - 1))
      }
      if (msg.includes('bloqueado') || msg.includes('Limite de 3 tentativas')) {
        setBloqueadoProgressivo(true)
      }
      toast({
        title: 'Código Inválido',
        description: msg || 'O código digitado está incorreto.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  // Selecionar voto de um item
  const selecionarOpcao = (itemId: string, opcao: OpcaoVoto) => {
    setVotosSelecionados((prev) => ({
      ...prev,
      [itemId]: opcao,
    }))
  }

  // Verificar se todos os itens foram votados
  const todosVotados =
    itensPauta.length > 0 && itensPauta.every((item) => votosSelecionados[item.id])

  // 3. Confirmar e Registrar Cédula na Urna Criptográfica
  const handleConfirmarVotoFinal = async () => {
    if (!deliberacao || !tokenVoto) return
    if (!isOnline) {
      toast({
        title: 'Modo Offline',
        description: 'Não é possível registrar votos enquanto estiver desconectado.',
        variant: 'destructive',
      })
      return
    }

    setEnviandoVoto(true)
    try {
      const listaVotos = itensPauta.map((item) => ({
        itemId: item.id,
        opcao: votosSelecionados[item.id],
      }))

      const resp = await api.registrarVoto({
        tokenVoto: tokenVoto,
        deliberacaoId: deliberacao.id,
        votos: listaVotos,
        dispositivoId: navigator.userAgent,
      })

      setResultadoRecibo({
        reciboCodigo: resp.reciboCodigo,
        hashAbreviado: resp.hashAbreviado,
        dataHora: resp.dataHora,
      })
      setDialogConfirmacaoAberto(false)
      setJaVotou(true)
      setPasso('concluido')

      // RECURSO 2: Tocar o som da urna estilo TSE (ou áudio customizado configurado no condomínio) APÓS confirmação real e bem-sucedida do backend
      try {
        await urnaAudio.tocarAudioCustomizadoOuSintetizado(somVotoUrl)
      } catch (audioErr) {
        // silencioso
      }

      toast({
        title: 'Voto Registrado na Urna!',
        description: `Código de conferência: ${resp.reciboCodigo}. Voto irretratável.`,
      })
    } catch (err: any) {
      console.error('Erro ao registrar cédulas:', err)

      // RECURSO 2: Som de erro distinto (grave) quando a confirmação falhar
      try {
        urnaAudio.tocarSomErro()
      } catch {
        // silencioso
      }

      const mensagemErro =
        getErrorMessage(err) || err?.message || 'Não foi possível gravar o voto na urna.'

      toast({
        title: 'Falha no Registro',
        description: mensagemErro,
        variant: 'destructive',
      })
    } finally {
      setEnviandoVoto(false)
    }
  }

  // Casos impeditivos de votação
  if (jaVotou && passo !== 'concluido') {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="border-emerald-200 bg-emerald-50/40 text-center p-6 shadow-sm">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">Voto Já Computado</CardTitle>
          <CardDescription className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            A unidade Apto <strong>{unidadeSelecionada?.identificador}</strong> já registrou seu
            voto nesta deliberação. Por segurança e integridade eleitoral (1 Unidade = 1 Voto), o
            voto é irretratável.
          </CardDescription>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={() => navigate('/recibo')}
            >
              Visualizar Comprovante Oficial
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Voltar ao Início
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (isPresencial) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="border-amber-200 bg-amber-50/40 text-center p-6 shadow-sm">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">Canal Online Bloqueado</CardTitle>
          <CardDescription className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            Foi registrada a presença física do representante do Apto{' '}
            <strong>{unidadeSelecionada?.identificador}</strong> no plenário da assembleia. O voto
            presencial tem prevalência e impede a emissão de cédula eletrônica remota.
          </CardDescription>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              Voltar para Minha Situação
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (deliberacao && deliberacao.status !== 'EM_VOTACAO') {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="border-slate-200 text-center p-6 shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <Lock className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            Votação Não Iniciada ou Encerrada
          </CardTitle>
          <CardDescription className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            A deliberação <strong>{deliberacao.titulo}</strong> encontra-se no estado{' '}
            <span className="font-semibold text-cyan-800">{deliberacao.status}</span>. A cabine de
            votação só fica aberta durante o status <strong>EM_VOTACAO</strong>.
          </CardDescription>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              Voltar ao Início
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (credenciamento && credenciamento.status !== 'aprovado') {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="border-amber-200 bg-amber-50 text-center p-6 shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            Credenciamento Pendente
          </CardTitle>
          <CardDescription className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            Para votar, é necessário ter o credenciamento de titularidade ou procuração aprovado
            pela Mesa Diretora.
          </CardDescription>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              className="bg-cyan-700 hover:bg-cyan-800"
              onClick={() => navigate('/credenciamento')}
            >
              Regularizar Credenciamento
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Voltar
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Indicador de Passos */}
      <div className="flex items-center justify-between px-2 py-3 bg-white rounded-lg border border-slate-200 shadow-xs text-xs">
        <div
          className={`flex items-center gap-1.5 ${passo === '2fa_cpf' ? 'font-bold text-cyan-700' : 'text-slate-500'}`}
        >
          <span className="h-5 w-5 rounded-full flex items-center justify-center bg-cyan-100 text-cyan-800 text-[11px]">
            1
          </span>
          <span>Confirmação CPF</span>
        </div>
        <div className="h-px w-8 bg-slate-200" />
        <div
          className={`flex items-center gap-1.5 ${passo === '2fa_otp' ? 'font-bold text-cyan-700' : 'text-slate-500'}`}
        >
          <span className="h-5 w-5 rounded-full flex items-center justify-center bg-cyan-100 text-cyan-800 text-[11px]">
            2
          </span>
          <span>Código 2FA</span>
        </div>
        <div className="h-px w-8 bg-slate-200" />
        <div
          className={`flex items-center gap-1.5 ${passo === 'cabine' || passo === 'revisao' ? 'font-bold text-cyan-700' : 'text-slate-500'}`}
        >
          <span className="h-5 w-5 rounded-full flex items-center justify-center bg-cyan-100 text-cyan-800 text-[11px]">
            3
          </span>
          <span>Cédula de Votação</span>
        </div>
        <div className="h-px w-8 bg-slate-200" />
        <div
          className={`flex items-center gap-1.5 ${passo === 'concluido' ? 'font-bold text-emerald-700' : 'text-slate-500'}`}
        >
          <span className="h-5 w-5 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-800 text-[11px]">
            4
          </span>
          <span>Recibo Criptográfico</span>
        </div>
      </div>

      {/* ================= PASSO 1: CONFIRMAÇÃO DO CPF ================= */}
      {passo === '2fa_cpf' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">
              Passo 1: Autenticação de Titularidade (Fator Conhecimento)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Confirme seu CPF vinculado à unidade Apto{' '}
              <strong>{unidadeSelecionada?.identificador}</strong> para solicitar o código
              temporário de votação.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSolicitarOtp}>
            <CardContent className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="cpf" className="text-xs font-semibold text-slate-700">
                  CPF do Condômino Credenciado
                </Label>
                <Input
                  id="cpf"
                  required
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="h-11 font-mono text-sm"
                />
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200 space-y-1">
                <p>
                  <strong>Unidade:</strong> Apto {unidadeSelecionada?.identificador} (
                  {unidadeSelecionada?.bloco})
                </p>
                <p>
                  <strong>Deliberação:</strong> {deliberacao?.titulo}
                </p>
                <p className="text-[11px] text-slate-500">
                  Um código OTP de uso único será gerado e vinculado a esta sessão de voto.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/')}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={carregando || !isOnline}
                className="bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
              >
                {carregando ? 'Validando...' : 'Enviar Código 2FA'}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* ================= PASSO 2: CÓDIGO OTP ================= */}
      {passo === '2fa_otp' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">
              Passo 2: Verificação em Dois Fatores (Fator Posse)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Digite o código de 6 dígitos enviado para o número cadastrado da unidade:{' '}
              <strong>{celularMascara}</strong>
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleValidarOtp}>
            <CardContent className="space-y-4 pt-3">
              {bloqueadoProgressivo && (
                <Alert variant="destructive" className="border-red-300 bg-red-50 text-red-950">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-xs font-bold">Bloqueio Temporário Ativado</AlertTitle>
                  <AlertDescription className="text-xs">
                    Limite de 3 tentativas excedido. Para segurança do condomínio, a unidade está
                    bloqueada por 10 minutos.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5 text-center">
                <Label htmlFor="otp" className="text-xs font-semibold text-slate-700 block">
                  Código de 6 Dígitos
                </Label>
                <Input
                  id="otp"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={otpCodigo}
                  disabled={bloqueadoProgressivo}
                  onChange={(e) => setOtpCodigo(e.target.value.replace(/\D/g, ''))}
                  className="h-12 text-center text-2xl font-mono tracking-widest max-w-[200px] mx-auto border-cyan-400 focus-visible:ring-cyan-600"
                />
              </div>

              {/* Banner de código de homologação da assembleia */}
              {devOtpCode && (
                <div className="p-2.5 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-xs text-center">
                  <span className="font-semibold">
                    Ambiente de Demonstração / Homologação da Mesa:
                  </span>
                  <div className="font-mono text-sm font-extrabold text-amber-950 mt-0.5">
                    Código OTP: {devOtpCode}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500 px-2">
                <span>
                  Tentativas restantes: <strong>{tentativasRestantes}</strong> de 3
                </span>
                <span>
                  Expira em:{' '}
                  <strong>
                    {Math.floor(segundosRestantes / 60)}:
                    {(segundosRestantes % 60).toString().padStart(2, '0')}
                  </strong>
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t border-slate-100 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPasso('2fa_cpf')}
                className="text-xs text-slate-600"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Voltar
              </Button>
              <Button
                type="submit"
                disabled={carregando || bloqueadoProgressivo || otpCodigo.length !== 6}
                className="bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
              >
                {carregando ? 'Validando...' : 'Liberar Cabine de Voto'}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* ================= PASSO 3: CABINE DE VOTAÇÃO ================= */}
      {passo === 'cabine' && deliberacao && (
        <div className="space-y-6">
          {/* Cabeçalho da Deliberação */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <Badge className="bg-emerald-600 text-white text-xs uppercase font-bold tracking-wider">
                Cabine de Voto Ativa
              </Badge>

              {/* Toggle de Preferência de Som Urna TSE */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-xs">
                {somUrnaAtivo ? (
                  <Volume2 className="h-3.5 w-3.5 text-cyan-700" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span className="text-[11px] font-medium text-slate-700">Som de Urna TSE</span>
                <Switch
                  checked={somUrnaAtivo}
                  onCheckedChange={(val) => {
                    setSomUrnaAtivo(val)
                    urnaAudio.setSomAtivado(val)
                  }}
                  className="scale-75"
                />
              </div>

              <span className="text-xs text-slate-500 hidden sm:inline">
                Tipo de Cédula: <strong>{deliberacao.tipo_cedula.toUpperCase()}</strong>
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{deliberacao.titulo}</h3>
            {deliberacao.descricao && (
              <p className="text-xs text-slate-600 mt-1">{deliberacao.descricao}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span>
                <strong>Quórum de Instalação:</strong> {deliberacao.quorum_instalacao || 27}{' '}
                unidades
              </span>
              <span>
                <strong>Regra de Deliberação:</strong>{' '}
                {deliberacao.quorum_materia || 'Maioria Simples'}
              </span>
              <span>
                <strong>Unidade Votante:</strong> Apto {unidadeSelecionada?.identificador}
              </span>
            </div>
          </div>

          {/* Itens da Pauta */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Itens da Pauta em Votação ({itensPauta.length})
            </h4>

            {itensPauta.map((item) => {
              const votoAtual = votosSelecionados[item.id]

              return (
                <Card
                  key={item.id}
                  className={`border transition-all ${
                    votoAtual ? 'border-cyan-300 shadow-xs' : 'border-slate-200'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded">
                        Item {item.ordem}
                      </span>
                      {item.quorum_aplicavel && (
                        <span className="text-[11px] text-slate-500">
                          Quórum exigido: <strong>{item.quorum_aplicavel}</strong>
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 mt-1">
                      {item.titulo}
                    </CardTitle>
                    {item.texto && (
                      <CardDescription className="text-xs text-slate-600 mt-1">
                        {item.texto}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Opção Favorável */}
                      <button
                        type="button"
                        onClick={() => selecionarOpcao(item.id, 'favoravel')}
                        className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          votoAtual === 'favoravel'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                        }`}
                      >
                        <span className="text-sm">Favorável (Sim)</span>
                        <span
                          className={`text-[10px] ${votoAtual === 'favoravel' ? 'text-emerald-100' : 'text-slate-400'}`}
                        >
                          Aprova a matéria
                        </span>
                      </button>

                      {/* Opção Contrário */}
                      <button
                        type="button"
                        onClick={() => selecionarOpcao(item.id, 'contrario')}
                        className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          votoAtual === 'contrario'
                            ? 'bg-red-600 text-white border-red-700 shadow-sm font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50 hover:border-red-300'
                        }`}
                      >
                        <span className="text-sm">Contrário (Não)</span>
                        <span
                          className={`text-[10px] ${votoAtual === 'contrario' ? 'text-red-100' : 'text-slate-400'}`}
                        >
                          Rejeita a matéria
                        </span>
                      </button>

                      {/* Opção Abstenção */}
                      <button
                        type="button"
                        onClick={() => selecionarOpcao(item.id, 'abstencao')}
                        className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          votoAtual === 'abstencao'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-sm font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                        }`}
                      >
                        <span className="text-sm">Abstenção</span>
                        <span
                          className={`text-[10px] ${votoAtual === 'abstencao' ? 'text-amber-100' : 'text-slate-400'}`}
                        >
                          Não opinar
                        </span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Aviso de Sigilo & Irretratabilidade */}
          <Alert className="border-cyan-200 bg-cyan-50/70 text-cyan-950">
            <Lock className="h-4 w-4 text-cyan-700" />
            <AlertTitle className="text-xs font-bold">
              Sigilo e Irretratabilidade Eleitoral
            </AlertTitle>
            <AlertDescription className="text-xs mt-0.5">
              Após confirmar o envio, o voto será gravado atomicamente na urna criptográfica SHA-256
              e não poderá ser alterado nem cancelado. Condôminos não têm acesso a resultados
              parciais antes da publicação oficial.
            </AlertDescription>
          </Alert>

          {/* Botão de Revisão */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              {todosVotados
                ? 'Todos os itens foram assinalados.'
                : `Selecione a opção de voto para todos os ${itensPauta.length} itens.`}
            </span>

            <Button
              size="lg"
              disabled={!todosVotados}
              onClick={() => setDialogConfirmacaoAberto(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
            >
              <Vote className="mr-2 h-5 w-5" /> Revisar e Confirmar Voto
            </Button>
          </div>
        </div>
      )}

      {/* ================= MODAL DE DUPLA CHECAGEM / REVISÃO ================= */}
      <Dialog open={dialogConfirmacaoAberto} onOpenChange={setDialogConfirmacaoAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Vote className="h-5 w-5 text-emerald-600" /> Dupla Checagem da Cédula Eleitoral
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Confira com atenção suas opções antes da gravação definitiva na urna criptográfica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-72 overflow-y-auto">
            {itensPauta.map((item) => {
              const opcao = votosSelecionados[item.id]
              return (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div className="max-w-[280px]">
                    <span className="font-semibold text-slate-900 block truncate">
                      {item.titulo}
                    </span>
                    <span className="text-[10px] text-slate-500">Item {item.ordem}</span>
                  </div>
                  <Badge
                    className={
                      opcao === 'favoravel'
                        ? 'bg-emerald-600 text-white uppercase'
                        : opcao === 'contrario'
                          ? 'bg-red-600 text-white uppercase'
                          : 'bg-amber-600 text-white uppercase'
                    }
                  >
                    {opcao}
                  </Badge>
                </div>
              )
            })}
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <strong>Atenção:</strong> Ao clicar em &ldquo;Gravar Voto Definitivo&rdquo;, seu token
            de voto será consumido e um recibo de conferência de 8 caracteres será gerado para sua
            guarda.
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={enviandoVoto}
              onClick={() => setDialogConfirmacaoAberto(false)}
            >
              Voltar e Alterar
            </Button>
            <Button
              size="sm"
              disabled={enviandoVoto}
              onClick={handleConfirmarVotoFinal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {enviandoVoto ? 'Gravando Cédulas...' : 'Gravar Voto Definitivo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= PASSO 4: RECIBO CONCLUÍDO ================= */}
      {passo === 'concluido' && resultadoRecibo && (
        <Card className="border-emerald-300 bg-emerald-50/50 shadow-md text-center p-6">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            Voto Registrado com Sucesso!
          </CardTitle>
          <CardDescription className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
            Sua cédula foi computada na urna digital e encadeada na cadeia SHA-256 da assembleia.
          </CardDescription>

          <div className="my-6 max-w-sm mx-auto p-4 rounded-xl bg-white border border-emerald-200 shadow-xs text-left space-y-2">
            <div className="text-center pb-2 border-b border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Código de Conferência do Voto
              </span>
              <span className="text-2xl font-mono font-extrabold text-emerald-700 tracking-wider">
                {resultadoRecibo.reciboCodigo}
              </span>
            </div>
            <div className="text-xs space-y-1 text-slate-600 pt-1">
              <p className="flex justify-between">
                <span>Unidade:</span>
                <strong className="text-slate-900">Apto {unidadeSelecionada?.identificador}</strong>
              </p>
              <p className="flex justify-between">
                <span>Data/Hora:</span>
                <strong className="text-slate-900">{resultadoRecibo.dataHora}</strong>
              </p>
              <p className="flex justify-between">
                <span>Hash da Urna (Abreviado):</span>
                <strong className="font-mono text-slate-900">
                  {resultadoRecibo.hashAbreviado}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
              onClick={() => navigate('/recibo')}
            >
              Ir para Comprovante Completo
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Voltar ao Início
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
export default VotacaoPage

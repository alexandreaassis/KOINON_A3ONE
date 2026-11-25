import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCondoConfig } from '@/context/CondoConfigContext'
import {
  api,
  type CredenciamentoRecord,
  type DeliberacaoRecord,
  type ComprovanteRecord,
} from '@/lib/api'
import { formatarIdentificadorUnidade, formatarUnidadeComBloco } from '@/lib/formatadorUnidade'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Home,
  CheckCircle2,
  Clock,
  XCircle,
  Vote,
  Receipt,
  FileCheck2,
  ShieldCheck,
  Building,
  User,
  Phone,
  Mail,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import { AvisoSemUnidadeVinculada } from '@/pages/morador/AvisoSemUnidadeVinculada'

export const MinhaSituacaoPage: React.FC = () => {
  const { user, unidadeSelecionada } = useAuth()
  const { rotuloUnidade } = useCondoConfig()
  const navigate = useNavigate()

  const [credenciamento, setCredenciamento] = useState<CredenciamentoRecord | null>(null)
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [comprovante, setComprovante] = useState<ComprovanteRecord | null>(null)
  const [jaVotou, setJaVotou] = useState(false)
  const [isPresencial, setIsPresencial] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      if (!unidadeSelecionada) {
        setCarregando(false)
        return
      }
      setCarregando(true)
      try {
        const [cred, delib] = await Promise.all([
          api.getCredenciamentoPorUnidade(unidadeSelecionada.id),
          api.getDeliberacaoAtiva(),
        ])

        if (!ativo) return
        setCredenciamento(cred)
        setDeliberacaoAtiva(delib)

        if (delib) {
          const comp = await api.getComparecimento(delib.id, unidadeSelecionada.id)
          if (!ativo) return
          setJaVotou(!!comp)

          const presencas = await api.getPresencas(delib.id)
          if (!ativo) return
          setIsPresencial(
            presencas.some((p) => p.unidade === unidadeSelecionada.id && p.tipo === 'presencial'),
          )

          const comps = await api.getComprovantesPorUnidade(unidadeSelecionada.id)
          if (!ativo) return
          const compDelib = comps.find((c) => c.deliberacao === delib.id)
          setComprovante(compDelib || comps[0] || null)
        }
      } catch (err) {
        console.error('Erro ao carregar situação do morador:', err)
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [unidadeSelecionada])

  // Gestor (admin/mesa) sem unidade vinculada: sem unidade fantasma —
  // exibe aviso em vez do painel operando sobre "unidade qualquer".
  if (!unidadeSelecionada) {
    return <AvisoSemUnidadeVinculada modulo="Minha Situação" />
  }

  const renderStatusCredenciamento = () => {
    if (!credenciamento) {
      return (
        <div className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Credenciamento Pendente de Envio
              </p>
              <p className="text-xs text-amber-700">
                Você ainda não enviou o comprovante de vínculo para habilitar o voto desta unidade.
              </p>
            </div>
          </div>
          <Link to="/credenciamento">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              Credenciar Agora
            </Button>
          </Link>
        </div>
      )
    }

    if (credenciamento.status === 'aprovado') {
      return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-emerald-950">Vínculo Aprovado pela Mesa</p>
                <Badge className="bg-emerald-600 text-white text-[10px] shrink-0 text-center leading-normal">
                  APTO A VOTAR
                </Badge>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Titular: <strong>{credenciamento.titular_nome}</strong> • Vínculo:{' '}
                <strong className="uppercase">
                  {credenciamento.tipo_vinculo === 'proprietario'
                    ? 'Proprietário (Não Residente)'
                    : credenciamento.tipo_vinculo === 'condomino'
                      ? 'Condômino (Residente)'
                      : credenciamento.tipo_vinculo === 'locatario'
                        ? 'Locatário (Inquilino)'
                        : credenciamento.tipo_vinculo}
                </strong>{' '}
                • CPF: {credenciamento.cpf}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-500 text-emerald-800 font-semibold shrink-0 text-center leading-normal self-start sm:self-center"
          >
            Vínculo Verificado
          </Badge>
        </div>
      )
    }

    if (credenciamento.status === 'rejeitado') {
      return (
        <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-600" />
            <div>
              <p className="text-sm font-bold text-red-950">Credenciamento Não Aprovado</p>
              <p className="text-xs text-red-800">
                Motivo informado pela mesa:{' '}
                {credenciamento.motivo_rejeicao || 'Documentação ilegível ou incompleta.'}
              </p>
            </div>
          </div>
          <Link to="/credenciamento">
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-800 hover:bg-red-100"
            >
              Reenviar Documentos
            </Button>
          </Link>
        </div>
      )
    }

    // Pendente de análise pela mesa
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Clock className="h-6 w-6 text-blue-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-950">Aguardando Validação da Mesa</p>
            <p className="text-xs text-blue-800 mt-0.5">
              Seus documentos foram enviados e estão na fila de análise da administração (prazo até
              abertura da votação).
            </p>
          </div>
        </div>
        <Badge className="bg-blue-600 text-white text-xs shrink-0 text-center leading-normal self-start sm:self-center">
          Em Análise
        </Badge>
      </div>
    )
  }

  const podeVotar =
    credenciamento?.status === 'aprovado' &&
    deliberacaoAtiva?.status === 'EM_VOTACAO' &&
    !jaVotou &&
    !isPresencial

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-800 via-cyan-900 to-blue-950 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Painel do Condômino
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              Olá, {user?.name || 'Morador'}!
            </h2>
            <p className="text-xs text-cyan-100 max-w-xl mt-1">
              Assembleia Geral Eletrônica do Residencial Lago Azul. Acompanhe abaixo a regularidade
              cadastral da sua unidade e participe das decisões condominiais.
            </p>
          </div>

          <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 px-4 text-center">
            <span className="text-[10px] uppercase font-semibold text-cyan-200 block">
              Sua Unidade Ativa
            </span>
            <span className="text-xl font-extrabold text-white">
              {formatarIdentificadorUnidade(
                unidadeSelecionada?.identificador,
                unidadeSelecionada?.tipo_unidade,
                rotuloUnidade,
              )}
            </span>
            <span className="text-[11px] text-cyan-300 block">
              {formatarUnidadeComBloco(unidadeSelecionada, rotuloUnidade) !==
              formatarIdentificadorUnidade(
                unidadeSelecionada?.identificador,
                unidadeSelecionada?.tipo_unidade,
                rotuloUnidade,
              )
                ? formatarUnidadeComBloco(unidadeSelecionada, rotuloUnidade)
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Dados da Unidade + Status de Credenciamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card: Dados Cadastrais da Unidade */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              <Building className="h-4 w-4 text-cyan-700" /> Dados da Unidade
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Cadastro oficial no condomínio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" /> Identificador:
              </span>
              <span className="font-semibold text-slate-900">
                {formatarUnidadeComBloco(unidadeSelecionada, rotuloUnidade)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Responsável:
              </span>
              <span className="font-semibold text-slate-900">
                {unidadeSelecionada?.responsavel_nome || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Celular 2FA:
              </span>
              <span className="font-semibold text-slate-900 font-mono">
                {unidadeSelecionada?.contato_celular || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> E-mail Notificações:
              </span>
              <span className="font-semibold text-slate-900 truncate max-w-[150px]">
                {unidadeSelecionada?.contato_email || '—'}
              </span>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Link to="/credenciamento" className="w-full">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-cyan-800 border-cyan-200 hover:bg-cyan-50"
              >
                Atualizar Vínculo ou Documentos
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Card: Status da Deliberação & Ação de Voto (2 colunas) */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-bold text-slate-800">
                  Status da Assembleia e Voto
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {deliberacaoAtiva?.titulo || 'Nenhuma assembleia ativa no momento'}
                </CardDescription>
              </div>
              {deliberacaoAtiva && (
                <Badge className="bg-slate-800 text-white text-xs shrink-0 text-center leading-normal">
                  {deliberacaoAtiva.status}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Status do Credenciamento */}
            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-2">
                1. Situação Cadastral para Esta Deliberação:
              </span>
              {renderStatusCredenciamento()}
            </div>
            {/* Avisos Especiais */}
            {isPresencial && (
              <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <AlertTitle className="text-xs font-bold">
                  Presença Presencial Registrada
                </AlertTitle>
                <AlertDescription className="text-xs">
                  A mesa diretora registrou a presença física do representante desta unidade no
                  local da assembleia. Para evitar duplicidade de votos, o canal de votação
                  eletrônica remota está bloqueado.
                </AlertDescription>
              </Alert>
            )}
            {jaVotou && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCheck2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-950">Voto Computado com Sucesso</p>
                    <p className="text-xs text-emerald-800">
                      Sua unidade já participou desta deliberação. O voto é irretratável e protegido
                      por chave criptográfica.
                    </p>
                  </div>
                </div>
                <Link to="/recibo">
                  <Button
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                  >
                    <Receipt className="mr-1.5 h-4 w-4" /> Ver Recibo
                  </Button>
                </Link>
              </div>
            )}
            {/* Atalho para Ata da Assembleia */}
            {deliberacaoAtiva && (
              <div className="p-3.5 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCheck2 className="h-5 w-5 text-cyan-700" />
                  <div>
                    <p className="text-xs font-bold text-cyan-950">Ata da Assembleia</p>
                    <p className="text-[11px] text-cyan-800">
                      Acompanhe o registro oficial, o boletim consolidado e as assinaturas da Mesa
                      Diretora.
                    </p>
                  </div>
                </div>
                <Link to="/ata-assembleia">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-cyan-300 text-cyan-900 bg-white hover:bg-cyan-100 text-xs h-8"
                  >
                    Consultar Ata
                  </Button>
                </Link>
              </div>
            )}{' '}
          </CardContent>

          <CardFooter className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Quórum e sigilo garantidos pela convenção condominial do Lago Azul.
            </span>

            {podeVotar && (
              <Button
                size="default"
                onClick={() => navigate('/votacao')}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md animate-bounce"
              >
                <Vote className="mr-2 h-5 w-5" /> Iniciar Votação Eletrônica{' '}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Informativo de Segurança e LGPD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 pt-2">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Duplo Fator de Posse (OTP)</h4>
            <p>
              O voto só é liberado após verificação por código SMS/WhatsApp exclusivo enviado ao
              celular cadastrado da unidade.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
          <FileCheck2 className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Urna Criptográfica SHA-256</h4>
            <p>
              Cédulas encadeadas com prova matemática de inviolabilidade. Seu comprovante de 8
              caracteres permite auditar seu voto.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
          <User className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Sigilo e Privacidade (LGPD)</h4>
            <p>
              Em deliberações com voto secreto, a identidade do condômino é desacoplada da cédula no
              momento da gravação na urna.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default MinhaSituacaoPage

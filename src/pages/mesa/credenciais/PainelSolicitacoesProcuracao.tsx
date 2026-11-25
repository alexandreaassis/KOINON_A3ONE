import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { api, type SolicitacaoProcuracaoRecord, type StatusSolicitacaoProcuracao } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatarCpf } from '@/lib/cpf'
import { formatarIdentificadorUnidade } from '@/lib/formatadorUnidade'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { FileSignature, CheckCircle2, XCircle, FileText, Ban, AlertTriangle } from 'lucide-react'

const LIMITE_ALERTA_UNIDADES = 5

const rotuloStatus = (s: StatusSolicitacaoProcuracao): string =>
  s === 'em_analise'
    ? 'EM ANÁLISE'
    : s === 'aprovado'
      ? 'APROVADO'
      : s === 'cancelado'
        ? 'CANCELADO'
        : 'REJEITADO'

const classeStatus = (s: StatusSolicitacaoProcuracao): string =>
  s === 'em_analise'
    ? 'bg-blue-600 text-white text-[10px]'
    : s === 'aprovado'
      ? 'bg-emerald-600 text-white text-[10px]'
      : s === 'cancelado'
        ? 'bg-slate-500 text-white text-[10px]'
        : 'bg-red-600 text-white text-[10px]'

const rotuloAssembleia = (s: SolicitacaoProcuracaoRecord): string =>
  s.expand?.deliberacao?.titulo || 'Assembleia'

const formatarDataHora = (iso?: string): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

interface Props {
  filtroStatus: string
  busca: string
  termoBuscaNumeros: string
  recarregar: number
}

export const PainelSolicitacoesProcuracao: React.FC<Props> = ({
  filtroStatus,
  busca,
  termoBuscaNumeros,
  recarregar,
}) => {
  const { user } = useAuth()
  const { rotuloUnidade } = useCondoConfig()

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoProcuracaoRecord[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)

  const [dialogRejeicaoAberto, setDialogRejeicaoAberto] = useState(false)
  const [solParaRejeitar, setSolParaRejeitar] = useState<SolicitacaoProcuracaoRecord | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')

  const carregar = async () => {
    setCarregando(true)
    try {
      const lista = await api.getSolicitacoesProcuracao()
      setSolicitacoes(lista)
    } catch (err) {
      console.error('Erro ao carregar solicitações de procuração:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recarregar])

  const aprovar = async (sol: SolicitacaoProcuracaoRecord) => {
    if (!user) return
    setProcessando(true)
    try {
      await api.aprovarSolicitacaoProcuracao(sol.id)
      toast({
        title: 'Procuração Aprovada',
        description:
          'O procurador está credenciado e a unidade representada entrou na presença da assembleia.',
      })
      await carregar()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao aprovar',
        description: getErrorMessage(err, 'Falha ao processar aprovação.'),
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  const abrirRejeicao = (sol: SolicitacaoProcuracaoRecord) => {
    setSolParaRejeitar(sol)
    setMotivoRejeicao('')
    setDialogRejeicaoAberto(true)
  }

  const confirmarRejeicao = async () => {
    if (!solParaRejeitar) return
    if (!motivoRejeicao.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo da rejeição da procuração.',
        variant: 'destructive',
      })
      return
    }
    setProcessando(true)
    try {
      await api.rejeitarSolicitacaoProcuracao(solParaRejeitar.id, motivoRejeicao.trim())
      toast({
        title: 'Procuração Rejeitada',
        description: 'O solicitante verá o motivo da recusa em Minhas solicitações.',
      })
      setDialogRejeicaoAberto(false)
      setSolParaRejeitar(null)
      await carregar()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao rejeitar',
        description: getErrorMessage(err, 'Falha ao processar rejeição.'),
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  // Alerta de acumulação: mesmo CPF de procurador representando muitas unidades
  const porCpf = new Map<string, SolicitacaoProcuracaoRecord[]>()
  for (const s of solicitacoes) {
    if (s.status !== 'aprovado' && s.status !== 'em_analise') continue
    const chave = (s.cpf_procurador || '').replace(/\D/g, '')
    if (!chave) continue
    const lista = porCpf.get(chave) || []
    lista.push(s)
    porCpf.set(chave, lista)
  }
  const cpfsAcumulando = [...porCpf.entries()].filter(
    ([, lista]) => lista.length > LIMITE_ALERTA_UNIDADES,
  )
  const cpfAlerta = new Set(cpfsAcumulando.map(([cpf]) => cpf))

  const termo = busca.trim().toLowerCase()
  const filtradas = solicitacoes.filter((s) => {
    if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false
    if (!termo && !termoBuscaNumeros) return true
    const unidIdent = (s.expand?.unidade?.identificador || '').toLowerCase()
    const solicitante = (s.expand?.solicitante?.name || '').toLowerCase()
    const cpfNum = (s.cpf_procurador || '').replace(/\D/g, '')
    return (
      unidIdent.includes(termo) ||
      solicitante.includes(termo) ||
      (s.titular_outorgante || '').toLowerCase().includes(termo) ||
      (s.nome_procurador || '').toLowerCase().includes(termo) ||
      (!!termoBuscaNumeros && cpfNum.includes(termoBuscaNumeros))
    )
  })

  if (carregando) {
    return (
      <Card className="p-8 text-center border-slate-200">
        <FileSignature className="h-10 w-10 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Carregando solicitações de procuração...</p>
      </Card>
    )
  }

  if (filtradas.length === 0) {
    return (
      <Card className="p-8 text-center border-slate-200">
        <FileSignature className="h-10 w-10 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">
          Nenhuma solicitação de procuração encontrada neste filtro
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Alterne o filtro de status ou busque por outro termo.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {cpfsAcumulando.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Atenção: {cpfsAcumulando.length} procurador(es) acumulam{' '}
            <strong>mais de {LIMITE_ALERTA_UNIDADES} unidades</strong> (aprovadas ou em análise).
            Confira com cuidado especial a legitimidade das procurações.
          </span>
        </div>
      )}

      {filtradas.map((sol) => {
        const unid = sol.expand?.unidade
        const procuradorNome = sol.nome_procurador || sol.expand?.solicitante?.name || '—'
        const acumulando =
          (sol.cpf_procurador || '').replace(/\D/g, '') !== '' &&
          cpfAlerta.has((sol.cpf_procurador || '').replace(/\D/g, ''))

        return (
          <Card
            key={sol.id}
            className={`shadow-xs transition-all ${
              sol.status === 'em_analise'
                ? 'border-amber-400 border-2 bg-amber-50/40 hover:border-amber-500'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <CardContent className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800">
                    {unid?.identificador || '—'}
                  </div>
                  <span className="font-bold text-sm text-slate-900">
                    {unid
                      ? formatarIdentificadorUnidade(
                          unid.identificador,
                          unid.tipo_unidade,
                          rotuloUnidade,
                        )
                      : '—'}
                  </span>
                  <span className="text-slate-400 font-normal text-xs">—</span>
                  <span className="text-xs text-slate-700">{rotuloAssembleia(sol)}</span>
                  <Badge
                    className={`shrink-0 text-center leading-normal ${classeStatus(sol.status)}`}
                  >
                    {rotuloStatus(sol.status)}
                  </Badge>
                  {sol.cancelado_pelo_solicitante && (
                    <Badge className="bg-slate-200 text-slate-700 border border-slate-300 text-[10px] shrink-0">
                      <Ban className="h-3 w-3 mr-1" /> Cancelado pelo solicitante
                    </Badge>
                  )}
                  {acumulando && (
                    <Badge className="bg-amber-200 text-amber-900 border border-amber-400 text-[10px] shrink-0">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Acumula &gt;
                      {LIMITE_ALERTA_UNIDADES} unidades
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                  <span>
                    <strong>Solicitante (login):</strong> {sol.expand?.solicitante?.name || '—'}
                  </span>
                  <span>
                    <strong>Titular outorgante:</strong> {sol.titular_outorgante || '—'}
                  </span>
                  <span>
                    <strong>Procurador:</strong> {procuradorNome}
                  </span>
                  <span>
                    <strong>CPF do procurador:</strong>{' '}
                    {sol.cpf_procurador ? formatarCpf(sol.cpf_procurador) : '—'}
                  </span>
                  <span>
                    <strong>Qualificação:</strong> {sol.qualificacao || '—'}
                  </span>
                  <span>
                    <strong>Submetido:</strong> {formatarDataHora(sol.created)}
                  </span>
                </div>

                {sol.status === 'rejeitado' && sol.motivo_rejeicao && (
                  <p className="text-xs text-red-700 font-medium">
                    Motivo da recusa: {sol.motivo_rejeicao}
                  </p>
                )}

                {sol.anexos && sol.anexos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {sol.anexos.map((arq, idx) => {
                      const fileUrl = pb.files.getURL(sol, arq)
                      return (
                        <a
                          key={idx}
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-700 hover:text-cyan-900 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200"
                        >
                          <FileText className="h-3 w-3" /> Ver Anexo {idx + 1}
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Ações da Mesa — apenas enquanto em análise */}
              {sol.status === 'em_analise' && (
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <Button
                    size="sm"
                    onClick={() => aprovar(sol)}
                    disabled={processando}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirRejeicao(sol)}
                    disabled={processando}
                    className="border-red-300 text-red-700 hover:bg-red-50 text-xs h-8"
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" /> Rejeitar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Dialog de rejeição com motivo obrigatório */}
      <Dialog open={dialogRejeicaoAberto} onOpenChange={setDialogRejeicaoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" /> Rejeitar Solicitação de Procuração
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Informe o motivo — ele ficará visível ao solicitante em "Minhas solicitações".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="motivo-rejeicao-procuracao"
                className="text-xs font-semibold text-slate-700"
              >
                Motivo da Rejeição *
              </Label>
              <Input
                id="motivo-rejeicao-procuracao"
                placeholder="Ex: Procuração sem firma reconhecida ou documento de identidade ilegível."
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                className="text-xs h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={processando}
              onClick={() => setDialogRejeicaoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={processando || !motivoRejeicao.trim()}
              onClick={confirmarRejeicao}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {processando ? 'Gravando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PainelSolicitacoesProcuracao

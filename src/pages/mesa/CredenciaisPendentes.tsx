import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api, type CredenciamentoRecord, type UnidadeRecord } from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Search,
  Building,
  UserCheck,
  Download,
} from 'lucide-react'

export const CredenciaisPendentesPage: React.FC = () => {
  const { user } = useAuth()
  const { rotuloUnidade } = useCondoConfig()

  const [credenciamentos, setCredenciamentos] = useState<CredenciamentoRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [filtroStatus, setFiltroStatus] = useState<string>('pendente')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  // Dialog de Rejeição
  const [dialogRejeicaoAberto, setDialogRejeicaoAberto] = useState(false)
  const [credParaRejeitar, setCredParaRejeitar] = useState<CredenciamentoRecord | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [processando, setProcessando] = useState(false)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [creds, unids] = await Promise.all([api.getCredenciamentos(), api.getUnidades()])
      setCredenciamentos(creds)
      setUnidades(unids)
    } catch (err) {
      console.error('Erro ao carregar credenciamentos:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const aprovar = async (cred: CredenciamentoRecord) => {
    if (!user) return
    try {
      await api.aprovarCredenciamento(cred.id, user.id)
      toast({
        title: 'Credenciamento Aprovado',
        description: `Unidade habilitada para voto.`,
      })
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao aprovar',
        description: err?.message || 'Falha ao processar aprovação.',
        variant: 'destructive',
      })
    }
  }

  const abrirRejeicao = (cred: CredenciamentoRecord) => {
    setCredParaRejeitar(cred)
    setMotivoRejeicao('')
    setDialogRejeicaoAberto(true)
  }

  const confirmarRejeicao = async () => {
    if (!user || !credParaRejeitar) return
    setProcessando(true)
    try {
      await api.rejeitarCredenciamento(
        credParaRejeitar.id,
        user.id,
        motivoRejeicao || 'Documentação incompleta ou não comprobatória.',
      )
      toast({
        title: 'Credenciamento Rejeitado',
        description: 'O morador foi informado do motivo da recusa.',
      })
      setDialogRejeicaoAberto(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao rejeitar',
        description: err?.message || 'Falha ao processar rejeição.',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  // Filtragem
  const filtrados = credenciamentos.filter((c) => {
    const matchStatus = filtroStatus === 'todos' ? true : c.status === filtroStatus
    const unid = unidades.find((u) => u.id === c.unidade)
    const termo = busca.toLowerCase()
    const matchBusca =
      !busca ||
      c.titular_nome.toLowerCase().includes(termo) ||
      c.cpf.includes(termo) ||
      (unid?.identificador || '').toLowerCase().includes(termo)
    return matchStatus && matchBusca
  })

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" /> Credenciamento e Vínculos
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Conferência dos documentos comprobatórios de propriedade, locação ou procuração dos
            votantes.
          </p>
        </div>

        {/* Filtros por Status */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
          <Button
            variant={filtroStatus === 'pendente' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('pendente')}
            className={`text-xs h-8 ${filtroStatus === 'pendente' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-slate-600'}`}
          >
            Pendentes ({credenciamentos.filter((c) => c.status === 'pendente').length})
          </Button>
          <Button
            variant={filtroStatus === 'aprovado' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('aprovado')}
            className={`text-xs h-8 ${filtroStatus === 'aprovado' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-slate-600'}`}
          >
            Aprovados ({credenciamentos.filter((c) => c.status === 'aprovado').length})
          </Button>
          <Button
            variant={filtroStatus === 'rejeitado' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('rejeitado')}
            className={`text-xs h-8 ${filtroStatus === 'rejeitado' ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-slate-600'}`}
          >
            Rejeitados ({credenciamentos.filter((c) => c.status === 'rejeitado').length})
          </Button>
          <Button
            variant={filtroStatus === 'todos' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('todos')}
            className="text-xs h-8 text-slate-600"
          >
            Todos
          </Button>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por unidade (ex: 101A), titular ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>

      {/* Lista de Registros */}
      <div className="space-y-3">
        {filtrados.length === 0 ? (
          <Card className="p-8 text-center border-slate-200">
            <UserCheck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhum credenciamento encontrado neste filtro
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Alterne o filtro ou busque por outro termo.
            </p>
          </Card>
        ) : (
          filtrados.map((cred) => {
            const unid = unidades.find((u) => u.id === cred.unidade)

            return (
              <Card
                key={cred.id}
                className="border-slate-200 shadow-xs hover:border-slate-300 transition-all"
              >
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800">
                        {unid?.identificador || '—'}
                      </div>
                      <span className="font-bold text-sm text-slate-900">
                        {unid?.tipo_unidade || rotuloUnidade} {unid?.identificador} ({unid?.bloco})
                        — {cred.titular_nome}
                      </span>
                      <Badge
                        className={
                          cred.status === 'aprovado'
                            ? 'bg-emerald-600 text-white text-[10px]'
                            : cred.status === 'rejeitado'
                              ? 'bg-red-600 text-white text-[10px]'
                              : 'bg-amber-600 text-white text-[10px]'
                        }
                      >
                        {cred.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>
                        <strong>Vínculo:</strong> {cred.tipo_vinculo.toUpperCase()}
                      </span>
                      <span>
                        <strong>CPF:</strong> {cred.cpf}
                      </span>
                      <span>
                        <strong>Submetido:</strong>{' '}
                        {new Date(cred.created).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {cred.motivo_rejeicao && (
                      <p className="text-xs text-red-700 font-medium">
                        Motivo de recusa: {cred.motivo_rejeicao}
                      </p>
                    )}

                    {/* Documentos Anexos */}
                    {cred.documentos && cred.documentos.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {cred.documentos.map((doc, idx) => {
                          const fileUrl = pb.files.getURL(cred, doc)
                          return (
                            <a
                              key={idx}
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-700 hover:text-cyan-900 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200"
                            >
                              <FileText className="h-3 w-3" /> Ver Documento {idx + 1}
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Ações da Mesa */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {cred.status !== 'aprovado' && (
                      <Button
                        size="sm"
                        onClick={() => aprovar(cred)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovar
                      </Button>
                    )}
                    {cred.status !== 'rejeitado' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirRejeicao(cred)}
                        className="border-red-300 text-red-700 hover:bg-red-50 text-xs h-8"
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Rejeitar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal de Rejeição */}
      <Dialog open={dialogRejeicaoAberto} onOpenChange={setDialogRejeicaoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" /> Rejeitar Credenciamento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Informe a justificativa da recusa para que o morador possa regularizar a documentação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Motivo da Recusa</label>
              <Input
                placeholder="Ex: Documento de identidade ilegível ou ausência de procuração assinada."
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
              disabled={processando}
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
export default CredenciaisPendentesPage

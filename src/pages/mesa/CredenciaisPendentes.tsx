import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api, type CredenciamentoRecord, type UnidadeRecord } from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import pb from '@/lib/pocketbase/client'
import {
  formatarIdentificadorUnidade,
  normalizarBloco,
  temBlocoReal,
} from '@/lib/formatadorUnidade'
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
  const [cadastrosPublicos, setCadastrosPublicos] = useState<any[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'cadastros' | 'credenciais'>('cadastros')
  const [filtroStatus, setFiltroStatus] = useState<string>('pendente')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  // Dialog de Rejeição Credenciamento
  const [dialogRejeicaoAberto, setDialogRejeicaoAberto] = useState(false)
  const [credParaRejeitar, setCredParaRejeitar] = useState<CredenciamentoRecord | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')

  // Dialog de Rejeição Cadastro Público
  const [dialogRejeicaoCadAberto, setDialogRejeicaoCadAberto] = useState(false)
  const [cadParaRejeitar, setCadParaRejeitar] = useState<any | null>(null)
  const [motivoRejeicaoCad, setMotivoRejeicaoCad] = useState('')

  const [processando, setProcessando] = useState(false)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [creds, cads, unids] = await Promise.all([
        api.getCredenciamentos(),
        api.getCadastrosUnidades(),
        api.getUnidades(),
      ])
      setCredenciamentos(creds)
      setCadastrosPublicos(cads)
      setUnidades(unids)
    } catch (err) {
      console.error('Erro ao carregar dados de credenciamentos/cadastros:', err)
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

  // Ações de aprovação e rejeição de cadastro de morador público
  const aprovarCadastro = async (cad: any) => {
    if (!user) return
    try {
      const resp = await api.aprovarCadastroUnidade(cad.id)
      toast({
        title: 'Cadastro Aprovado',
        description: resp?.message || `Cadastro de "${cad.nome}" homologado com sucesso.`,
      })
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao aprovar cadastro',
        description: err?.data?.message || err?.message || 'Falha ao aprovar cadastro.',
        variant: 'destructive',
      })
    }
  }

  const abrirRejeicaoCadastro = (cad: any) => {
    setCadParaRejeitar(cad)
    setMotivoRejeicaoCad('')
    setDialogRejeicaoCadAberto(true)
  }

  const confirmarRejeicaoCadastro = async () => {
    if (!user || !cadParaRejeitar) return
    setProcessando(true)
    try {
      const resp = await api.rejeitarCadastroUnidade(
        cadParaRejeitar.id,
        motivoRejeicaoCad || 'Documentação ou dados não conferem com a unidade',
      )
      toast({
        title: 'Cadastro Rejeitado',
        description: resp?.message || 'O cadastro foi marcado como rejeitado.',
      })
      setDialogRejeicaoCadAberto(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao rejeitar',
        description: err?.data?.message || err?.message || 'Falha ao rejeitar cadastro.',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
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

  // Filtragem Credenciamentos
  const credsFiltrados = credenciamentos.filter((c) => {
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

  // Filtragem Cadastros de Moradores
  const cadastrosFiltrados = cadastrosPublicos.filter((cad) => {
    const statusCad = cad.status_aprovacao || 'aprovado'
    const matchStatus = filtroStatus === 'todos' ? true : statusCad === filtroStatus
    const unid = unidades.find((u) => u.id === cad.unidade)
    const termo = busca.toLowerCase()
    const matchBusca =
      !busca ||
      (cad.nome || '').toLowerCase().includes(termo) ||
      (cad.cpf || '').includes(termo) ||
      (cad.email || '').toLowerCase().includes(termo) ||
      (unid?.identificador || '').toLowerCase().includes(termo)
    return matchStatus && matchBusca
  })

  const totalCadastrosPendentes = cadastrosPublicos.filter(
    (c) => (c.status_aprovacao || 'aprovado') === 'pendente',
  ).length
  const totalCredsPendentes = credenciamentos.filter((c) => c.status === 'pendente').length

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" /> Aprovação de Cadastros e Vínculos
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Homologação dos cadastros de moradores enviados via link público e conferência de
            credenciais de votação.
          </p>
        </div>

        {/* Abas Superiores: Cadastros Públicos vs Credenciamento de Votação */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg text-xs">
          <Button
            variant={abaAtiva === 'cadastros' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setAbaAtiva('cadastros')}
            className={`text-xs h-8 ${
              abaAtiva === 'cadastros'
                ? 'bg-[#002B5E] text-white hover:bg-[#001D40]'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Cadastros de Moradores
            {totalCadastrosPendentes > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {totalCadastrosPendentes}
              </span>
            )}
          </Button>

          <Button
            variant={abaAtiva === 'credenciais' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setAbaAtiva('credenciais')}
            className={`text-xs h-8 ${
              abaAtiva === 'credenciais'
                ? 'bg-[#002B5E] text-white hover:bg-[#001D40]'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Credenciais de Assembleia
            {totalCredsPendentes > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {totalCredsPendentes}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Barra de Busca */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={
              abaAtiva === 'cadastros'
                ? 'Buscar por unidade, morador, CPF ou e-mail...'
                : 'Buscar por unidade (ex: 101), titular ou CPF...'
            }
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Filtros por Status */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          <Button
            variant={filtroStatus === 'pendente' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('pendente')}
            className={`text-xs h-8 ${
              filtroStatus === 'pendente'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'text-slate-600'
            }`}
          >
            Pendentes ({abaAtiva === 'cadastros' ? totalCadastrosPendentes : totalCredsPendentes})
          </Button>
          <Button
            variant={filtroStatus === 'aprovado' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('aprovado')}
            className={`text-xs h-8 ${
              filtroStatus === 'aprovado'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'text-slate-600'
            }`}
          >
            Aprovados
          </Button>
          <Button
            variant={filtroStatus === 'rejeitado' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFiltroStatus('rejeitado')}
            className={`text-xs h-8 ${
              filtroStatus === 'rejeitado'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'text-slate-600'
            }`}
          >
            Rejeitados
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

      {/* Lista de Registros Conforme a Aba Ativa */}
      <div className="space-y-3">
        {abaAtiva === 'cadastros' ? (
          /* ABA 1: Cadastros Públicos de Moradores */
          cadastrosFiltrados.length === 0 ? (
            <Card className="p-8 text-center border-slate-200">
              <UserCheck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhum cadastro de morador encontrado neste filtro
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Alterne o filtro de status ou busque por outro termo.
              </p>
            </Card>
          ) : (
            cadastrosFiltrados.map((cad) => {
              const unid = unidades.find((u) => u.id === cad.unidade)
              const statusCad = cad.status_aprovacao || 'aprovado'

              // Formatação de data de nascimento e idade
              let idadeStr: string | null = null
              if (cad.data_nascimento) {
                try {
                  const parte = cad.data_nascimento.slice(0, 10).split('-').map(Number)
                  const dt = new Date(parte[0], parte[1] - 1, parte[2])
                  const hoje = new Date()
                  let anos = hoje.getFullYear() - dt.getFullYear()
                  const m = hoje.getMonth() - dt.getMonth()
                  if (m < 0 || (m === 0 && hoje.getDate() < dt.getDate())) anos--
                  if (anos >= 0) {
                    idadeStr = `${String(parte[2]).padStart(2, '0')}/${String(parte[1]).padStart(2, '0')}/${parte[0]} (${anos} anos)`
                  }
                } catch {
                  /* intentionally ignored */
                }
              }

              return (
                <Card
                  key={cad.id}
                  className="border-slate-200 shadow-xs hover:border-slate-300 transition-all"
                >
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800">
                          {unid?.identificador || '—'}
                        </div>
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>
                            {unid
                              ? formatarIdentificadorUnidade(
                                  unid.identificador,
                                  unid.tipo_unidade,
                                  rotuloUnidade,
                                )
                              : '—'}
                          </span>
                          <span className="text-xs text-slate-400 font-normal">
                            (
                            {unid && temBlocoReal(unid.bloco, unid.tipo_unidade)
                              ? normalizarBloco(unid.bloco, unid.tipo_unidade)
                              : '—'}
                            )
                          </span>
                          <span className="text-slate-400 font-normal">—</span>
                          <span>{cad.nome}</span>
                        </span>
                        <Badge
                          className={`shrink-0 text-center leading-normal ${
                            statusCad === 'aprovado'
                              ? 'bg-emerald-600 text-white text-[10px]'
                              : statusCad === 'rejeitado'
                                ? 'bg-red-600 text-white text-[10px]'
                                : 'bg-amber-600 text-white text-[10px]'
                          }`}
                        >
                          {statusCad.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">Vínculo:</span>
                          {cad.vinculo === 'proprietario' && (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                              PROPRIETÁRIO (NÃO MORA)
                            </Badge>
                          )}
                          {cad.vinculo === 'condomino' && (
                            <Badge className="bg-cyan-100 text-cyan-900 border-cyan-300 text-[10px]">
                              CONDÔMINO (MORADOR)
                            </Badge>
                          )}
                          {cad.vinculo === 'locatario' && (
                            <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px]">
                              INQUILINO (MORADOR)
                            </Badge>
                          )}
                        </div>

                        <span>
                          <strong>CPF:</strong> {cad.cpf}
                        </span>

                        {idadeStr && (
                          <span>
                            <strong>Nascimento:</strong> {idadeStr}
                          </span>
                        )}

                        {cad.email && (
                          <span>
                            <strong>E-mail:</strong> {cad.email}
                          </span>
                        )}

                        {cad.telefone && (
                          <span>
                            <strong>Tel:</strong> {cad.telefone}
                          </span>
                        )}

                        <span>
                          <strong>Origem:</strong>{' '}
                          {cad.origem === 'link_publico' ? 'Link Público' : 'Administração'}
                        </span>
                      </div>

                      {cad.motivo_rejeicao && (
                        <p className="text-xs text-red-700 font-medium">
                          Motivo de recusa: {cad.motivo_rejeicao}
                        </p>
                      )}
                    </div>

                    {/* Ações da Mesa para Cadastro */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {statusCad !== 'aprovado' && (
                        <Button
                          size="sm"
                          onClick={() => aprovarCadastro(cad)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovar Cadastro
                        </Button>
                      )}
                      {statusCad !== 'rejeitado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirRejeicaoCadastro(cad)}
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
          )
        ) : /* ABA 2: Credenciais de Assembleia */
        credsFiltrados.length === 0 ? (
          <Card className="p-8 text-center border-slate-200">
            <UserCheck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhum credenciamento de assembleia encontrado neste filtro
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Alterne o filtro ou busque por outro termo.
            </p>
          </Card>
        ) : (
          credsFiltrados.map((cred) => {
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
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>
                          {unid
                            ? formatarIdentificadorUnidade(
                                unid.identificador,
                                unid.tipo_unidade,
                                rotuloUnidade,
                              )
                            : '—'}
                        </span>
                        <span className="text-xs text-slate-400 font-normal">
                          (
                          {unid && temBlocoReal(unid.bloco, unid.tipo_unidade)
                            ? normalizarBloco(unid.bloco, unid.tipo_unidade)
                            : '—'}
                          )
                        </span>
                        <span className="text-slate-400 font-normal">—</span>
                        <span>{cred.titular_nome}</span>
                      </span>
                      <Badge
                        className={`shrink-0 text-center leading-normal ${
                          cred.status === 'aprovado'
                            ? 'bg-emerald-600 text-white text-[10px]'
                            : cred.status === 'rejeitado'
                              ? 'bg-red-600 text-white text-[10px]'
                              : 'bg-amber-600 text-white text-[10px]'
                        }`}
                      >
                        {cred.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">Vínculo Declarado:</span>
                        {cred.tipo_vinculo === 'proprietario' && (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                            PROPRIETÁRIO (NÃO RESIDENTE)
                          </Badge>
                        )}
                        {cred.tipo_vinculo === 'condomino' && (
                          <Badge className="bg-cyan-100 text-cyan-900 border-cyan-300 text-[10px]">
                            CONDÔMINO (RESIDENTE)
                          </Badge>
                        )}
                        {cred.tipo_vinculo === 'locatario' && (
                          <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px]">
                            LOCATÁRIO (INQUILINO)
                          </Badge>
                        )}
                        {cred.tipo_vinculo !== 'proprietario' &&
                          cred.tipo_vinculo !== 'condomino' &&
                          cred.tipo_vinculo !== 'locatario' && (
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {cred.tipo_vinculo}
                            </Badge>
                          )}
                      </div>
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

      {/* Modal de Rejeição Credenciamento */}
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

      {/* Modal de Rejeição Cadastro de Morador */}
      <Dialog open={dialogRejeicaoCadAberto} onOpenChange={setDialogRejeicaoCadAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" /> Rejeitar Cadastro de Morador
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Informe o motivo para que a recusa fique registrada no histórico da unidade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Motivo da Recusa</label>
              <Input
                placeholder="Ex: CPF ou nome não conferem com o registro de moradores ou locatários da unidade."
                value={motivoRejeicaoCad}
                onChange={(e) => setMotivoRejeicaoCad(e.target.value)}
                className="text-xs h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={processando}
              onClick={() => setDialogRejeicaoCadAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={processando}
              onClick={confirmarRejeicaoCadastro}
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

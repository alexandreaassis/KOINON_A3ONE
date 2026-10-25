import React, { useState, useEffect } from 'react'
import {
  api,
  type DeliberacaoRecord,
  type ItemPautaRecord,
  type DeliberacaoStatus,
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { toast } from '@/hooks/use-toast'
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  AlertCircle,
  HelpCircle,
  Vote,
} from 'lucide-react'

export const DeliberacoesPage: React.FC = () => {
  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoSelecionada, setDeliberacaoSelecionada] = useState<DeliberacaoRecord | null>(
    null,
  )
  const [itensPauta, setItensPauta] = useState<ItemPautaRecord[]>([])
  const [carregando, setCarregando] = useState(true)

  // Modal Deliberação (Criar/Editar)
  const [modalDeliberacaoAberto, setModalDeliberacaoAberto] = useState(false)
  const [delibEditId, setDelibEditId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipoCedula, setTipoCedula] = useState<'secreta' | 'nominal'>('secreta')
  const [quorumInstalacao, setQuorumInstalacao] = useState(27)
  const [quorumMateria, setQuorumMateria] = useState('Maioria simples dos presentes')
  const [inadimplenteVota, setInadimplenteVota] = useState(true)
  const [locatarioVota, setLocatarioVota] = useState(false)
  const [mesaPresidenteNome, setMesaPresidenteNome] = useState('')
  const [mesaPresidenteCpf, setMesaPresidenteCpf] = useState('')
  const [mesaSecretarioNome, setMesaSecretarioNome] = useState('')
  const [mesaSecretarioCpf, setMesaSecretarioCpf] = useState('')
  const [salvandoDelib, setSalvandoDelib] = useState(false)

  // Modal Item de Pauta
  const [modalItemAberto, setModalItemAberto] = useState(false)
  const [itemOrdem, setItemOrdem] = useState(1)
  const [itemTitulo, setItemTitulo] = useState('')
  const [itemTexto, setItemTexto] = useState('')
  const [itemQuorum, setItemQuorum] = useState('Maioria simples dos presentes')
  const [salvandoItem, setSalvandoItem] = useState(false)

  const carregar = async () => {
    setCarregando(true)
    try {
      const delibs = await api.getDeliberacoes()
      setDeliberacoes(delibs)
      if (delibs.length > 0 && !deliberacaoSelecionada) {
        setDeliberacaoSelecionada(delibs[0])
        const itens = await api.getItensPauta(delibs[0].id)
        setItensPauta(itens)
      } else if (deliberacaoSelecionada) {
        const itens = await api.getItensPauta(deliberacaoSelecionada.id)
        setItensPauta(itens)
      }
    } catch (err) {
      console.error('Erro ao carregar deliberações:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const selecionarDeliberacao = async (d: DeliberacaoRecord) => {
    setDeliberacaoSelecionada(d)
    const itens = await api.getItensPauta(d.id)
    setItensPauta(itens)
  }

  const abrirNovaDeliberacao = async () => {
    setDelibEditId(null)
    setTitulo('')
    setDescricao('')
    setMesaPresidenteNome('')
    setMesaPresidenteCpf('')
    setMesaSecretarioNome('')
    setMesaSecretarioCpf('')

    // Carrega defaults configurados da convenção se houver
    try {
      const cfg = await api.getConfiguracao()
      if (cfg) {
        setTipoCedula((cfg.default_tipo_cedula as 'secreta' | 'nominal') || 'secreta')
        setQuorumMateria(cfg.default_quorum_materia || 'Maioria simples dos presentes')
        setInadimplenteVota(cfg.default_inadimplente_vota ?? true)
        setLocatarioVota(cfg.default_locatario_vota ?? false)
        const total = cfg.total_unidades || 52
        setQuorumInstalacao(Math.floor(total / 2) + 1)
      } else {
        setTipoCedula('secreta')
        setQuorumInstalacao(27)
        setQuorumMateria('Maioria simples dos presentes')
        setInadimplenteVota(true)
        setLocatarioVota(false)
      }
    } catch {
      setTipoCedula('secreta')
      setQuorumInstalacao(27)
      setQuorumMateria('Maioria simples dos presentes')
      setInadimplenteVota(true)
      setLocatarioVota(false)
    }

    setModalDeliberacaoAberto(true)
  }

  const abrirEditarDeliberacao = (d: DeliberacaoRecord) => {
    setDelibEditId(d.id)
    setTitulo(d.titulo)
    setDescricao(d.descricao || '')
    setTipoCedula(d.tipo_cedula)
    setQuorumInstalacao(d.quorum_instalacao || 27)
    setQuorumMateria(d.quorum_materia || 'Maioria simples dos presentes')
    setInadimplenteVota(d.inadimplente_pode_votar ?? true)
    setLocatarioVota(d.locatario_pode_votar ?? false)
    setMesaPresidenteNome(d.mesa_presidente_nome || '')
    setMesaPresidenteCpf(d.mesa_presidente_cpf || '')
    setMesaSecretarioNome(d.mesa_secretario_nome || '')
    setMesaSecretarioCpf(d.mesa_secretario_cpf || '')
    setModalDeliberacaoAberto(true)
  }

  const handleSalvarDeliberacao = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoDelib(true)
    try {
      if (delibEditId) {
        await api.updateDeliberacao(delibEditId, {
          titulo,
          descricao,
          tipo_cedula: tipoCedula,
          quorum_instalacao: quorumInstalacao,
          quorum_materia: quorumMateria,
          inadimplente_pode_votar: inadimplenteVota,
          locatario_pode_votar: locatarioVota,
          mesa_presidente_nome: mesaPresidenteNome.trim(),
          mesa_presidente_cpf: mesaPresidenteCpf.trim(),
          mesa_secretario_nome: mesaSecretarioNome.trim(),
          mesa_secretario_cpf: mesaSecretarioCpf.trim(),
        })
        toast({ title: 'Deliberação Atualizada' })
      } else {
        const nova = await api.createDeliberacao({
          titulo,
          descricao,
          tipo_cedula: tipoCedula,
          quorum_instalacao: quorumInstalacao,
          quorum_materia: quorumMateria,
          inadimplente_pode_votar: inadimplenteVota,
          locatario_pode_votar: locatarioVota,
          mesa_presidente_nome: mesaPresidenteNome.trim(),
          mesa_presidente_cpf: mesaPresidenteCpf.trim(),
          mesa_secretario_nome: mesaSecretarioNome.trim(),
          mesa_secretario_cpf: mesaSecretarioCpf.trim(),
          status: 'AGUARDANDO_ABERTURA',
        })
        setDeliberacaoSelecionada(nova)
        toast({ title: 'Nova Deliberação Criada' })
      }
      setModalDeliberacaoAberto(false)
      carregar()
    } catch (err: any) {
      const is404 =
        err?.status === 404 ||
        err?.statusCode === 404 ||
        err?.message?.includes('404') ||
        err?.message?.includes("wasn't found") ||
        err?.response?.status === 404

      if (is404) {
        toast({
          title: 'Registro não encontrado',
          description:
            'A deliberação selecionada não existe mais no banco ou você não tem permissão para editá-la. A lista foi atualizada.',
          variant: 'destructive',
        })
        setModalDeliberacaoAberto(false)
        setDeliberacaoSelecionada(null)
        carregar()
      } else {
        toast({
          title: 'Erro ao salvar',
          description: err?.message || 'Falha ao persistir deliberação.',
          variant: 'destructive',
        })
      }
    } finally {
      setSalvandoDelib(false)
    }
  }

  const abrirNovoItem = () => {
    setItemOrdem(itensPauta.length + 1)
    setItemTitulo('')
    setItemTexto('')
    setItemQuorum('Maioria simples dos presentes')
    setModalItemAberto(true)
  }

  const handleSalvarItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliberacaoSelecionada) return

    setSalvandoItem(true)
    try {
      await api.createItemPauta({
        deliberacao: deliberacaoSelecionada.id,
        ordem: itemOrdem,
        titulo: itemTitulo,
        texto: itemTexto,
        quorum_aplicavel: itemQuorum,
      })
      toast({ title: 'Item de Pauta Adicionado' })
      setModalItemAberto(false)
      const itens = await api.getItensPauta(deliberacaoSelecionada.id)
      setItensPauta(itens)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar item',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoItem(false)
    }
  }

  const excluirItem = async (itemId: string) => {
    if (!confirm('Deseja excluir este item de pauta?')) return
    try {
      await api.deleteItemPauta(itemId)
      toast({ title: 'Item Excluído' })
      if (deliberacaoSelecionada) {
        const itens = await api.getItensPauta(deliberacaoSelecionada.id)
        setItensPauta(itens)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-amber-600" /> Gestão de Deliberações e Pautas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Parâmetros configuráveis da assembleia conforme a Convenção Condominial do Lago Azul.
          </p>
        </div>

        <Button
          size="sm"
          onClick={abrirNovaDeliberacao}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs self-start sm:self-center"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Nova Assembleia / Deliberação
        </Button>
      </div>

      {/* Grid: Lista de Deliberações à esquerda + Detalhes/Pauta à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Lista */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Deliberações Cadastradas ({deliberacoes.length})
          </h3>

          <div className="space-y-2">
            {deliberacoes.map((d) => {
              const selecionada = deliberacaoSelecionada?.id === d.id
              return (
                <div
                  key={d.id}
                  onClick={() => selecionarDeliberacao(d)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selecionada
                      ? 'border-amber-400 bg-amber-50/60 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase shrink-0 text-center leading-normal"
                    >
                      {d.tipo_cedula === 'secreta' ? 'Voto Secreto' : 'Voto Nominal'}
                    </Badge>
                    <Badge
                      className={`shrink-0 text-center leading-normal ${
                        d.status === 'EM_VOTACAO'
                          ? 'bg-emerald-600 text-white text-[10px]'
                          : d.status === 'ENCERRADA' || d.status === 'APURADA'
                            ? 'bg-amber-600 text-white text-[10px]'
                            : 'bg-slate-700 text-white text-[10px]'
                      }`}
                    >
                      {d.status}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{d.titulo}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Quórum: {d.quorum_instalacao || 27} unid. • {d.quorum_materia}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Coluna 2 e 3: Detalhes e Itens de Pauta */}
        <div className="lg:col-span-2 space-y-4">
          {deliberacaoSelecionada ? (
            <>
              {/* Card de Parâmetros da Deliberação */}
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Parâmetros da Assembleia
                      </span>
                      <Badge className="bg-slate-800 text-white text-[10px] shrink-0 text-center leading-normal">
                        {deliberacaoSelecionada.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 mt-1">
                      {deliberacaoSelecionada.titulo}
                    </CardTitle>
                    {deliberacaoSelecionada.descricao && (
                      <CardDescription className="text-xs text-slate-600 mt-1">
                        {deliberacaoSelecionada.descricao}
                      </CardDescription>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirEditarDeliberacao(deliberacaoSelecionada)}
                    className="text-xs h-8 shrink-0"
                  >
                    <Edit3 className="mr-1 h-3.5 w-3.5" /> Editar Parâmetros
                  </Button>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Grid de Parâmetros com destaque da convenção */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Tipo de Escrutínio
                      </span>
                      <span className="font-bold text-slate-800 capitalize">
                        {deliberacaoSelecionada.tipo_cedula}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Quórum Instalação
                      </span>
                      <span className="font-bold text-slate-800">
                        {deliberacaoSelecionada.quorum_instalacao || 27} unidades
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Inadimplente Vota?
                      </span>
                      <span className="font-bold text-slate-800">
                        {deliberacaoSelecionada.inadimplente_pode_votar
                          ? 'Sim (Permitido)'
                          : 'Não (Bloqueado)'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Locatário Vota?
                      </span>
                      <span className="font-bold text-slate-800">
                        {deliberacaoSelecionada.locatario_pode_votar
                          ? 'Sim (Permitido)'
                          : 'Não (Bloqueado)'}
                      </span>
                    </div>
                  </div>

                  {/* Bloco Mesa Diretora Registrada */}
                  <div className="mt-3 p-3 rounded-lg bg-amber-50/50 border border-amber-200 text-xs">
                    <span className="text-[10px] text-amber-900 uppercase font-bold tracking-wider block mb-1">
                      Mesa Diretora Designada
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 font-medium">Presidente:</span>{' '}
                        <strong className="text-slate-800">
                          {deliberacaoSelecionada.mesa_presidente_nome || 'Não definido'}
                        </strong>
                        {deliberacaoSelecionada.mesa_presidente_cpf && (
                          <span className="text-slate-500 ml-1">
                            (CPF: {deliberacaoSelecionada.mesa_presidente_cpf})
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Secretário(a):</span>{' '}
                        <strong className="text-slate-800">
                          {deliberacaoSelecionada.mesa_secretario_nome || 'Não definido'}
                        </strong>
                        {deliberacaoSelecionada.mesa_secretario_cpf && (
                          <span className="text-slate-500 ml-1">
                            (CPF: {deliberacaoSelecionada.mesa_secretario_cpf})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>
                      <strong>Nota da Convenção Lago Azul:</strong> Estes parâmetros e a composição
                      da mesa diretora são configuráveis por deliberação para permitir flexibilidade
                      regimental.
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Itens de Pauta */}
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800">
                      Itens da Pauta em Votação ({itensPauta.length})
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Matérias a serem apreciadas pelos condôminos
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={abrirNovoItem}
                    className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-8"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Matéria
                  </Button>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {itensPauta.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-lg">
                      Nenhum item cadastrado nesta pauta. Clique em &ldquo;Adicionar Matéria&rdquo;
                      acima.
                    </div>
                  ) : (
                    itensPauta.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded text-[11px]">
                              Item {item.ordem}
                            </span>
                            <span className="font-bold text-slate-900">{item.titulo}</span>
                          </div>
                          {item.texto && <p className="text-slate-600 text-xs">{item.texto}</p>}
                          {item.quorum_aplicavel && (
                            <p className="text-[11px] text-slate-500">
                              <strong>Quórum regimental exigido:</strong> {item.quorum_aplicavel}
                            </p>
                          )}
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => excluirItem(item.id)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 shrink-0"
                          title="Excluir item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center border-slate-200">
              <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Selecione uma deliberação à esquerda
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar Deliberação */}
      <Dialog open={modalDeliberacaoAberto} onOpenChange={setModalDeliberacaoAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {delibEditId ? 'Editar Parâmetros da Assembleia' : 'Nova Assembleia / Deliberação'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Defina o título, regras regimentais e quóruns aplicáveis.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarDeliberacao} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Título da Assembleia</Label>
              <Input
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Assembleia Geral Ordinária 2025"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição / Edital de Convocação</Label>
              <Textarea
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Resumo da pauta ou convocação..."
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo de Cédula</Label>
                <Select value={tipoCedula} onValueChange={(val: any) => setTipoCedula(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="secreta">Secreta (Urna Criptografada)</SelectItem>
                    <SelectItem value="nominal">Nominal (Voto Aberto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Quórum de Instalação (Unidades)</Label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={quorumInstalacao}
                  onChange={(e) => setQuorumInstalacao(Number(e.target.value))}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Regra Geral de Quórum da Matéria</Label>
              <Input
                value={quorumMateria}
                onChange={(e) => setQuorumMateria(e.target.value)}
                placeholder="Ex: Maioria simples dos presentes / 2/3 dos condôminos"
                className="text-xs h-9"
              />
            </div>

            {/* Bloco: Mesa Diretora (Presidente e Secretário) */}
            <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 space-y-2.5">
              <div>
                <span className="font-bold text-amber-950 text-[11px] block uppercase tracking-wider">
                  Mesa Diretora da Assembleia (Presidente e Secretário)
                </span>
                <p className="text-[10px] text-amber-800">
                  Nem sempre a mesa é conduzida pelo síndico. Os nomes e CPFs informados abaixo
                  serão impressos no boletim de urna oficial e relatórios.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-800">
                    Presidente da Mesa (Nome Completo)
                  </Label>
                  <Input
                    value={mesaPresidenteNome}
                    onChange={(e) => setMesaPresidenteNome(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silveira"
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-800">
                    CPF do Presidente
                  </Label>
                  <Input
                    value={mesaPresidenteCpf}
                    onChange={(e) => setMesaPresidenteCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="text-xs h-8 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-800">
                    Secretário(a) da Mesa (Nome Completo)
                  </Label>
                  <Input
                    value={mesaSecretarioNome}
                    onChange={(e) => setMesaSecretarioNome(e.target.value)}
                    placeholder="Ex: Maria Fernandes de Souza"
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-800">
                    CPF do Secretário(a)
                  </Label>
                  <Input
                    value={mesaSecretarioCpf}
                    onChange={(e) => setMesaSecretarioCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="text-xs h-8 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Parâmetros da Convenção */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 text-[11px] block uppercase">
                Parâmetros Especiais da Convenção Lago Azul
              </span>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Inadimplente pode votar?</p>
                  <p className="text-[10px] text-slate-500">
                    Configurável por deliberação conforme ordem do dia.
                  </p>
                </div>
                <Switch checked={inadimplenteVota} onCheckedChange={setInadimplenteVota} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Locatário pode votar?</p>
                  <p className="text-[10px] text-slate-500">
                    Aplicável caso a matéria não envolva despesas extraordinárias.
                  </p>
                </div>
                <Switch checked={locatarioVota} onCheckedChange={setLocatarioVota} />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalDeliberacaoAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoDelib}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {salvandoDelib ? 'Salvando...' : 'Salvar Deliberação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Item de Pauta */}
      <Dialog open={modalItemAberto} onOpenChange={setModalItemAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Adicionar Matéria à Pauta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Cadastre o texto a ser deliberado e votado pelos condôminos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarItem} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ordem</Label>
                <Input
                  type="number"
                  min={1}
                  value={itemOrdem}
                  onChange={(e) => setItemOrdem(Number(e.target.value))}
                  className="text-xs h-9"
                />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs font-semibold">Título do Item</Label>
                <Input
                  required
                  placeholder="Ex: Item 1 — Aprovação de Contas 2024"
                  value={itemTitulo}
                  onChange={(e) => setItemTitulo(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Texto da Matéria em Deliberação</Label>
              <Textarea
                rows={3}
                placeholder="Descrição detalhada submetida à votação..."
                value={itemTexto}
                onChange={(e) => setItemTexto(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Quórum Aplicável</Label>
              <Input
                placeholder="Ex: Maioria simples dos presentes"
                value={itemQuorum}
                onChange={(e) => setItemQuorum(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalItemAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoItem}
                size="sm"
                className="bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
              >
                {salvandoItem ? 'Gravando...' : 'Adicionar Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default DeliberacoesPage

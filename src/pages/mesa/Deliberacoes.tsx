import React, { useState, useEffect } from 'react'
import {
  api,
  normalizarModalidadePresencial,
  type ModalidadePresencial,
  type DeliberacaoRecord,
  type ItemPautaRecord,
  type DeliberacaoStatus,
  type RegraLocatario,
  type TipoPauta,
  type UnidadeRecord,
} from '@/lib/api'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatarCpf, validarCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
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
  Send,
  Mail,
  MessageSquare,
  CheckCircle2,
  Users,
  ExternalLink,
} from 'lucide-react'
import { formatarUnidadeComBloco } from '@/lib/formatadorUnidade'

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
  const [modalidadePresencial, setModalidadePresencial] = useState<ModalidadePresencial>('manual')
  const [mesaPresidenteNome, setMesaPresidenteNome] = useState('')
  const [mesaPresidenteCpf, setMesaPresidenteCpf] = useState('')
  const [mesaPresidenteCpfErro, setMesaPresidenteCpfErro] = useState<string | null>(null)
  const [mesaSecretarioNome, setMesaSecretarioNome] = useState('')
  const [mesaSecretarioCpf, setMesaSecretarioCpf] = useState('')
  const [mesaSecretarioCpfErro, setMesaSecretarioCpfErro] = useState<string | null>(null)
  const [salvandoDelib, setSalvandoDelib] = useState(false)

  // Modal Item de Pauta
  const [modalItemAberto, setModalItemAberto] = useState(false)
  const [itemEditandoId, setItemEditandoId] = useState<string | null>(null)
  const [itemOrdem, setItemOrdem] = useState(1)
  const [itemTitulo, setItemTitulo] = useState('')
  const [itemTexto, setItemTexto] = useState('')
  const [itemQuorum, setItemQuorum] = useState('Maioria simples dos presentes')
  const [itemRegraLocatario, setItemRegraLocatario] =
    useState<RegraLocatario>('somente_proprietario')
  const [itemTipoPauta, setItemTipoPauta] = useState<TipoPauta>('despesas_manutencao')
  const [salvandoItem, setSalvandoItem] = useState(false)

  // Unidades e ausências de proprietários
  const [unidadesCadastradas, setUnidadesCadastradas] = useState<UnidadeRecord[]>([])
  const [unidadesAusentes, setUnidadesAusentes] = useState<string[]>([])
  const [salvandoAusencias, setSalvandoAusencias] = useState(false)

  // Disparo de acesso ao locatário
  const [unidadeSelecionadaDisparo, setUnidadeSelecionadaDisparo] = useState<string>('')
  const [confirmarDisparoAberto, setConfirmarDisparoAberto] = useState(false)
  const [disparandoLocatario, setDisparandoLocatario] = useState(false)
  const [modalDisparoLocatarioAberto, setModalDisparoLocatarioAberto] = useState(false)
  const [ultimoResultadoDisparo, setUltimoResultadoDisparo] = useState<any>(null)

  const carregar = async () => {
    setCarregando(true)
    try {
      const [delibs, unidades] = await Promise.all([
        api.getDeliberacoes(),
        api.getUnidades().catch(() => [] as UnidadeRecord[]),
      ])
      setDeliberacoes(delibs)
      setUnidadesCadastradas(unidades)

      let delibAlvo: DeliberacaoRecord | null = null
      if (delibs.length > 0 && !deliberacaoSelecionada) {
        delibAlvo = delibs[0]
      } else if (deliberacaoSelecionada) {
        delibAlvo = delibs.find((d) => d.id === deliberacaoSelecionada.id) || deliberacaoSelecionada
      }

      if (delibAlvo) {
        setDeliberacaoSelecionada(delibAlvo)
        const itens = await api.getItensPauta(delibAlvo.id)
        setItensPauta(itens)
        const ausentes = Array.isArray(delibAlvo.proprietario_nao_participa_unidades)
          ? delibAlvo.proprietario_nao_participa_unidades
          : []
        setUnidadesAusentes(ausentes)
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
    const ausentes = Array.isArray(d.proprietario_nao_participa_unidades)
      ? d.proprietario_nao_participa_unidades
      : []
    setUnidadesAusentes(ausentes)
  }

  const abrirNovaDeliberacao = async () => {
    setDelibEditId(null)
    setTitulo('')
    setDescricao('')
    setMesaPresidenteNome('')
    setMesaPresidenteCpf('')
    setMesaPresidenteCpfErro(null)
    setMesaSecretarioNome('')
    setMesaSecretarioCpf('')
    setMesaSecretarioCpfErro(null)
    setModalidadePresencial('manual')

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
    setModalidadePresencial(normalizarModalidadePresencial(d.modalidade_presencial))
    setMesaPresidenteNome(d.mesa_presidente_nome || '')
    setMesaPresidenteCpf(formatarCpf(d.mesa_presidente_cpf || ''))
    setMesaPresidenteCpfErro(null)
    setMesaSecretarioNome(d.mesa_secretario_nome || '')
    setMesaSecretarioCpf(formatarCpf(d.mesa_secretario_cpf || ''))
    setMesaSecretarioCpfErro(null)
    setModalDeliberacaoAberto(true)
  }

  const handleSalvarDeliberacao = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação de CPF da Mesa Diretora (se preenchido, deve ser válido)
    let temErro = false
    const rawPresCpf = mesaPresidenteCpf.replace(/\D/g, '')
    if (rawPresCpf.length > 0 && !validarCpf(mesaPresidenteCpf)) {
      setMesaPresidenteCpfErro(MSG_CPF_INVALIDO)
      temErro = true
    } else {
      setMesaPresidenteCpfErro(null)
    }

    const rawSecCpf = mesaSecretarioCpf.replace(/\D/g, '')
    if (rawSecCpf.length > 0 && !validarCpf(mesaSecretarioCpf)) {
      setMesaSecretarioCpfErro(MSG_CPF_INVALIDO)
      temErro = true
    } else {
      setMesaSecretarioCpfErro(null)
    }

    if (temErro) {
      toast({
        title: 'CPF inválido',
        description: 'Corrija os campos de CPF destacados da Mesa Diretora antes de prosseguir.',
        variant: 'destructive',
      })
      return
    }

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
        // Modalidade é um select multivalorado no runtime — gravação dedicada (api.ts)
        await api.salvarModalidadePresencial(delibEditId, modalidadePresencial)
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
        // Modalidade é um select multivalorado no runtime — gravação dedicada (api.ts)
        await api.salvarModalidadePresencial(nova.id, modalidadePresencial)
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
    setItemEditandoId(null)
    setItemOrdem(itensPauta.length + 1)
    setItemTitulo('')
    setItemTexto('')
    setItemQuorum('Maioria simples dos presentes')
    // Herança da regra padrão da assembleia
    const defaultRegra: RegraLocatario = deliberacaoSelecionada?.locatario_pode_votar
      ? 'morador_vota_sempre'
      : 'somente_proprietario'
    setItemRegraLocatario(defaultRegra)
    setItemTipoPauta('despesas_manutencao')
    setModalItemAberto(true)
  }

  const abrirEditarItem = (item: ItemPautaRecord) => {
    setItemEditandoId(item.id)
    setItemOrdem(item.ordem)
    setItemTitulo(item.titulo)
    setItemTexto(item.texto || '')
    setItemQuorum(item.quorum_aplicavel || 'Maioria simples dos presentes')
    const fallbackRegra: RegraLocatario = deliberacaoSelecionada?.locatario_pode_votar
      ? 'morador_vota_sempre'
      : 'somente_proprietario'
    setItemRegraLocatario(item.regra_locatario || fallbackRegra)
    setItemTipoPauta(item.tipo_pauta || 'despesas_manutencao')
    setModalItemAberto(true)
  }

  const handleSalvarItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliberacaoSelecionada) return

    setSalvandoItem(true)
    try {
      if (itemEditandoId) {
        await api.updateItemPauta(itemEditandoId, {
          ordem: itemOrdem,
          titulo: itemTitulo,
          texto: itemTexto,
          quorum_aplicavel: itemQuorum,
          regra_locatario: itemRegraLocatario,
          tipo_pauta: itemTipoPauta,
        })
        toast({ title: 'Item de Pauta Atualizado' })
      } else {
        await api.createItemPauta({
          deliberacao: deliberacaoSelecionada.id,
          ordem: itemOrdem,
          titulo: itemTitulo,
          texto: itemTexto,
          quorum_aplicavel: itemQuorum,
          regra_locatario: itemRegraLocatario,
          tipo_pauta: itemTipoPauta,
        })
        toast({ title: 'Item de Pauta Adicionado' })
      }
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

  // Gestão de ausência de proprietários em despesas de manutenção
  const alternarAusenciaProprietario = async (unidadeId: string) => {
    if (!deliberacaoSelecionada) return
    const existe = unidadesAusentes.includes(unidadeId)
    const novas = existe
      ? unidadesAusentes.filter((id) => id !== unidadeId)
      : [...unidadesAusentes, unidadeId]

    setUnidadesAusentes(novas)
    setSalvandoAusencias(true)
    try {
      await api.updateDeliberacao(deliberacaoSelecionada.id, {
        proprietario_nao_participa_unidades: novas,
      })
      setDeliberacaoSelecionada({
        ...deliberacaoSelecionada,
        proprietario_nao_participa_unidades: novas,
      })
      toast({
        title: existe ? 'Unidade removida da lista' : 'Ausência de proprietário registrada',
        description: existe
          ? 'Proprietário voltou a constar como participante potencial.'
          : 'Proprietário manifestou ausência. O locatário pode receber disparo de acesso.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar ausência',
        description: err?.message || 'Falha ao salvar no banco.',
        variant: 'destructive',
      })
      // reverter
      setUnidadesAusentes(unidadesAusentes)
    } finally {
      setSalvandoAusencias(false)
    }
  }

  // Abertura da confirmação antes do disparo
  const abrirConfirmacaoDisparo = (unidadeId: string) => {
    setUnidadeSelecionadaDisparo(unidadeId)
    setConfirmarDisparoAberto(true)
  }

  // Disparo de acesso ao locatário via api.dispararAcessoLocatario
  const executarDisparoLocatario = async () => {
    if (!deliberacaoSelecionada || !unidadeSelecionadaDisparo) return
    setDisparandoLocatario(true)
    try {
      const resp = await api.dispararAcessoLocatario({
        deliberacaoId: deliberacaoSelecionada.id,
        unidadeId: unidadeSelecionadaDisparo,
      })
      setUltimoResultadoDisparo(resp)
      setConfirmarDisparoAberto(false)
      setModalDisparoLocatarioAberto(true)
      toast({
        title: 'Disparo de Acesso Realizado',
        description: resp.message || 'E-mail enviado e link de WhatsApp gerado.',
      })
    } catch (err: any) {
      toast({
        title: 'Falha no disparo',
        description: err?.message || 'Não foi possível disparar acesso ao locatário.',
        variant: 'destructive',
      })
    } finally {
      setDisparandoLocatario(false)
    }
  }

  const excluirItem = async (itemId: string) => {
    if (!confirm('Deseja excluir este item de pauta?')) return

    // 1. Verificação prévia de cédulas vinculadas ao item
    try {
      const cedulasVinculadas = await pb.collection('cedulas').getList(1, 1, {
        filter: pb.filter('item = {:itemId}', { itemId }),
      })

      if (
        cedulasVinculadas.totalItems > 0 ||
        (cedulasVinculadas.items && cedulasVinculadas.items.length > 0)
      ) {
        toast({
          title: 'Não é possível excluir o item',
          description:
            'Este item possui votação registrada e não pode ser excluído. O histórico das cédulas preserva a auditoria da assembleia.',
          variant: 'destructive',
        })
        return
      }
    } catch (checkErr) {
      console.warn('Erro ao verificar cédulas do item antes da exclusão:', checkErr)
    }

    // 2. Chamada de exclusão com tratamento de erro
    try {
      await api.deleteItemPauta(itemId)
      toast({ title: 'Item Excluído' })
      if (deliberacaoSelecionada) {
        const itens = await api.getItensPauta(deliberacaoSelecionada.id)
        setItensPauta(itens)
      }
    } catch (err: any) {
      const msg = getErrorMessage(err)
      const isRelationError =
        msg.includes('part of a required relation reference') ||
        msg.includes('vinculado a outros dados do sistema') ||
        err?.message?.includes('required relation reference') ||
        err?.response?.message?.includes('required relation reference')

      toast({
        title: 'Erro ao excluir',
        description: isRelationError
          ? 'Este item possui votação registrada e não pode ser excluído. O histórico das cédulas preserva a auditoria da assembleia.'
          : msg || err?.message || 'Falha ao excluir item de pauta.',
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
                          <span className="text-slate-500 ml-1 font-mono">
                            (CPF: {formatarCpf(deliberacaoSelecionada.mesa_presidente_cpf)})
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Secretário(a):</span>{' '}
                        <strong className="text-slate-800">
                          {deliberacaoSelecionada.mesa_secretario_nome || 'Não definido'}
                        </strong>
                        {deliberacaoSelecionada.mesa_secretario_cpf && (
                          <span className="text-slate-500 ml-1 font-mono">
                            (CPF: {formatarCpf(deliberacaoSelecionada.mesa_secretario_cpf)})
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

              {/* Painel do Locatário: Pauta de Despesas de Manutenção e Ausência de Proprietários */}
              <Card className="border-emerald-200 bg-emerald-50/20 shadow-xs">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-emerald-700" />
                        Locatários em Pauta de Manutenção
                      </CardTitle>
                      {itensPauta.some((it) => it.tipo_pauta === 'despesas_manutencao') ? (
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          Pauta de manutenção ativa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 text-[10px]">
                          Nenhum item marcado como manutenção
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs text-slate-600 mt-1">
                      Conforme art. 24 da Lei 4.591/64 e convenção, nas despesas
                      ordinárias/manutenção o locatário pode votar caso o proprietário não
                      participe. Gerencie as ausências manifestadas e dispare as credenciais.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="bg-white rounded-lg border border-emerald-100 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        Unidades com Proprietário Ausente ({unidadesAusentes.length})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Selecione as unidades que informaram que o proprietário não votará
                      </span>
                    </div>

                    {unidadesCadastradas.length === 0 ? (
                      <p className="text-slate-400 italic py-2">
                        Nenhuma unidade cadastrada no sistema.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border rounded bg-slate-50">
                        {unidadesCadastradas.map((u) => {
                          const ausente = unidadesAusentes.includes(u.id)
                          return (
                            <button
                              key={u.id}
                              type="button"
                              disabled={salvandoAusencias}
                              onClick={() => alternarAusenciaProprietario(u.id)}
                              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border flex items-center gap-1 ${
                                ausente
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={
                                ausente
                                  ? 'Proprietário manifestou ausência. Clique para desmarcar.'
                                  : 'Clique para marcar proprietário como ausente.'
                              }
                            >
                              <span>{formatarUnidadeComBloco(u)}</span>
                              {ausente && (
                                <span className="text-amber-700 text-[10px]">✕ ausente</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Lista de Ações de Disparo por Unidade Ausente */}
                  {unidadesAusentes.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1">
                        <Send className="h-3.5 w-3.5 text-cyan-700" />
                        Disparo de Acesso para Locatários Elegíveis
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {unidadesAusentes.map((uid) => {
                          const u = unidadesCadastradas.find((item) => item.id === uid)
                          const label = u
                            ? formatarUnidadeComBloco(u)
                            : `Unidade ${uid.slice(0, 6)}`
                          return (
                            <div
                              key={uid}
                              className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div>
                                <p className="font-bold text-slate-800">{label}</p>
                                <p className="text-[11px] text-slate-500">
                                  Proprietário ausente manifesto
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => abrirConfirmacaoDisparo(uid)}
                                className="h-7 text-xs bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-900 flex items-center gap-1 shrink-0"
                              >
                                <Send className="h-3 w-3" />
                                Disparar Acesso
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
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
                            {/* Badge do Tipo de Pauta */}
                            {item.tipo_pauta === 'despesas_manutencao' && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50"
                              >
                                Despesas de Manutenção
                              </Badge>
                            )}
                            {item.tipo_pauta === 'proprietarios' && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-amber-800 border-amber-300 bg-amber-50"
                              >
                                Somente Proprietários
                              </Badge>
                            )}
                            {item.tipo_pauta === 'geral' && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-slate-700 border-slate-300 bg-slate-100"
                              >
                                Pauta Geral
                              </Badge>
                            )}

                            {/* Badge da Regra do Locatário */}
                            {(!item.regra_locatario ||
                              item.regra_locatario === 'somente_proprietario') && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-amber-700 border-amber-300 bg-amber-50"
                              >
                                Regra: Somente Proprietário
                              </Badge>
                            )}
                            {item.regra_locatario === 'morador_substitui_ausente' && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-blue-700 border-blue-300 bg-blue-50"
                              >
                                Regra: Morador substitui ausente
                              </Badge>
                            )}
                            {item.regra_locatario === 'morador_vota_sempre' && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-purple-700 border-purple-300 bg-purple-50"
                              >
                                Regra: Morador vota sempre
                              </Badge>
                            )}
                          </div>
                          {item.texto && <p className="text-slate-600 text-xs">{item.texto}</p>}
                          {item.quorum_aplicavel && (
                            <p className="text-[11px] text-slate-500">
                              <strong>Quórum regimental exigido:</strong> {item.quorum_aplicavel}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => abrirEditarItem(item)}
                            className="text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 h-7 w-7"
                            title="Editar item"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => excluirItem(item.id)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-7 w-7"
                            title="Excluir item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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

            {/* Bloco: Modalidade do voto presencial (migration 0053) */}
            <div className="p-3 rounded-lg bg-sky-50/60 border border-sky-200 space-y-2.5">
              <div>
                <span className="font-bold text-sky-950 text-[11px] block uppercase tracking-wider">
                  Modalidade do voto presencial
                </span>
                <p className="text-[10px] text-sky-800">
                  Como o condômino presente no salão vota nesta assembleia. O voto remoto (via
                  Koinon) permanece igual nas duas modalidades.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-800">Modalidade</Label>
                <Select
                  value={modalidadePresencial}
                  onValueChange={(val: string) =>
                    setModalidadePresencial(val as ModalidadePresencial)
                  }
                >
                  <SelectTrigger className="text-xs h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estacao">
                      Estação — urna no salão (tablet com CPF + senha ou código)
                    </SelectItem>
                    <SelectItem value="manual">
                      Lançamento manual — mesa digita os totais da cédula física
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-slate-500">
                {modalidadePresencial === 'estacao'
                  ? 'O morador se autentica na Estação (rota /estacao) com CPF + senha do Koinon ou CPF + código de uso único gerado pela mesa, e o voto entra direto na urna criptográfica.'
                  : 'A cédula física é apurada pela mesa e os totais são lançados no Boletim de Urna, que consolida digital + físico por item.'}
              </p>
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
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-slate-800">
                      CPF do Presidente
                    </Label>
                    <span className="text-[10px] text-slate-400">Opcional</span>
                  </div>
                  <Input
                    value={mesaPresidenteCpf}
                    onChange={(e) => {
                      const formatado = formatarCpf(e.target.value)
                      setMesaPresidenteCpf(formatado)
                      if (mesaPresidenteCpfErro) {
                        const raw = formatado.replace(/\D/g, '')
                        if (raw.length === 0 || validarCpf(formatado)) {
                          setMesaPresidenteCpfErro(null)
                        }
                      }
                    }}
                    onBlur={() => {
                      const raw = mesaPresidenteCpf.replace(/\D/g, '')
                      if (raw.length > 0 && !validarCpf(mesaPresidenteCpf)) {
                        setMesaPresidenteCpfErro(MSG_CPF_INVALIDO)
                      } else {
                        setMesaPresidenteCpfErro(null)
                      }
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={`text-xs h-8 bg-white font-mono ${
                      mesaPresidenteCpfErro ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                  />
                  {mesaPresidenteCpfErro && (
                    <p className="text-[11px] font-medium text-red-600">{mesaPresidenteCpfErro}</p>
                  )}
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
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-slate-800">
                      CPF do Secretário(a)
                    </Label>
                    <span className="text-[10px] text-slate-400">Opcional</span>
                  </div>
                  <Input
                    value={mesaSecretarioCpf}
                    onChange={(e) => {
                      const formatado = formatarCpf(e.target.value)
                      setMesaSecretarioCpf(formatado)
                      if (mesaSecretarioCpfErro) {
                        const raw = formatado.replace(/\D/g, '')
                        if (raw.length === 0 || validarCpf(formatado)) {
                          setMesaSecretarioCpfErro(null)
                        }
                      }
                    }}
                    onBlur={() => {
                      const raw = mesaSecretarioCpf.replace(/\D/g, '')
                      if (raw.length > 0 && !validarCpf(mesaSecretarioCpf)) {
                        setMesaSecretarioCpfErro(MSG_CPF_INVALIDO)
                      } else {
                        setMesaSecretarioCpfErro(null)
                      }
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={`text-xs h-8 bg-white font-mono ${
                      mesaSecretarioCpfErro ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                  />
                  {mesaSecretarioCpfErro && (
                    <p className="text-[11px] font-medium text-red-600">{mesaSecretarioCpfErro}</p>
                  )}
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
              {itemEditandoId ? 'Editar Matéria da Pauta' : 'Adicionar Matéria à Pauta'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Cadastre o texto a ser deliberado e a chave de votação do locatário.
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

            {/* Seletor do Tipo de Pauta */}
            <div className="p-2.5 rounded bg-blue-50/70 border border-blue-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-blue-950">Tipo de Pauta</Label>
                <span className="text-[10px] text-blue-700 font-semibold">
                  Regimento / Locatário
                </span>
              </div>
              <Select
                value={itemTipoPauta}
                onValueChange={(val) => setItemTipoPauta(val as TipoPauta)}
              >
                <SelectTrigger className="text-xs h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="despesas_manutencao">
                    Despesas de manutenção (locatário vota se proprietário for ausente)
                  </SelectItem>
                  <SelectItem value="proprietarios">
                    Somente proprietários (inquilino exige procuração / declaração de representante)
                  </SelectItem>
                  <SelectItem value="geral">Geral (matérias gerais do condomínio)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500">
                Define o comportamento da matéria para condôminos inquilinos conforme art. da
                Convenção e Lei 4.591/64.
              </p>
            </div>

            <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-amber-950">
                  Chave de Locatário deste Item
                </Label>
                <span className="text-[10px] text-amber-700 font-semibold">Regra da Convenção</span>
              </div>
              <Select
                value={itemRegraLocatario}
                onValueChange={(val) => setItemRegraLocatario(val as RegraLocatario)}
              >
                <SelectTrigger className="text-xs h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="somente_proprietario">
                    (a) Somente Proprietário — matérias extraordinárias
                  </SelectItem>
                  <SelectItem value="morador_substitui_ausente">
                    (b) Morador substitui ausente — vota se o proprietário não participou
                  </SelectItem>
                  <SelectItem value="morador_vota_sempre">
                    (c) Morador vota sempre — despesas ordinárias/correntes
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500">
                Padrão herdado da assembleia (
                {deliberacaoSelecionada?.locatario_pode_votar
                  ? 'Morador vota sempre'
                  : 'Somente proprietário'}
                ). A mesa pode flexibilizar por item.
              </p>
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
                {salvandoItem
                  ? 'Gravando...'
                  : itemEditandoId
                    ? 'Salvar Alterações'
                    : 'Adicionar Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação antes do Disparo ao Locatário */}
      <Dialog open={confirmarDisparoAberto} onOpenChange={setConfirmarDisparoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send className="h-4 w-4 text-cyan-700" />
              Confirmar Disparo de Acesso ao Locatário
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              O proprietário desta unidade se manifestou ausente nesta assembleia de despesas de
              manutenção.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-3">
            <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
              <p className="font-semibold text-slate-700">
                Unidade selecionada:{' '}
                <span className="font-bold text-slate-900">
                  {(() => {
                    const u = unidadesCadastradas.find((x) => x.id === unidadeSelecionadaDisparo)
                    return u ? formatarUnidadeComBloco(u) : unidadeSelecionadaDisparo
                  })()}
                </span>
              </p>
              <p className="text-slate-500 text-[11px]">
                Assembleia: <span className="font-medium">{deliberacaoSelecionada?.titulo}</span>
              </p>
            </div>

            <div className="p-2.5 bg-cyan-50/70 border border-cyan-200 rounded text-cyan-950 text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-700" />
                Canais de Envio Ativados
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                <li>
                  <strong>E-mail Institucional:</strong> Enfileirado e enviado com credenciais e
                  link de votação.
                </li>
                <li>
                  <strong>WhatsApp (wa.me):</strong> Link pré-formatado pronto para envio direto
                  pela mesa.
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disparandoLocatario}
              onClick={() => setConfirmarDisparoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disparandoLocatario}
              onClick={executarDisparoLocatario}
              className="bg-cyan-700 hover:bg-cyan-800 text-white font-semibold flex items-center gap-1.5"
            >
              {disparandoLocatario ? (
                'Disparando...'
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Confirmar e Disparar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal com Resultado do Disparo (E-mail + WhatsApp) */}
      <Dialog open={modalDisparoLocatarioAberto} onOpenChange={setModalDisparoLocatarioAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Disparo de Acesso ao Locatário Concluído
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Confira os canais de envio gerados para o inquilino da unidade.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-3">
            {ultimoResultadoDisparo && (
              <>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Destinatário:</span>
                    <span className="font-bold text-slate-900">
                      {ultimoResultadoDisparo.destinatario?.nome || 'Locatário'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">E-mail:</span>
                    <span className="font-mono text-slate-800">
                      {ultimoResultadoDisparo.destinatario?.email || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Telefone:</span>
                    <span className="font-mono text-slate-800">
                      {ultimoResultadoDisparo.destinatario?.telefone || '—'}
                    </span>
                  </div>
                </div>

                {/* Status E-mail */}
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-blue-950">E-mail Institucional</p>
                    <p className="text-slate-600 text-[11px]">
                      {ultimoResultadoDisparo.email?.status === 'enviado'
                        ? 'E-mail enviado e registrado no log de e-mails do sistema.'
                        : 'E-mail enfileirado para entrega ao locatário.'}
                    </p>
                  </div>
                </div>

                {/* Status WhatsApp */}
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <MessageSquare className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-emerald-950">WhatsApp Direto</p>
                      <p className="text-slate-600 text-[11px]">
                        Mensagem com link direto de votação pronta para envio instantâneo.
                      </p>
                    </div>
                  </div>

                  {ultimoResultadoDisparo.whatsapp?.link_whatsapp && (
                    <div className="pt-1 flex justify-end">
                      <a
                        href={ultimoResultadoDisparo.whatsapp.link_whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Abrir WhatsApp do Locatário
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setModalDisparoLocatarioAberto(false)}
              className="bg-slate-800 hover:bg-slate-900 text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default DeliberacoesPage

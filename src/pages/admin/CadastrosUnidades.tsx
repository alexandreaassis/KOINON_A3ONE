import React, { useState, useEffect, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import { api, CadastroUnidadeRecord, UnidadeRecord, VinculoCadastro } from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { montarTextoInicial } from '@/lib/modelosMensagem'
import { useAuth } from '@/context/AuthContext'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatarCpf, validarCpf, limparCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import {
  formatarTelefone,
  limparTelefone,
  converterParaWhatsappInternacional,
} from '@/lib/telefone'
import {
  formatarIdentificadorUnidade,
  formatarUnidadeComBloco,
  normalizarBloco,
  temBlocoReal,
} from '@/lib/formatadorUnidade'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  UserPlus,
  BookOpen,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Edit2,
  Trash2,
  Phone,
  Mail,
  ShieldAlert,
  Info,
  RotateCcw,
  Share2,
  Copy,
  MessageCircle,
  MessageSquare,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface LinhaPlanilhaImportada {
  linha: number
  identificador: string
  bloco?: string
  nome: string
  cpf: string
  data_nascimento?: string
  email?: string
  telefone?: string
  vinculo: VinculoCadastro
  status: 'valido' | 'invalido'
  motivosInvalido: string[]
  unidadeIdEncontrada?: string
}

// Ordem natural/numérica para identificadores de unidade ("9" < "101", "12A" após "12")
const normalizarIdentificador = (valor?: string | null): string =>
  (valor || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/(\d+)/g, (m) => m.padStart(10, '0'))
    .toLowerCase()

export const CadastrosUnidadesPage: React.FC = () => {
  const { rotuloUnidade, nomeCondominio, modelosMensagem } = useCondoConfig()
  const { user } = useAuth()

  // Definição e Larguras padrão das Colunas da Tabela (mesmo padrão da Lista de Presença)
  const STORAGE_KEY_LARGURAS = 'koinon_cadastros_unidades_colunas_v1'
  const LARGURAS_PADRAO: Record<string, number> = {
    unidade: 140,
    nome: 240,
    cpf: 130,
    dataNasc: 120,
    vinculo: 180,
    contatos: 200,
    status: 100,
    acoes: 120,
  }
  const LARGURAS_MINIMAS: Record<string, number> = {
    unidade: 80,
    nome: 140,
    cpf: 110,
    dataNasc: 100,
    vinculo: 120,
    contatos: 130,
    status: 80,
    acoes: 100,
  }

  const [largurasColunas, setLargurasColunas] = useState<Record<string, number>>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_LARGURAS)
      if (salvo) {
        const parsed = JSON.parse(salvo)
        return { ...LARGURAS_PADRAO, ...parsed }
      }
    } catch {
      /* ignore */
    }
    return LARGURAS_PADRAO
  })

  // Salvar larguras ao alterar
  const salvarLarguraColuna = (colKey: string, novaLargura: number) => {
    setLargurasColunas((antigas) => {
      const min = LARGURAS_MINIMAS[colKey] || 60
      const ajustada = Math.max(min, Math.round(novaLargura))
      const novo = { ...antigas, [colKey]: ajustada }
      try {
        localStorage.setItem(STORAGE_KEY_LARGURAS, JSON.stringify(novo))
      } catch {
        /* ignore */
      }
      return novo
    })
  }

  // Restaurar larguras ao padrão
  const restaurarLargurasPadrao = () => {
    setLargurasColunas(LARGURAS_PADRAO)
    try {
      localStorage.removeItem(STORAGE_KEY_LARGURAS)
    } catch {
      /* ignore */
    }
    toast({
      title: 'Larguras restauradas',
      description: 'As colunas da tabela de cadastros voltaram à largura padrão.',
    })
  }

  // Iniciar arraste de redimensionamento (Mouse ou Touch)
  const iniciarRedimensionamento = (
    colKey: string,
    eventoInicial: React.MouseEvent | React.TouchEvent,
  ) => {
    eventoInicial.preventDefault()
    eventoInicial.stopPropagation()

    const clientXInicial =
      'touches' in eventoInicial ? eventoInicial.touches[0].clientX : eventoInicial.clientX
    const larguraInicial = largurasColunas[colKey] || LARGURAS_PADRAO[colKey] || 100
    const min = LARGURAS_MINIMAS[colKey] || 60

    let larguraAtual = larguraInicial

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
      const deltaX = currentX - clientXInicial
      larguraAtual = Math.max(min, Math.round(larguraInicial + deltaX))

      setLargurasColunas((prev) => ({
        ...prev,
        [colKey]: larguraAtual,
      }))
    }

    const onPointerUp = () => {
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('mouseup', onPointerUp)
      window.removeEventListener('touchmove', onPointerMove)
      window.removeEventListener('touchend', onPointerUp)
      window.removeEventListener('touchcancel', onPointerUp)

      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      // Persistir valor final
      setLargurasColunas((prev) => {
        const finalObj = { ...prev, [colKey]: larguraAtual }
        try {
          localStorage.setItem(STORAGE_KEY_LARGURAS, JSON.stringify(finalObj))
        } catch {
          /* ignore */
        }
        return finalObj
      })
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    window.addEventListener('mousemove', onPointerMove, { passive: true })
    window.addEventListener('mouseup', onPointerUp)
    window.addEventListener('touchmove', onPointerMove, { passive: true })
    window.addEventListener('touchend', onPointerUp)
    window.addEventListener('touchcancel', onPointerUp)
  }

  // Estados principais
  const [cadastros, setCadastros] = useState<CadastroUnidadeRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroVinculo, setFiltroVinculo] = useState<string>('todos')
  const [filtroUnidade, setFiltroUnidade] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Ordenação por clique nos cabeçalhos (mesma lógica de CredenciaisPendentes)
  const [ordemCadastros, setOrdemCadastros] = useState<'unidade' | 'nome' | 'nascimento'>('unidade')
  const [direcaoOrdemCadastros, setDirecaoOrdemCadastros] = useState<'asc' | 'desc'>('asc')

  // Cabeçalho clicável: primeira ordena pela coluna; segunda inverte a direção
  const alternarOrdemPorColuna = (coluna: 'unidade' | 'nome' | 'nascimento') => {
    if (ordemCadastros === coluna) {
      setDirecaoOrdemCadastros((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrdemCadastros(coluna)
      setDirecaoOrdemCadastros('asc')
    }
  }

  // Modal de Compartilhamento de Link de Cadastro da Unidade
  const [modalLinkAberto, setModalLinkAberto] = useState(false)
  const [unidadeSelecionadaLink, setUnidadeSelecionadaLink] = useState<UnidadeRecord | null>(null)
  const [tokenUnidade, setTokenUnidade] = useState('')
  const [linkGerado, setLinkGerado] = useState('')
  const [carregandoLink, setCarregandoLink] = useState(false)
  const [emailEnvioLink, setEmailEnvioLink] = useState('')
  const [enviandoEmailLink, setEnviandoEmailLink] = useState(false)
  const [whatsappEnvioLink, setWhatsappEnvioLink] = useState('')
  const [avisoValidacaoWhatsappLink, setAvisoValidacaoWhatsappLink] = useState<string | null>(null)
  const [salvarCelularNaUnidade, setSalvarCelularNaUnidade] = useState(false)
  const [salvandoCelularUnidade, setSalvandoCelularUnidade] = useState(false)

  // Modal de Criação / Edição
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [itemEditando, setItemEditando] = useState<CadastroUnidadeRecord | null>(null)

  // Modal de Exclusão com Reautenticação
  const [modalExclusaoAberto, setModalExclusaoAberto] = useState(false)
  const [cadastroParaExcluir, setCadastroParaExcluir] = useState<CadastroUnidadeRecord | null>(null)
  const [authEmailExclusao, setAuthEmailExclusao] = useState('')
  const [authSenhaExclusao, setAuthSenhaExclusao] = useState('')
  const [mostrarSenhaExclusao, setMostrarSenhaExclusao] = useState(false)
  const [excluindoCadastro, setExcluindoCadastro] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  // Campos do formulário
  const [formUnidadeId, setFormUnidadeId] = useState('')
  const [formNome, setFormNome] = useState('')
  const [formCpf, setFormCpf] = useState('')
  const [formCpfErro, setFormCpfErro] = useState<string | null>(null)
  const [formDataNascimento, setFormDataNascimento] = useState('')
  const [formDataNascErro, setFormDataNascErro] = useState<string | null>(null)
  const [formEmail, setFormEmail] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formVinculo, setFormVinculo] = useState<VinculoCadastro>('condomino')
  const [formAtivo, setFormAtivo] = useState(true)
  const [formObservacoes, setFormObservacoes] = useState('')

  // Modal e Processo de Importação Excel
  const [modalImportarAberto, setModalImportarAberto] = useState(false)
  const [linhasImportadas, setLinhasImportadas] = useState<LinhaPlanilhaImportada[]>([])
  const [processandoArquivo, setProcessandoArquivo] = useState(false)
  const [confirmandoImportacao, setConfirmandoImportacao] = useState(false)
  const [resumoImportacao, setResumoImportacao] = useState<{
    total: number
    validos: number
    invalidos: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carregar dados
  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [cads, unids] = await Promise.all([api.getCadastrosUnidades(), api.getUnidades()])
      setCadastros(cads)
      setUnidades(unids)
    } catch (err) {
      console.error('Erro ao carregar cadastros:', err)
      toast({
        title: 'Erro ao carregar cadastros',
        description: getErrorMessage(err, 'Falha ao buscar registros de pessoas por unidade.'),
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Mapa de unidades por id e por identificador (normalizado)
  const mapaUnidadesPorId = useMemo(() => {
    const map = new Map<string, UnidadeRecord>()
    for (const u of unidades) {
      map.set(u.id, u)
    }
    return map
  }, [unidades])

  const mapaUnidadesPorIdentificador = useMemo(() => {
    const map = new Map<string, UnidadeRecord>()
    for (const u of unidades) {
      const chaveSimples = (u.identificador || '').trim().toUpperCase()
      const chaveComposta = `${(u.identificador || '').trim().toUpperCase()}#${(u.bloco || '').trim().toUpperCase()}`
      map.set(chaveSimples, u)
      map.set(chaveComposta, u)
    }
    return map
  }, [unidades])

  // Contagem de vínculos ativos por unidade:
  // PROPRIETÁRIO (proprietário que NÃO mora)
  // MORADOR (condômino OU locatário)
  const vinculosPorUnidade = useMemo(() => {
    const contagem = new Map<
      string,
      { proprietario?: CadastroUnidadeRecord; morador?: CadastroUnidadeRecord }
    >()
    for (const cad of cadastros) {
      if (!cad.ativo) continue
      const atual = contagem.get(cad.unidade) || {}
      if (cad.vinculo === 'proprietario') {
        atual.proprietario = cad
      } else {
        // condomino ou locatario é MORADOR
        atual.morador = cad
      }
      contagem.set(cad.unidade, atual)
    }
    return contagem
  }, [cadastros])

  // Abrir modal para novo cadastro
  const abrirNovoCadastro = (preUnidadeId?: string) => {
    setItemEditando(null)
    setFormUnidadeId(preUnidadeId || unidades[0]?.id || '')
    setFormNome('')
    setFormCpf('')
    setFormCpfErro(null)
    setFormDataNascimento('')
    setFormDataNascErro(null)
    setFormEmail('')
    setFormTelefone('')
    setFormVinculo('condomino')
    setFormAtivo(true)
    setFormObservacoes('')
    setModalAberto(true)
  }

  // Abrir modal para editar cadastro
  const abrirEditarCadastro = (cad: CadastroUnidadeRecord) => {
    setItemEditando(cad)
    setFormUnidadeId(cad.unidade)
    setFormNome(cad.nome || '')
    setFormCpf(formatarCpf(cad.cpf || ''))
    setFormCpfErro(null)
    setFormDataNascimento(cad.data_nascimento ? cad.data_nascimento.slice(0, 10) : '')
    setFormDataNascErro(null)
    setFormEmail(cad.email || '')
    setFormTelefone(formatarTelefone(cad.telefone || ''))
    setFormVinculo(cad.vinculo)
    setFormAtivo(cad.ativo ?? true)
    setFormObservacoes(cad.observacoes || '')
    setModalAberto(true)
  }

  // Validação CPF no formulário
  const handleCpfChange = (val: string) => {
    const formatado = formatarCpf(val)
    setFormCpf(formatado)
    const raw = formatado.replace(/\D/g, '')
    if (raw.length === 11) {
      if (!validarCpf(formatado)) {
        setFormCpfErro(MSG_CPF_INVALIDO)
      } else {
        setFormCpfErro(null)
      }
    } else {
      setFormCpfErro(null)
    }
  }

  // Salvar cadastro individual
  const handleSalvarCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    const cpfLimpo = limparCpf(formCpf)

    if (!formUnidadeId) {
      toast({
        title: 'Unidade obrigatória',
        description: 'Selecione a unidade.',
        variant: 'destructive',
      })
      return
    }

    if (!formNome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome completo.',
        variant: 'destructive',
      })
      return
    }

    if (!validarCpf(formCpf)) {
      setFormCpfErro(MSG_CPF_INVALIDO)
      toast({ title: 'CPF Inválido', description: MSG_CPF_INVALIDO, variant: 'destructive' })
      return
    }

    // Validação da Data de Nascimento (se informada)
    if (formDataNascimento) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formDataNascimento)) {
        setFormDataNascErro('Data inválida (formato AAAA-MM-DD)')
        return
      }
      const partes = formDataNascimento.split('-').map(Number)
      const dataObj = new Date(partes[0], partes[1] - 1, partes[2])
      const hoje = new Date()
      hoje.setHours(23, 59, 59, 999)
      if (dataObj > hoje) {
        setFormDataNascErro('Data de nascimento não pode estar no futuro')
        return
      }
      if (partes[0] < 1900) {
        setFormDataNascErro('Ano incompatível (anterior a 1900)')
        return
      }
      setFormDataNascErro(null)
    }

    // Regra de Unidade: máximo de 1 PROPRIETÁRIO e 1 MORADOR ativo por unidade
    if (formAtivo) {
      const vinculosAtuais = vinculosPorUnidade.get(formUnidadeId)
      const eGrupoMorador = formVinculo === 'condomino' || formVinculo === 'locatario'
      const eGrupoProprietario = formVinculo === 'proprietario'

      if (
        eGrupoProprietario &&
        vinculosAtuais?.proprietario &&
        vinculosAtuais.proprietario.id !== itemEditando?.id
      ) {
        toast({
          title: 'Vínculo de Proprietário já preenchido',
          description: `A unidade já possui o(a) proprietário(a) "${vinculosAtuais.proprietario.nome}" ativo(a). Desative-o(a) antes de cadastrar outro.`,
          variant: 'destructive',
        })
        return
      }

      if (
        eGrupoMorador &&
        vinculosAtuais?.morador &&
        vinculosAtuais.morador.id !== itemEditando?.id
      ) {
        toast({
          title: 'Vínculo de Morador já preenchido',
          description: `A unidade já possui o(a) morador(a) (${vinculosAtuais.morador.vinculo.toUpperCase()}) "${vinculosAtuais.morador.nome}" ativo(a). Desative-o(a) antes de cadastrar outro.`,
          variant: 'destructive',
        })
        return
      }
    }

    // Validação de CPF duplicado na mesma unidade
    const cpfDuplicadoNaUnidade = cadastros.find(
      (c) =>
        c.unidade === formUnidadeId && limparCpf(c.cpf) === cpfLimpo && c.id !== itemEditando?.id,
    )
    if (cpfDuplicadoNaUnidade) {
      toast({
        title: 'CPF já cadastrado nesta unidade',
        description: `O CPF informado já está vinculado a esta unidade como "${cpfDuplicadoNaUnidade.vinculo.toUpperCase()}".`,
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const payload: Partial<CadastroUnidadeRecord> = {
        unidade: formUnidadeId,
        nome: formNome.trim(),
        cpf: cpfLimpo,
        data_nascimento: formDataNascimento ? `${formDataNascimento} 00:00:00.000Z` : undefined,
        email: formEmail.trim().toLowerCase() || undefined,
        telefone: formTelefone.trim() || undefined,
        vinculo: formVinculo,
        status_aprovacao: 'aprovado',
        origem: itemEditando?.origem || 'admin',
        ativo: formAtivo,
        observacoes: formObservacoes.trim() || undefined,
      }

      if (itemEditando) {
        await api.atualizarCadastroUnidade(itemEditando.id, payload)
        toast({ title: 'Cadastro atualizado', description: 'Dados gravados com sucesso.' })
      } else {
        await api.criarCadastroUnidade(payload)
        toast({ title: 'Cadastro criado', description: 'Pessoa vinculada à unidade com sucesso.' })
      }

      setModalAberto(false)
      await carregarDados()
    } catch (err) {
      console.error('Erro ao salvar cadastro:', err)
      toast({
        title: 'Erro ao gravar',
        description: getErrorMessage(err, 'Falha ao salvar registro.'),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Selecionar ou alternar a Unidade no Modal de Link
  const selecionarUnidadeNoModalLink = async (unidadeId: string) => {
    const unid = mapaUnidadesPorId.get(unidadeId)
    if (!unid) return

    setUnidadeSelecionadaLink(unid)
    setEmailEnvioLink(unid.contato_email || '')
    setWhatsappEnvioLink(unid.contato_celular ? formatarTelefone(unid.contato_celular) : '')
    setAvisoValidacaoWhatsappLink(null)
    setSalvarCelularNaUnidade(false)
    setCarregandoLink(true)

    try {
      let t = unid.token_cadastro
      if (!t) {
        const resp = await api.garantirTokenUnidade(unid.id)
        if (resp?.success && resp.token) {
          t = resp.token
          // atualizar lista e mapa local de unidades
          setUnidades((antigas) =>
            antigas.map((u) => (u.id === unid.id ? { ...u, token_cadastro: t } : u)),
          )
        }
      }
      setTokenUnidade(t || '')
      const origin = window.location.origin
      const urlCompleta = `${origin}/cadastro/${t || ''}`
      setLinkGerado(urlCompleta)
    } catch (err: any) {
      console.error('Erro ao obter token da unidade:', err)
      toast({
        title: 'Erro ao gerar link',
        description:
          err?.data?.message || err?.message || 'Falha ao obter link de cadastro da unidade.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoLink(false)
    }
  }

  // Abrir Modal de Compartilhamento do Link da Unidade
  const abrirModalLinkUnidade = async (unidadeId?: string) => {
    // Se unidadeId não foi informada ou não existe, usa a primeira unidade cadastrada
    const idAlvo = unidadeId && mapaUnidadesPorId.has(unidadeId) ? unidadeId : unidades[0]?.id

    if (!idAlvo) {
      toast({
        title: 'Nenhuma unidade cadastrada',
        description:
          'Cadastre ao menos uma unidade no condomínio antes de gerar links de cadastro.',
        variant: 'destructive',
      })
      return
    }

    setModalLinkAberto(true)
    await selecionarUnidadeNoModalLink(idAlvo)
  }

  // Copiar link para área de transferência
  const copiarLinkCadastro = async () => {
    if (!linkGerado) return
    try {
      await navigator.clipboard.writeText(linkGerado)
      toast({
        title: 'Link copiado!',
        description: 'O link de cadastro da unidade foi copiado para a área de transferência.',
      })
    } catch {
      toast({
        title: 'Falha ao copiar',
        description: 'Selecione e copie o endereço manualmente.',
        variant: 'destructive',
      })
    }
  }

  // Handlers do campo de WhatsApp do Modal de Link
  const handleWhatsappEnvioLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const limpo = limparTelefone(e.target.value)
    setWhatsappEnvioLink(formatarTelefone(limpo))
    if (avisoValidacaoWhatsappLink) {
      setAvisoValidacaoWhatsappLink(null)
    }
  }

  const handleWhatsappEnvioLinkPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const texto = e.clipboardData.getData('text') || ''
    const limpo = limparTelefone(texto)
    setWhatsappEnvioLink(formatarTelefone(limpo))
    if (avisoValidacaoWhatsappLink) {
      setAvisoValidacaoWhatsappLink(null)
    }
  }

  // Enviar link via WhatsApp (wa.me) com validação e formatação 55 + DDD + número
  const enviarLinkWhatsApp = async () => {
    if (!linkGerado || !unidadeSelecionadaLink) return

    const conversao = converterParaWhatsappInternacional(whatsappEnvioLink)

    if (!conversao.valido) {
      const msg = `Número incompleto. Informe o DDD e o número com pelo menos 10 dígitos (faltam ${conversao.faltamDigitos} dígito${conversao.faltamDigitos > 1 ? 's' : ''}).`
      setAvisoValidacaoWhatsappLink(msg)
      toast({
        title: 'Número de WhatsApp incompleto',
        description: msg,
        variant: 'destructive',
      })
      return
    }

    setAvisoValidacaoWhatsappLink(null)

    const descUnidade = formatarUnidadeComBloco(unidadeSelecionadaLink, rotuloUnidade)
    const texto = encodeURIComponent(
      montarTextoInicial(modelosMensagem, 'whatsapp', 'cadastro_aprovado', {
        unidade: descUnidade,
        link: linkGerado,
      }),
    )

    const urlWa = `https://wa.me/${conversao.numeroInternacional}?text=${texto}`

    // Se checkbox estiver marcado ou se o número digitado for diferente do salvo, permite atualizar
    const numeroFormatadoNovo = conversao.formatado
    const numeroAntigo = unidadeSelecionadaLink.contato_celular || ''

    if (salvarCelularNaUnidade && conversao.digitosNacionais !== limparTelefone(numeroAntigo)) {
      setSalvandoCelularUnidade(true)
      try {
        await api.atualizarUnidade(unidadeSelecionadaLink.id, {
          contato_celular: numeroFormatadoNovo,
        })
        // Atualizar estados locais
        setUnidadeSelecionadaLink((ant) =>
          ant ? { ...ant, contato_celular: numeroFormatadoNovo } : ant,
        )
        setUnidades((antigas) =>
          antigas.map((u) =>
            u.id === unidadeSelecionadaLink.id ? { ...u, contato_celular: numeroFormatadoNovo } : u,
          ),
        )
        toast({
          title: 'WhatsApp da unidade atualizado',
          description: `O telefone da ${descUnidade} foi salvo como ${numeroFormatadoNovo} para os próximos envios.`,
        })
      } catch (err) {
        console.warn('Aviso ao salvar telefone na unidade:', err)
      } finally {
        setSalvandoCelularUnidade(false)
      }
    }

    window.open(urlWa, '_blank')
  }

  // Enviar link via E-mail institucional
  const enviarLinkPorEmail = async () => {
    if (!unidadeSelecionadaLink || !emailEnvioLink.trim() || !linkGerado) {
      toast({
        title: 'E-mail obrigatório',
        description: 'Informe um e-mail válido para envio.',
        variant: 'destructive',
      })
      return
    }

    setEnviandoEmailLink(true)
    try {
      const resp = await api.enviarLinkCadastroEmail({
        unidadeId: unidadeSelecionadaLink.id,
        email: emailEnvioLink.trim().toLowerCase(),
        link: linkGerado,
      })
      toast({
        title: 'E-mail Enfileirado',
        description: resp?.message || 'Link enviado com sucesso para o destinatário.',
      })
    } catch (err: any) {
      toast({
        title: 'Falha no envio de e-mail',
        description: err?.data?.message || err?.message || 'Não foi possível enviar o e-mail.',
        variant: 'destructive',
      })
    } finally {
      setEnviandoEmailLink(false)
    }
  }

  // Alternar ativo/inativo
  const alternarAtivo = async (cad: CadastroUnidadeRecord) => {
    const novoStatus = !cad.ativo

    if (novoStatus) {
      const vinculosAtuais = vinculosPorUnidade.get(cad.unidade)
      const eGrupoMorador = cad.vinculo === 'condomino' || cad.vinculo === 'locatario'
      const eGrupoProprietario = cad.vinculo === 'proprietario'

      if (
        eGrupoProprietario &&
        vinculosAtuais?.proprietario &&
        vinculosAtuais.proprietario.id !== cad.id
      ) {
        toast({
          title: 'Limite atingido',
          description: `A unidade já possui o proprietário "${vinculosAtuais.proprietario.nome}" ativo.`,
          variant: 'destructive',
        })
        return
      }

      if (eGrupoMorador && vinculosAtuais?.morador && vinculosAtuais.morador.id !== cad.id) {
        toast({
          title: 'Limite atingido',
          description: `A unidade já possui o morador (${vinculosAtuais.morador.vinculo.toUpperCase()}) "${vinculosAtuais.morador.nome}" ativo.`,
          variant: 'destructive',
        })
        return
      }
    }

    try {
      await api.atualizarCadastroUnidade(cad.id, { ativo: novoStatus })
      toast({
        title: novoStatus ? 'Vínculo Ativado' : 'Vínculo Desativado',
      })
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao alterar status',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  // Abrir modal de exclusão com reautenticação
  const abrirModalExcluirCadastro = (cad: CadastroUnidadeRecord) => {
    setCadastroParaExcluir(cad)
    setAuthEmailExclusao(user?.email || '')
    setAuthSenhaExclusao('')
    setErroExclusao(null)
    setModalExclusaoAberto(true)
  }

  // Executar exclusão com validação de login e senha no servidor
  const handleConfirmarExclusaoComReautenticacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cadastroParaExcluir) return

    if (!authEmailExclusao.trim()) {
      setErroExclusao('Informe seu e-mail institucional.')
      return
    }
    if (!authSenhaExclusao) {
      setErroExclusao('Informe sua senha para autorizar a exclusão.')
      return
    }

    setExcluindoCadastro(true)
    setErroExclusao(null)

    try {
      const resp = await api.excluirCadastroUnidadeComReautenticacao({
        cadastroId: cadastroParaExcluir.id,
        email: authEmailExclusao.trim(),
        password: authSenhaExclusao,
      })

      toast({
        title: 'Cadastro excluído com sucesso',
        description:
          resp?.message ||
          `O cadastro de "${cadastroParaExcluir.nome}" foi removido e registrado no Histórico de Alterações.`,
      })

      setModalExclusaoAberto(false)
      setCadastroParaExcluir(null)
      setAuthSenhaExclusao('')
      await carregarDados()
    } catch (err: any) {
      console.error('Erro na exclusão com reautenticação:', err)
      const msg =
        err?.data?.message ||
        err?.message ||
        'Falha ao autenticar ou excluir o cadastro. Verifique suas credenciais.'
      setErroExclusao(msg)
      toast({
        title: 'Falha na exclusão',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setExcluindoCadastro(false)
    }
  }

  // ================= EXPORTAR EXCEL =================
  const handleExportarExcel = () => {
    try {
      // Montar dados no formato exato que o importador aceita
      const dadosPlanilha = cadastros.map((cad) => {
        const unid = mapaUnidadesPorId.get(cad.unidade)
        return {
          Unidade: unid?.identificador || '',
          Bloco: unid?.bloco || '',
          'Nome Completo': cad.nome || '',
          CPF: formatarCpf(cad.cpf || ''),
          'Data Nasc': cad.data_nascimento ? cad.data_nascimento.slice(0, 10) : '',
          Vínculo:
            cad.vinculo === 'proprietario'
              ? 'PROPRIETÁRIO'
              : cad.vinculo === 'condomino'
                ? 'CONDÔMINO'
                : 'LOCATÁRIO',
          'E-mail': cad.email || '',
          Telefone: cad.telefone || '',
          Status: cad.status_aprovacao ? cad.status_aprovacao.toUpperCase() : 'APROVADO',
          Ativo: cad.ativo ? 'SIM' : 'NÃO',
          Observações: cad.observacoes || '',
        }
      })

      // Se estiver vazio, incluir ao menos 1 linha de exemplo guiada
      if (dadosPlanilha.length === 0) {
        const unidExemplo = unidades[0]
        dadosPlanilha.push({
          Unidade: unidExemplo?.identificador || '101',
          Bloco: unidExemplo?.bloco || 'Bloco A',
          'Nome Completo': 'Exemplo Silva',
          CPF: '000.000.000-00',
          'Data Nasc': '1985-05-20',
          Vínculo: 'CONDÔMINO',
          'E-mail': 'exemplo@condominio.com',
          Telefone: '(11) 99999-9999',
          Status: 'APROVADO',
          Ativo: 'SIM',
          Observações: 'Modelo de importação',
        })
      }

      const ws = XLSX.utils.json_to_sheet(dadosPlanilha)
      // Ajustar larguras de colunas
      ws['!cols'] = [
        { wch: 12 }, // Unidade
        { wch: 14 }, // Bloco
        { wch: 32 }, // Nome Completo
        { wch: 16 }, // CPF
        { wch: 14 }, // Data Nasc
        { wch: 16 }, // Vínculo
        { wch: 28 }, // E-mail
        { wch: 18 }, // Telefone
        { wch: 12 }, // Status
        { wch: 8 }, // Ativo
        { wch: 25 }, // Observações
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Cadastros')

      const dataHoje = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `cadastros_lago_azul_${dataHoje}.xlsx`)
      toast({ title: 'Planilha exportada', description: 'Download concluído com sucesso.' })
    } catch (err) {
      console.error('Erro ao exportar excel:', err)
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar a planilha.',
        variant: 'destructive',
      })
    }
  }

  // ================= IMPORTAR EXCEL =================
  const abrirModalImportacao = () => {
    setLinhasImportadas([])
    setResumoImportacao(null)
    setModalImportarAberto(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const normalizarVinculoTexto = (txt: string): VinculoCadastro | null => {
    const t = (txt || '').trim().toUpperCase()
    if (t.includes('PROP')) return 'proprietario'
    if (t.includes('COND')) return 'condomino'
    if (t.includes('LOC') || t.includes('INQ')) return 'locatario'
    return null
  }

  const handleArquivoSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProcessandoArquivo(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: 'array' })
      const primeiraAba = wb.SheetNames[0]
      if (!primeiraAba) throw new Error('A planilha está vazia.')

      const ws = wb.Sheets[primeiraAba]
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      if (rawRows.length === 0) {
        throw new Error('Nenhuma linha de dados encontrada na planilha.')
      }

      // Validação linha a linha
      const linhasProcessadas: LinhaPlanilhaImportada[] = []
      const cpfsVistosNoArquivo = new Set<string>()
      const vinculosAtivosNoArquivoPorUnidade = new Map<
        string,
        { proprietario?: number; morador?: number }
      >()

      rawRows.forEach((row, idx) => {
        const linhaNum = idx + 2 // Linha 1 = cabeçalho no excel
        const motivos: string[] = []

        // Campos com suporte a variações de cabeçalho
        const identificadorRaw = String(
          row['Unidade'] || row['unidade'] || row['UNIDADE'] || row['Identificador'] || '',
        ).trim()
        const blocoRaw = String(row['Bloco'] || row['bloco'] || row['BLOCO'] || '').trim()
        const nomeRaw = String(
          row['Nome Completo'] || row['Nome'] || row['nome'] || row['NOME'] || '',
        ).trim()
        const cpfRaw = String(row['CPF'] || row['cpf'] || row['Cpf'] || '').trim()
        const dataNascRaw = String(
          row['Data Nasc'] ||
            row['Data de Nascimento'] ||
            row['Nascimento'] ||
            row['data_nascimento'] ||
            '',
        ).trim()
        const emailRaw = String(
          row['E-mail'] || row['Email'] || row['email'] || row['EMAIL'] || '',
        ).trim()
        const telefoneRaw = String(
          row['Telefone'] || row['telefone'] || row['TELEFONE'] || row['Celular'] || '',
        ).trim()
        const vinculoRaw = String(
          row['Vínculo'] || row['Vinculo'] || row['vinculo'] || row['Tipo'] || '',
        ).trim()
        const ativoRaw = String(row['Ativo'] || row['ativo'] || '')
          .trim()
          .toUpperCase()

        const ativoBool =
          ativoRaw !== 'NÃO' && ativoRaw !== 'NAO' && ativoRaw !== 'FALSE' && ativoRaw !== '0'

        // 1. Identificar Unidade no Banco
        let unidadeEncontrada: UnidadeRecord | undefined
        if (identificadorRaw) {
          if (blocoRaw) {
            unidadeEncontrada = mapaUnidadesPorIdentificador.get(
              `${identificadorRaw.toUpperCase()}#${blocoRaw.toUpperCase()}`,
            )
          }
          if (!unidadeEncontrada) {
            unidadeEncontrada = mapaUnidadesPorIdentificador.get(identificadorRaw.toUpperCase())
          }
        }

        if (!unidadeEncontrada) {
          motivos.push(`Unidade "${identificadorRaw || '—'}" não cadastrada no condomínio.`)
        }

        // 2. Validar Nome
        if (!nomeRaw || nomeRaw.length < 2) {
          motivos.push('Nome completo ausente ou inválido.')
        }

        // 3. Validar CPF
        const cpfLimpo = limparCpf(cpfRaw)
        if (!cpfLimpo || cpfLimpo.length !== 11 || !validarCpf(cpfRaw)) {
          motivos.push('CPF inválido ou não informado.')
        } else {
          // Checar duplicidade no mesmo arquivo
          if (cpfsVistosNoArquivo.has(cpfLimpo)) {
            motivos.push('CPF duplicado dentro do próprio arquivo.')
          }
          cpfsVistosNoArquivo.add(cpfLimpo)
        }

        // 4. Validar Vínculo
        const vinculoNormalizado = normalizarVinculoTexto(vinculoRaw)
        if (!vinculoNormalizado) {
          motivos.push(
            `Vínculo "${vinculoRaw}" inválido. Permitidos: PROPRIETÁRIO, CONDÔMINO ou LOCATÁRIO.`,
          )
        }

        // 5. Validar Regra de Unidade (max 1 proprietário e max 1 morador)
        if (unidadeEncontrada && vinculoNormalizado && ativoBool) {
          const uId = unidadeEncontrada.id
          const vinculosExistentes = vinculosPorUnidade.get(uId)
          const vinculosPlanilha = vinculosAtivosNoArquivoPorUnidade.get(uId) || {}

          const eProprietario = vinculoNormalizado === 'proprietario'
          const eMorador = vinculoNormalizado === 'condomino' || vinculoNormalizado === 'locatario'

          if (eProprietario) {
            if (vinculosPlanilha.proprietario) {
              motivos.push(
                `A planilha já possui outro proprietário ativo para a unidade ${identificadorRaw} na linha ${vinculosPlanilha.proprietario}.`,
              )
            } else if (vinculosExistentes?.proprietario) {
              motivos.push(
                `A unidade já possui proprietário ativo no banco ("${vinculosExistentes.proprietario.nome}").`,
              )
            } else {
              vinculosPlanilha.proprietario = linhaNum
            }
          }

          if (eMorador) {
            if (vinculosPlanilha.morador) {
              motivos.push(
                `A planilha já possui outro morador ativo para a unidade ${identificadorRaw} na linha ${vinculosPlanilha.morador}.`,
              )
            } else if (vinculosExistentes?.morador) {
              motivos.push(
                `A unidade já possui morador ativo no banco ("${vinculosExistentes.morador.nome}").`,
              )
            } else {
              vinculosPlanilha.morador = linhaNum
            }
          }

          vinculosAtivosNoArquivoPorUnidade.set(uId, vinculosPlanilha)
        }

        linhasProcessadas.push({
          linha: linhaNum,
          identificador: identificadorRaw,
          bloco: blocoRaw,
          nome: nomeRaw,
          cpf: cpfLimpo,
          data_nascimento: dataNascRaw || undefined,
          email: emailRaw,
          telefone: telefoneRaw,
          vinculo: vinculoNormalizado || 'condomino',
          status: motivos.length === 0 ? 'valido' : 'invalido',
          motivosInvalido: motivos,
          unidadeIdEncontrada: unidadeEncontrada?.id,
        })
      })

      const totalValidos = linhasProcessadas.filter((l) => l.status === 'valido').length
      const totalInvalidos = linhasProcessadas.length - totalValidos

      setLinhasImportadas(linhasProcessadas)
      setResumoImportacao({
        total: linhasProcessadas.length,
        validos: totalValidos,
        invalidos: totalInvalidos,
      })
    } catch (err: any) {
      console.error('Erro ao processar planilha:', err)
      toast({
        title: 'Falha ao ler arquivo',
        description: err?.message || 'Verifique se o arquivo é um .xlsx válido.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoArquivo(false)
    }
  }

  // Confirmar Importação dos Registros Válidos
  const handleConfirmarImportacao = async () => {
    const validos = linhasImportadas.filter((l) => l.status === 'valido')
    if (validos.length === 0) {
      toast({
        title: 'Nenhum registro válido',
        description: 'Corrija os erros na planilha antes de importar.',
        variant: 'destructive',
      })
      return
    }

    setConfirmandoImportacao(true)
    let criados = 0
    let falhas = 0

    try {
      for (const item of validos) {
        if (!item.unidadeIdEncontrada) continue
        try {
          await api.criarCadastroUnidade({
            unidade: item.unidadeIdEncontrada,
            nome: item.nome,
            cpf: item.cpf,
            data_nascimento: item.data_nascimento
              ? `${item.data_nascimento} 00:00:00.000Z`
              : undefined,
            email: item.email || undefined,
            telefone: item.telefone || undefined,
            vinculo: item.vinculo,
            status_aprovacao: 'aprovado',
            origem: 'admin',
            ativo: true,
            observacoes: 'Importado em massa via planilha Excel',
          })
          criados++
        } catch (itemErr) {
          console.warn('Erro ao importar linha', item.linha, itemErr)
          falhas++
        }
      }

      // Registrar auditoria
      try {
        await api.registrarEventoAuditoria({
          evento: 'usuario_gerenciado',
          fator: `Importação em massa via Excel: ${criados} pessoas cadastradas por ${user?.name || user?.email}`,
        })
      } catch {
        /* auditoria silenciosa */
      }

      toast({
        title: 'Importação Concluída',
        description: `${criados} cadastros importados com sucesso! ${falhas > 0 ? `(${falhas} falhas)` : ''}`,
      })

      setModalImportarAberto(false)
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro durante a importação',
        description: getErrorMessage(err, 'Falha ao processar lotes.'),
        variant: 'destructive',
      })
    } finally {
      setConfirmandoImportacao(false)
    }
  }

  // Filtragem da tabela principal
  const cadastrosFiltrados = useMemo(() => {
    return cadastros
      .filter((cad) => {
        // Filtro de Busca
        if (filtroBusca.trim()) {
          const termo = filtroBusca.toLowerCase().trim()
          const termoCpf = termo.replace(/\D/g, '')
          const unid = mapaUnidadesPorId.get(cad.unidade)
          const matchNome = (cad.nome || '').toLowerCase().includes(termo)
          const matchCpf = (cad.cpf || '').includes(termoCpf || termo)
          const matchEmail = (cad.email || '').toLowerCase().includes(termo)
          const matchUnid =
            (unid?.identificador || '').toLowerCase().includes(termo) ||
            (unid?.bloco || '').toLowerCase().includes(termo)
          if (!matchNome && !matchCpf && !matchEmail && !matchUnid) return false
        }

        // Filtro de Vínculo
        if (filtroVinculo !== 'todos' && cad.vinculo !== filtroVinculo) {
          return false
        }

        // Filtro de Unidade
        if (filtroUnidade !== 'todas' && cad.unidade !== filtroUnidade) {
          return false
        }

        // Filtro de Status Ativo
        if (filtroStatus === 'ativos' && !cad.ativo) return false
        if (filtroStatus === 'inativos' && cad.ativo) return false

        return true
      })
      .sort((a, b) => {
        const fator = direcaoOrdemCadastros === 'asc' ? 1 : -1
        if (ordemCadastros === 'nome') {
          return (
            fator * (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
          )
        }
        if (ordemCadastros === 'nascimento') {
          // data_nascimento chega como 'YYYY-MM-DD 00:00:00.000Z' — a comparação
          // lexicográfica do prefixo ISO equivale à comparação cronológica
          return (
            fator *
            (a.data_nascimento || '9999-12-31')
              .slice(0, 10)
              .localeCompare((b.data_nascimento || '9999-12-31').slice(0, 10))
          )
        }
        // 'unidade': ordem natural/numérica do identificador ("9" < "101")
        const ua = mapaUnidadesPorId.get(a.unidade)
        const ub = mapaUnidadesPorId.get(b.unidade)
        const da = normalizarIdentificador(ua?.identificador)
        const db = normalizarIdentificador(ub?.identificador)
        if (da && db && da !== db) return fator * (da < db ? -1 : 1)
        if (da !== db) return da ? fator : -fator
        return fator * (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
      })
  }, [
    cadastros,
    filtroBusca,
    filtroVinculo,
    filtroUnidade,
    filtroStatus,
    mapaUnidadesPorId,
    ordemCadastros,
    direcaoOrdemCadastros,
  ])

  // Função utilitária para cálculo de idade
  const calcularIdade = (dataIso?: string): { anos: number; textoFormatado: string } | null => {
    if (!dataIso) return null
    try {
      const parte = dataIso.slice(0, 10).split('-').map(Number)
      if (parte.length !== 3 || isNaN(parte[0]) || isNaN(parte[1]) || isNaN(parte[2])) return null
      const dataNasc = new Date(parte[0], parte[1] - 1, parte[2])
      const hoje = new Date()
      let anos = hoje.getFullYear() - dataNasc.getFullYear()
      const m = hoje.getMonth() - dataNasc.getMonth()
      if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
        anos--
      }
      if (anos < 0) return null
      const dataBr = `${String(parte[2]).padStart(2, '0')}/${String(parte[1]).padStart(2, '0')}/${parte[0]}`
      return { anos, textoFormatado: `${dataBr} (${anos} anos)` }
    } catch {
      return null
    }
  }

  // Estatísticas do cabeçalho
  const stats = useMemo(() => {
    let prop = 0
    let cond = 0
    let loc = 0
    let ativos = 0
    let pendentes = 0
    for (const c of cadastros) {
      if (c.ativo) ativos++
      if (c.status_aprovacao === 'pendente') pendentes++
      if (c.vinculo === 'proprietario') prop++
      else if (c.vinculo === 'condomino') cond++
      else if (c.vinculo === 'locatario') loc++
    }
    return { total: cadastros.length, ativos, pendentes, prop, cond, loc }
  }, [cadastros])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" /> Cadastros por Unidade
            </h2>
            <Badge variant="outline" className="text-xs">
              {stats.total} pessoas cadastradas
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de vínculos do condomínio: Proprietário (não residente), Condômino (residente) e
            Locatário. Cada unidade comporta até 2 vínculos ativos (1 Proprietário e 1 Morador).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open('/admin/cadastros/manual', '_blank')}
            className="text-xs h-9 border-[#0066FF] text-[#0066FF] hover:bg-blue-50 font-medium"
            title="Abrir o Manual de Cadastro por Link da Unidade com layout profissional para impressão em PDF (Ctrl+P)"
          >
            <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Manual (PDF)
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportarExcel}
            className="text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Baixar Planilha (.xlsx)
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={abrirModalImportacao}
            className="text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5 text-cyan-600" /> Importar Excel (.xlsx)
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => abrirModalLinkUnidade()}
            className="text-xs h-9 border-[#0066FF]/30 text-[#002B5E] hover:bg-[#0066FF]/5 font-semibold"
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5 text-[#0066FF]" /> Link de Cadastro
          </Button>

          <Button
            size="sm"
            onClick={() => abrirNovoCadastro()}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 font-semibold"
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Novo Cadastro
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={restaurarLargurasPadrao}
            className="text-[11px] h-9 px-2.5 border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-[10px]"
            title="Restaurar a largura padrão de todas as colunas"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1 text-[#1F6B94]" /> Restaurar larguras
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Total Ativos
          </span>
          <span className="text-lg font-bold text-slate-900">{stats.ativos}</span>
          <span className="text-[11px] text-slate-500 block">habilitados para convocação</span>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Proprietários (Não Res.)
          </span>
          <span className="text-lg font-bold text-amber-700">{stats.prop}</span>
          <span className="text-[11px] text-slate-500 block">titulares patrimoniais</span>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Condôminos (Residentes)
          </span>
          <span className="text-lg font-bold text-cyan-700">{stats.cond}</span>
          <span className="text-[11px] text-slate-500 block">proprietários que moram</span>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Locatários (Inquilinos)
          </span>
          <span className="text-lg font-bold text-purple-700">{stats.loc}</span>
          <span className="text-[11px] text-slate-500 block">votam conforme pauta</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Campo Busca */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, CPF ou unidade..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Filtro Vínculo */}
            <div>
              <Select value={filtroVinculo} onValueChange={setFiltroVinculo}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Vínculo: Todos" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="todos">Todos os Vínculos</SelectItem>
                  <SelectItem value="proprietario">Proprietário (Não Mora)</SelectItem>
                  <SelectItem value="condomino">Condômino (Mora)</SelectItem>
                  <SelectItem value="locatario">Locatário (Inquilino)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Unidade */}
            <div>
              <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Unidade: Todas" />
                </SelectTrigger>
                <SelectContent className="text-xs max-h-56">
                  <SelectItem value="todas">Todas as Unidades</SelectItem>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {formatarUnidadeComBloco(u, rotuloUnidade)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Status */}
            <div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Status: Todos" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="ativos">Apenas Ativos</SelectItem>
                  <SelectItem value="inativos">Apenas Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Cadastros com Colunas Redimensionáveis */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table
              className="w-full text-xs text-left border-collapse"
              style={{
                tableLayout: 'fixed',
                minWidth:
                  largurasColunas.unidade +
                  largurasColunas.nome +
                  largurasColunas.cpf +
                  largurasColunas.dataNasc +
                  largurasColunas.vinculo +
                  largurasColunas.contatos +
                  largurasColunas.status +
                  largurasColunas.acoes,
              }}
            >
              <colgroup>
                <col style={{ width: `${largurasColunas.unidade}px` }} />
                <col style={{ width: `${largurasColunas.nome}px` }} />
                <col style={{ width: `${largurasColunas.cpf}px` }} />
                <col style={{ width: `${largurasColunas.dataNasc}px` }} />
                <col style={{ width: `${largurasColunas.vinculo}px` }} />
                <col style={{ width: `${largurasColunas.contatos}px` }} />
                <col style={{ width: `${largurasColunas.status}px` }} />
                <col style={{ width: `${largurasColunas.acoes}px` }} />
              </colgroup>
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px] select-none">
                <tr>
                  {/* Coluna 1: Unidade */}
                  <th className="py-3 px-4 relative group">
                    <span className="truncate block">
                      <button
                        type="button"
                        onClick={() => alternarOrdemPorColuna('unidade')}
                        aria-label={`Ordenar por Unidade${
                          ordemCadastros === 'unidade'
                            ? direcaoOrdemCadastros === 'asc'
                              ? ' (crescente)'
                              : ' (decrescente)'
                            : ''
                        }`}
                        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 -mx-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0066FF] ${
                          ordemCadastros === 'unidade'
                            ? 'text-[#0066FF]'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Unidade
                        {ordemCadastros === 'unidade' &&
                          (direcaoOrdemCadastros === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          ))}
                      </button>
                    </span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('unidade', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('unidade', e)}
                      onDoubleClick={() => salvarLarguraColuna('unidade', LARGURAS_PADRAO.unidade)}
                    >
                      <span className="w-0.5 h-3.5 bg-slate-300 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>

                  {/* Coluna 2: Nome Completo */}
                  <th className="py-3 px-4 relative group">
                    <span className="truncate block">
                      <button
                        type="button"
                        onClick={() => alternarOrdemPorColuna('nome')}
                        aria-label={`Ordenar por Nome${
                          ordemCadastros === 'nome'
                            ? direcaoOrdemCadastros === 'asc'
                              ? ' (crescente)'
                              : ' (decrescente)'
                            : ''
                        }`}
                        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 -mx-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0066FF] ${
                          ordemCadastros === 'nome'
                            ? 'text-[#0066FF]'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Nome Completo
                        {ordemCadastros === 'nome' &&
                          (direcaoOrdemCadastros === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          ))}
                      </button>
                    </span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('nome', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('nome', e)}
                      onDoubleClick={() => salvarLarguraColuna('nome', LARGURAS_PADRAO.nome)}
                    >
                      <span className="w-0.5 h-3.5 bg-slate-300 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>

                  {/* Coluna 3: CPF */}
                  <th className="py-3 px-4 relative group">
                    <span className="truncate block">CPF</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('cpf', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('cpf', e)}
                      onDoubleClick={() => salvarLarguraColuna('cpf', LARGURAS_PADRAO.cpf)}
                    >
                      <span className="w-0.5 h-3.5 bg-slate-300 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>

                  {/* Coluna 4: Data de Nascimento / Idade */}
                  <th className="py-3 px-4 relative group">
                    <span className="truncate block">
                      <button
                        type="button"
                        onClick={() => alternarOrdemPorColuna('nascimento')}
                        aria-label={`Ordenar por Nascimento${
                          ordemCadastros === 'nascimento'
                            ? direcaoOrdemCadastros === 'asc'
                              ? ' (crescente)'
                              : ' (decrescente)'
                            : ''
                        }`}
                        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 -mx-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0066FF] ${
                          ordemCadastros === 'nascimento'
                            ? 'text-[#0066FF]'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Nascimento
                        {ordemCadastros === 'nascimento' &&
                          (direcaoOrdemCadastros === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          ))}
                      </button>
                    </span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('dataNasc', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('dataNasc', e)}
                      onDoubleClick={() =>
                        salvarLarguraColuna('dataNasc', LARGURAS_PADRAO.dataNasc)
                      }
                    >
                      <span className="w-0.5 h-3.5 bg-slate-300 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>

                  {/* Coluna 5: VÍNCULO (exatamente VÍNCULO) */}
                  <th className="py-3 px-4 relative group">
                    <span className="truncate block">VÍNCULO</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('vinculo', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('vinculo', e)}
                      onDoubleClick={() => salvarLarguraColuna('vinculo', LARGURAS_PADRAO.vinculo)}
                    >
                      <span className="w-0.5 h-3.5 bg-slate-300 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>

                  {/* Coluna 6: Contatos */}
                  <th className="py-3 px-4 relative group">
                    <span className="truncate block">Contatos</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('contatos', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('contatos', e)}
                      onDoubleClick={() =>
                        salvarLarguraColuna('contatos', LARGURAS_PADRAO.contatos)
                      }
                    >
                      <span className="w-0.5 h-3.5 bg-slate-300 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>

                  {/* Coluna 7: Status */}
                  <th className="py-3 px-4 text-center relative group">
                    <span className="truncate block">Status</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('status', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('status', e)}
                      onDoubleClick={() => salvarLarguraColuna('status', LARGURAS_PADRAO.status)}
                    >
                      <span className="w-0.5 h-3.5 bg-slate-300 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>

                  {/* Coluna 8: Ações */}
                  <th className="py-3 px-4 text-right relative group">
                    <span className="truncate block">Ações</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      title="Arrastar para redimensionar (duplo clique para restaurar)"
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#1F6B94]/40 active:bg-[#1F6B94] z-10 flex items-center justify-center touch-none"
                      onMouseDown={(e) => iniciarRedimensionamento('acoes', e)}
                      onTouchStart={(e) => iniciarRedimensionamento('acoes', e)}
                      onDoubleClick={() => salvarLarguraColuna('acoes', LARGURAS_PADRAO.acoes)}
                    >
                      <span className="w-0.5 h-3.5 bg-slate-300 rounded-full group-hover:bg-[#1F6B94]" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      Carregando cadastros...
                    </td>
                  </tr>
                ) : cadastrosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      Nenhum cadastro encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  cadastrosFiltrados.map((cad) => {
                    const unid = mapaUnidadesPorId.get(cad.unidade)

                    return (
                      <tr key={cad.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {unid ? formatarUnidadeComBloco(unid, rotuloUnidade, ' (—)') : '—'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-900">
                          {cad.nome}
                          {cad.observacoes && (
                            <span className="block text-[10px] text-slate-400 truncate max-w-xs">
                              {cad.observacoes}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                          {formatarCpf(cad.cpf)}
                        </td>

                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap text-[11px]">
                          {(() => {
                            const idade = calcularIdade(cad.data_nascimento)
                            if (!idade) return <span className="text-slate-400">—</span>
                            return (
                              <div>
                                <span className="font-mono">
                                  {idade.textoFormatado.split(' ')[0]}
                                </span>
                                <span className="block text-[10px] text-slate-500 font-medium">
                                  {idade.anos} anos
                                </span>
                              </div>
                            )
                          })()}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {cad.vinculo === 'proprietario' && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                              PROPRIETÁRIO (NÃO RES.)
                            </Badge>
                          )}
                          {cad.vinculo === 'condomino' && (
                            <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 text-[10px]">
                              CONDÔMINO (RESIDENTE)
                            </Badge>
                          )}
                          {cad.vinculo === 'locatario' && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px]">
                              LOCATÁRIO (INQUILINO)
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          <div className="space-y-0.5">
                            {cad.email && (
                              <div className="flex items-center gap-1 text-[11px] truncate max-w-[190px]">
                                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{cad.email}</span>
                              </div>
                            )}
                            {cad.telefone && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="font-mono">{cad.telefone}</span>
                              </div>
                            )}
                            {!cad.email && !cad.telefone && (
                              <span className="text-slate-400 text-[11px]">Sem contato</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => alternarAtivo(cad)}
                            className="inline-flex items-center gap-1 cursor-pointer"
                            title={cad.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                          >
                            {cad.ativo ? (
                              <Badge className="bg-emerald-600 text-white text-[10px]">ATIVO</Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-[10px]">
                                INATIVO
                              </Badge>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => abrirModalLinkUnidade(cad.unidade)}
                              className="h-7 w-7 text-[#0066FF] hover:bg-[#0066FF]/10"
                              title="Enviar/Copiar link de cadastro da unidade"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => abrirEditarCadastro(cad)}
                              className="h-7 w-7 text-slate-500 hover:text-cyan-700"
                              title="Editar cadastro"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => abrirModalExcluirCadastro(cad)}
                              className="h-7 w-7 text-slate-400 hover:text-red-600"
                              title="Excluir cadastro (exige login e senha)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL LINK DE CADASTRO DA UNIDADE (WhatsApp, E-mail e Copiar) */}
      <Dialog open={modalLinkAberto} onOpenChange={setModalLinkAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#002B5E] flex items-center gap-2">
              <Share2 className="h-5 w-5 text-[#0066FF]" />
              Link Oficial de Cadastro da Unidade (Até 2 Vínculos)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Gere ou compartilhe o link exclusivo de autoatendimento. O mesmo link permite
              cadastrar o <strong>Morador</strong> (Condômino ou Inquilino) e também o{' '}
              <strong>Proprietário</strong> (condômino não morador).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Seletor de Unidade (Apartamento / Bloco) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-[#0066FF]" />
                Apartamento / Unidade de Destino *
              </Label>
              <Select
                value={unidadeSelecionadaLink?.id || ''}
                onValueChange={(val) => {
                  if (val) selecionarUnidadeNoModalLink(val)
                }}
              >
                <SelectTrigger className="text-xs h-9 bg-white border-slate-300">
                  <SelectValue placeholder="Selecione a unidade..." />
                </SelectTrigger>
                <SelectContent className="text-xs max-h-56">
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {formatarIdentificadorUnidade(u.identificador, u.tipo_unidade, rotuloUnidade)}{' '}
                      —{' '}
                      {temBlocoReal(u.bloco, u.tipo_unidade)
                        ? `Bloco ${normalizarBloco(u.bloco, u.tipo_unidade)}`
                        : 'Torre Única (—)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {unidadeSelecionadaLink && (
                <p className="text-[11px] text-slate-500">
                  Unidade selecionada:{' '}
                  <strong className="text-[#002B5E]">
                    {formatarIdentificadorUnidade(
                      unidadeSelecionadaLink.identificador,
                      unidadeSelecionadaLink.tipo_unidade,
                      rotuloUnidade,
                    )}
                  </strong>{' '}
                  • Bloco:{' '}
                  <strong>
                    {temBlocoReal(unidadeSelecionadaLink.bloco, unidadeSelecionadaLink.tipo_unidade)
                      ? normalizarBloco(
                          unidadeSelecionadaLink.bloco,
                          unidadeSelecionadaLink.tipo_unidade,
                        )
                      : '—'}
                  </strong>
                </p>
              )}
            </div>

            {carregandoLink ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <div className="h-5 w-5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Gerando e sincronizando link seguro da unidade...</p>
              </div>
            ) : (
              <>
                {/* Campo com o link para visualização e cópia */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Endereço Web Exclusivo
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      readOnly
                      value={linkGerado}
                      className="text-xs h-9 font-mono bg-slate-50 border-slate-200"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={copiarLinkCadastro}
                      className="bg-[#002B5E] hover:bg-[#001D40] text-white shrink-0 h-9 px-3"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    O morador acessará a página pública segura associada diretamente a esta unidade.
                  </p>
                </div>

                {/* Box explicativo de suporte a 2 cadastros (morador + proprietário) */}
                <div className="p-2.5 rounded-lg bg-[#0066FF]/5 border border-[#0066FF]/20 text-[11px] text-[#002B5E] space-y-1">
                  <span className="font-semibold block flex items-center gap-1.5 text-[#002B5E]">
                    <Users className="h-3.5 w-3.5 text-[#0066FF]" />
                    Regra da Unidade: Suporte a Morador e Proprietário
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    • Se mora o <strong>Condômino</strong> (proprietário residente), ele preenche
                    sozinho o cadastro.
                    <br />• Se a unidade está alugada para um <strong>Inquilino</strong>, este mesmo
                    link deve ser utilizado por ambos: pelo inquilino (morador) e pelo proprietário
                    (não morador), totalizando até 2 cadastros homologados por unidade.
                  </p>
                </div>

                {/* Opção 1: Envio por WhatsApp (wa.me) com campo editável de destinatário */}
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-900 block flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4 text-emerald-700" />
                      Enviar pelo WhatsApp
                    </span>
                    {unidadeSelecionadaLink?.contato_celular && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-100/70 text-emerald-800 border-emerald-300 font-semibold"
                      >
                        Contato cadastrado
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Informe o WhatsApp do destinatário. O sistema abre diretamente a conversa com a
                    mensagem pronta de cadastro.
                  </p>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="whatsapp_destinatario_link"
                      className="text-xs font-semibold text-emerald-950"
                    >
                      Número do WhatsApp do destinatário *
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <MessageSquare className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600" />
                        <Input
                          id="whatsapp_destinatario_link"
                          type="tel"
                          placeholder="(XX) XXXXX-XXXX"
                          maxLength={15}
                          value={whatsappEnvioLink}
                          onChange={handleWhatsappEnvioLinkChange}
                          onPaste={handleWhatsappEnvioLinkPaste}
                          className="text-xs h-9 pl-9 bg-white border-emerald-200 font-mono tracking-wide"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          salvandoCelularUnidade ||
                          !converterParaWhatsappInternacional(whatsappEnvioLink).valido
                        }
                        onClick={enviarLinkWhatsApp}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shrink-0 h-9 px-3.5 shadow-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Abrir WhatsApp
                      </Button>
                    </div>

                    {/* Aviso de validação de dígitos */}
                    {avisoValidacaoWhatsappLink && (
                      <div className="flex items-center gap-1.5 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>{avisoValidacaoWhatsappLink}</span>
                      </div>
                    )}

                    {/* Opção para atualizar o contato_celular da unidade para os próximos envios */}
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <label
                        htmlFor="salvar_celular_unidade"
                        className="text-[11px] text-emerald-900 cursor-pointer select-none flex items-center gap-1.5"
                      >
                        <input
                          id="salvar_celular_unidade"
                          type="checkbox"
                          checked={salvarCelularNaUnidade}
                          onChange={(e) => setSalvarCelularNaUnidade(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Salvar este número como contato oficial da unidade</span>
                      </label>
                      {converterParaWhatsappInternacional(whatsappEnvioLink).valido && (
                        <span className="text-[10px] text-emerald-700 font-mono">
                          +
                          {
                            converterParaWhatsappInternacional(whatsappEnvioLink)
                              .numeroInternacional
                          }
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Opção 2: Envio por E-mail institucional */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-xs text-[#002B5E] block flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-[#0066FF]" />
                    Enviar por E-mail Institucional
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="email"
                      placeholder="email.do.morador@exemplo.com"
                      value={emailEnvioLink}
                      onChange={(e) => setEmailEnvioLink(e.target.value)}
                      className="text-xs h-9 bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={enviandoEmailLink || !emailEnvioLink.trim()}
                      onClick={enviarLinkPorEmail}
                      className="bg-[#0066FF] hover:bg-[#0052CC] text-white shrink-0 h-9 font-semibold"
                    >
                      {enviandoEmailLink ? 'Enviando...' : 'Enviar E-mail'}
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Dispara o e-mail formal de convite através da infraestrutura transacional do
                    Koinon.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalLinkAberto(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CRIAR / EDITAR */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              {itemEditando ? 'Editar Vínculo da Unidade' : 'Novo Vínculo Cadastral'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Associe uma pessoa a uma unidade respeitando as regras condominiais do Lago Azul.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarCadastro} className="space-y-3 py-2 text-xs">
            {/* Unidade */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Unidade *</Label>
              <Select value={formUnidadeId} onValueChange={setFormUnidadeId}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Selecione a unidade..." />
                </SelectTrigger>
                <SelectContent className="text-xs max-h-56">
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {formatarUnidadeComBloco(u, rotuloUnidade)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nome Completo */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                required
                placeholder="Ex: Maria Aparecida da Silva"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            {/* Grid CPF, Data de Nascimento e Vínculo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">CPF *</Label>
                <Input
                  required
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={formCpf}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  className={`text-xs h-9 font-mono ${formCpfErro ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {formCpfErro && <p className="text-[10px] text-red-600">{formCpfErro}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data de Nascimento</Label>
                <Input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={formDataNascimento}
                  onChange={(e) => {
                    setFormDataNascimento(e.target.value)
                    setFormDataNascErro(null)
                  }}
                  className={`text-xs h-9 ${formDataNascErro ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {formDataNascErro && <p className="text-[10px] text-red-600">{formDataNascErro}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Vínculo *</Label>
                <Select
                  value={formVinculo}
                  onValueChange={(val) => setFormVinculo(val as VinculoCadastro)}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="proprietario">PROPRIETÁRIO (Não Mora)</SelectItem>
                    <SelectItem value="condomino">CONDÔMINO (Mora)</SelectItem>
                    <SelectItem value="locatario">LOCATÁRIO (Inquilino)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid Contatos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">E-mail (para convocações)</Label>
                <Input
                  type="email"
                  placeholder="exemplo@email.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                <Input
                  type="tel"
                  placeholder="(XX) XXXXX-XXXX"
                  maxLength={15}
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(formatarTelefone(e.target.value))}
                  onPaste={(e) => {
                    e.preventDefault()
                    const texto = e.clipboardData.getData('text') || ''
                    setFormTelefone(formatarTelefone(limparTelefone(texto)))
                  }}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Observações internas</Label>
              <Input
                placeholder="Ex: Contrato de locação até Dez/2025"
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            {/* Switch Ativo */}
            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
              <div>
                <span className="font-semibold text-xs text-slate-800 block">Vínculo Ativo</span>
                <span className="text-[10px] text-slate-500">
                  Apenas cadastros ativos podem votar e receber convocações oficiais.
                </span>
              </div>
              <Switch checked={formAtivo} onCheckedChange={setFormAtivo} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {salvando ? 'Gravando...' : 'Salvar Cadastro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL IMPORTAÇÃO EM MASSA EXCEL */}
      <Dialog open={modalImportarAberto} onOpenChange={setModalImportarAberto}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Importação em Massa via Planilha Excel (.xlsx)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Faça o upload da planilha com as colunas:{' '}
              <strong>Unidade, Bloco, Nome Completo, CPF, Vínculo, E-mail, Telefone</strong>. A
              validação é feita linha a linha antes de qualquer gravação no banco.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs flex-1 overflow-y-auto">
            {/* Área de Seleção de Arquivo */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <Upload className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
              <label
                htmlFor="planilhaExcel"
                className="font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer underline text-xs"
              >
                Clique para selecionar o arquivo .xlsx
              </label>
              <p className="text-[11px] text-slate-400 mt-1">
                Formatos aceitos: Microsoft Excel (.xlsx). A importação NÃO cria contas de login no
                sistema.
              </p>
              <input
                ref={fileInputRef}
                id="planilhaExcel"
                type="file"
                accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleArquivoSelecionado}
                className="hidden"
              />
            </div>

            {processandoArquivo && (
              <div className="text-center py-4 text-xs text-slate-500">
                Processando e validando planilha...
              </div>
            )}

            {/* Resumo da Validação Prévia */}
            {resumoImportacao && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded bg-slate-100 border text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Linhas Lidas
                    </span>
                    <strong className="text-sm text-slate-900">{resumoImportacao.total}</strong>
                  </div>
                  <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold block">
                      Prontos p/ Importar
                    </span>
                    <strong className="text-sm text-emerald-800">{resumoImportacao.validos}</strong>
                  </div>
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-center">
                    <span className="text-[10px] text-red-700 uppercase font-semibold block">
                      Rejeitados / Falhas
                    </span>
                    <strong className="text-sm text-red-800">{resumoImportacao.invalidos}</strong>
                  </div>
                </div>

                {/* Lista de Registros Analisados */}
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 border-b text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Linha</th>
                        <th className="py-2 px-3">Unid</th>
                        <th className="py-2 px-3">Nome</th>
                        <th className="py-2 px-3">CPF</th>
                        <th className="py-2 px-3">Vínculo</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linhasImportadas.map((l) => (
                        <tr
                          key={l.linha}
                          className={l.status === 'valido' ? 'bg-emerald-50/30' : 'bg-red-50/40'}
                        >
                          <td className="py-1.5 px-3 font-mono">{l.linha}</td>
                          <td className="py-1.5 px-3 font-semibold">{l.identificador}</td>
                          <td className="py-1.5 px-3 truncate max-w-[120px]">{l.nome}</td>
                          <td className="py-1.5 px-3 font-mono">{formatarCpf(l.cpf)}</td>
                          <td className="py-1.5 px-3 uppercase text-[10px]">{l.vinculo}</td>
                          <td className="py-1.5 px-3">
                            {l.status === 'valido' ? (
                              <span className="inline-flex items-center text-emerald-700 font-semibold text-[10px] gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Válido
                              </span>
                            ) : (
                              <div className="text-red-700 font-semibold text-[10px]">
                                <span className="inline-flex items-center gap-1">
                                  <XCircle className="h-3 w-3" /> Rejeitado
                                </span>
                                <span className="block text-[9px] text-red-600 font-normal">
                                  {l.motivosInvalido.join(' ')}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {resumoImportacao
                ? `${resumoImportacao.validos} registros serão gravados.`
                : 'Selecione a planilha para validar.'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalImportarAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={
                  !resumoImportacao || resumoImportacao.validos === 0 || confirmandoImportacao
                }
                onClick={handleConfirmarImportacao}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {confirmandoImportacao
                  ? 'Importando...'
                  : `Confirmar e Importar (${resumoImportacao?.validos || 0})`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EXCLUSÃO COM REAUTENTICAÇÃO (LOGIN E SENHA) */}
      <Dialog open={modalExclusaoAberto} onOpenChange={setModalExclusaoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-900 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
              Confirmar Exclusão de Cadastro
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Esta ação removerá permanentemente o cadastro de morador ou proprietário vinculado à
              unidade e liberará a vaga na matriz de bloqueios.
            </DialogDescription>
          </DialogHeader>

          {cadastroParaExcluir && (
            <div className="space-y-4 py-2 text-xs">
              {/* Card de Identificação da Pessoa e Unidade */}
              <div className="p-3 rounded-lg bg-red-50/70 border border-red-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs">
                    {cadastroParaExcluir.nome}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-red-200 text-red-700">
                    {cadastroParaExcluir.vinculo === 'proprietario'
                      ? 'Proprietário'
                      : cadastroParaExcluir.vinculo === 'condomino'
                        ? 'Condômino'
                        : 'Inquilino'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                  <p>
                    <strong className="text-slate-700 font-sans">CPF:</strong>{' '}
                    {formatarCpf(cadastroParaExcluir.cpf || '')}
                  </p>
                  <p>
                    <strong className="text-slate-700 font-sans">Unidade:</strong>{' '}
                    {mapaUnidadesPorId.get(cadastroParaExcluir.unidade)
                      ? formatarUnidadeComBloco(
                          mapaUnidadesPorId.get(cadastroParaExcluir.unidade)!,
                          rotuloUnidade,
                        )
                      : cadastroParaExcluir.unidade}
                  </p>
                </div>
                <p className="text-[10px] text-red-700 pt-1 border-t border-red-200/60 font-sans">
                  • Os dados da pessoa serão salvos no <strong>Histórico de Alterações</strong> para
                  fins de auditoria e conformidade legal.
                  <br />• A vaga desta unidade na matriz de bloqueios será liberada imediatamente.
                </p>
              </div>

              {/* Formulário de Reautenticação */}
              <form onSubmit={handleConfirmarExclusaoComReautenticacao} className="space-y-3">
                <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900">
                  <strong className="block mb-0.5">Reautenticação de Segurança Obrigatória</strong>
                  Por exigência de auditoria, confirme seu login e senha de administrador para
                  validar a exclusão contra o servidor.
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    E-mail do Administrador *
                  </Label>
                  <Input
                    type="email"
                    required
                    value={authEmailExclusao}
                    onChange={(e) => setAuthEmailExclusao(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="text-xs h-9 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Senha do Administrador *
                  </Label>
                  <div className="relative">
                    <Input
                      type={mostrarSenhaExclusao ? 'text' : 'password'}
                      required
                      value={authSenhaExclusao}
                      onChange={(e) => setAuthSenhaExclusao(e.target.value)}
                      placeholder="Digite sua senha de acesso"
                      className="pr-10 text-xs h-9 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenhaExclusao(!mostrarSenhaExclusao)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                      title={mostrarSenhaExclusao ? 'Ocultar senha' : 'Ver senha'}
                      tabIndex={-1}
                    >
                      {mostrarSenhaExclusao ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {erroExclusao && (
                  <div className="p-2.5 rounded bg-red-100 border border-red-300 text-red-800 text-xs font-medium">
                    {erroExclusao}
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={excluindoCadastro}
                    onClick={() => {
                      setModalExclusaoAberto(false)
                      setCadastroParaExcluir(null)
                      setAuthSenhaExclusao('')
                      setErroExclusao(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={excluindoCadastro}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    {excluindoCadastro ? 'Autenticando e Excluindo...' : 'Excluir Definitivamente'}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CadastrosUnidadesPage

import React, { useState, useEffect } from 'react'
import { api, type UnidadeRecord, type TipoCondominio, type GrupoCondoConfig } from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { useAuth } from '@/context/AuthContext'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
import { toast } from '@/hooks/use-toast'
import {
  Building2,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Home,
  Save,
  Image as ImageIcon,
  Play,
  Trash2,
  Music,
  Plus,
  Eye,
  ShieldCheck,
  Check,
  PlusCircle,
  Hash,
  Scale,
  Sparkles,
} from 'lucide-react'
import { urnaAudio } from '@/lib/urnaAudio'

const ROTULOS_SUGERIDOS = [
  'Apartamento',
  'Casa',
  'Bangalô',
  'Lote',
  'Sala',
  'Box',
  'Cobertura',
  'Loja',
  'Sobrado',
  'Gleba',
]

export const ConfiguracoesPage: React.FC = () => {
  const { config, recarregarConfig, logoUrl, somVotoUrl } = useCondoConfig()
  const { user } = useAuth()

  // Estados do formulário de dados gerais
  const [nomeCondominio, setNomeCondominio] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [somVotoFile, setSomVotoFile] = useState<File | null>(null)
  const [somVotoPreviewUrl, setSomVotoPreviewUrl] = useState<string | null>(null)
  const [removerSomVoto, setRemoverSomVoto] = useState(false)
  const [salvandoGeral, setSalvandoGeral] = useState(false)

  // Estados da estrutura de unidades
  const [tipoCondominio, setTipoCondominio] = useState<TipoCondominio>('vertical')
  const [rotuloUnidade, setRotuloUnidade] = useState('Apartamento')
  const [rotuloLivre, setRotuloLivre] = useState('')
  const [grupos, setGrupos] = useState<GrupoCondoConfig[]>([])
  const [totalAtualUnidades, setTotalAtualUnidades] = useState<number>(52)
  const [unidadesCadastradas, setUnidadesCadastradas] = useState<UnidadeRecord[]>([])

  // Prévia e Geração Segura
  const [gerandoPreview, setGerandoPreview] = useState(false)
  const [previewDados, setPreviewDados] = useState<{
    totalProjetado: number
    totalExistentesNoBanco: number
    totalAtivasAtuais?: number
    novasASeremCriadas: number
    preservadas: number
    preservadasForaDaMalha?: number
    desativadasProjetadas?: number
    totalFinalAtivas?: number
    amostra: Array<{
      identificador: string
      bloco?: string
      grupo?: string
      andar?: string
      peso_voto?: number
      tipo_unidade?: string
      status: 'existente' | 'nova'
    }>
  } | null>(null)
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false)
  const [regenerando, setRegenerando] = useState(false)

  // Modal de Unidade Avulsa
  const [modalAvulsaAberto, setModalAvulsaAberto] = useState(false)
  const [salvandoAvulsa, setSalvandoAvulsa] = useState(false)
  const [avulsaIdentificador, setAvulsaIdentificador] = useState('')
  const [avulsaBloco, setAvulsaBloco] = useState('Avulso')
  const [avulsaTipo, setAvulsaTipo] = useState('Cobertura')
  const [avulsaPeso, setAvulsaPeso] = useState('1')
  const [avulsaAndar, setAvulsaAndar] = useState('')
  const [avulsaNome, setAvulsaNome] = useState('')

  // Sincroniza estados iniciais a partir da config salva
  useEffect(() => {
    if (config) {
      setNomeCondominio(config.nome_condominio || 'Condomínio Residencial Lago Azul')
      const tipo = (config.tipo_condominio as TipoCondominio) || 'vertical'
      setTipoCondominio(tipo)

      const rot = config.rotulo_unidade || 'Apartamento'
      if (ROTULOS_SUGERIDOS.includes(rot)) {
        setRotuloUnidade(rot)
        setRotuloLivre('')
      } else {
        setRotuloUnidade('outro')
        setRotuloLivre(rot)
      }

      // Parser de grupos
      if (config.grupos_config) {
        try {
          const parsed =
            typeof config.grupos_config === 'string'
              ? JSON.parse(config.grupos_config)
              : config.grupos_config
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGrupos(parsed)
            return
          }
        } catch {
          /* intentionally ignored */
        }
      }

      // Se não havia grupos configurados, cria grupo padrão inicial compatível com o existente
      const qtdBlocos = config.quantidade_blocos || 2
      const unidadesPorBloco = config.unidades_por_bloco || 26
      const prefixoBloco =
        config.prefixo_bloco && config.prefixo_bloco !== '.' ? config.prefixo_bloco : 'Torre'

      if (tipo === 'horizontal') {
        setGrupos([
          {
            id: 'g-1',
            nome: 'Setor Residencial',
            tipo: 'horizontal',
            rotulo: 'Casa',
            peso_voto: 1,
            quantidade_unidades: 30,
            prefixo_rua: 'Rua das Flores',
            numero_inicial: 1,
            modelo_numeracao: 'sequencial',
            digitos_unid: 2,
          },
        ])
      } else {
        // Vertical ou Misto
        setGrupos([
          {
            id: 'g-1',
            nome: 'Torres Principais',
            tipo: 'vertical',
            rotulo: 'Apartamento',
            peso_voto: 1,
            quantidade_blocos: qtdBlocos,
            prefixo_bloco: prefixoBloco,
            andares_por_bloco: Math.max(1, Math.ceil(unidadesPorBloco / 6)),
            unidades_por_andar: 6,
            andar_inicial: '1',
            modelo_numeracao: 'andar_posicao',
            digitos_unid: 2,
          },
        ])
      }
    }
  }, [config])

  const carregarUnidades = async () => {
    try {
      const u = await api.getUnidades()
      // Exibir no painel as unidades ativas
      const ativas = u.filter((item) => item.ativo !== false)
      setUnidadesCadastradas(ativas)
      setTotalAtualUnidades(ativas.length)
    } catch (err) {
      console.error('Erro ao carregar unidades:', err)
    }
  }

  useEffect(() => {
    carregarUnidades()
  }, [])

  const rotuloEfetivo = rotuloUnidade === 'outro' ? rotuloLivre.trim() || 'Unidade' : rotuloUnidade

  // Manipulação de Grupos
  const handleAdicionarGrupo = (tipo: 'vertical' | 'horizontal') => {
    const novoIndex = grupos.length + 1
    if (tipo === 'vertical') {
      const novo: GrupoCondoConfig = {
        id: 'g-' + Date.now(),
        nome: `Torre ${novoIndex}`,
        tipo: 'vertical',
        rotulo: rotuloEfetivo,
        peso_voto: 1,
        quantidade_blocos: 1,
        prefixo_bloco: 'Torre',
        andares_por_bloco: 5,
        unidades_por_andar: 4,
        andar_inicial: '1',
        modelo_numeracao: 'andar_posicao',
        digitos_unid: 2,
      }
      setGrupos([...grupos, novo])
    } else {
      const novo: GrupoCondoConfig = {
        id: 'g-' + Date.now(),
        nome: `Quadra ${novoIndex}`,
        tipo: 'horizontal',
        rotulo: tipoCondominio === 'horizontal' ? 'Casa' : 'Lote',
        peso_voto: 1,
        quantidade_unidades: 20,
        prefixo_rua: `Rua ${novoIndex}`,
        numero_inicial: 1,
        modelo_numeracao: 'sequencial',
        digitos_unid: 2,
      }
      setGrupos([...grupos, novo])
    }
    setPreviewDados(null)
  }

  const handleRemoverGrupo = (index: number) => {
    if (grupos.length <= 1) {
      toast({
        title: 'Grupo obrigatório',
        description: 'É necessário ter pelo menos um grupo configurado.',
        variant: 'destructive',
      })
      return
    }
    const filtrados = grupos.filter((_, i) => i !== index)
    setGrupos(filtrados)
    setPreviewDados(null)
  }

  const handleAtualizarGrupo = (index: number, campo: keyof GrupoCondoConfig, valor: any) => {
    const atualizados = [...grupos]
    atualizados[index] = {
      ...atualizados[index],
      [campo]: valor,
    }
    setGrupos(atualizados)
    setPreviewDados(null)
  }

  // Obter Prévia
  const handleGerarPreview = async () => {
    if (grupos.length === 0) {
      toast({
        title: 'Nenhum grupo',
        description: 'Adicione pelo menos um grupo para gerar a prévia.',
        variant: 'destructive',
      })
      return
    }

    setGerandoPreview(true)
    try {
      const dados = await api.previewUnidades({
        tipo_condominio: tipoCondominio,
        rotulo_unidade: rotuloEfetivo,
        grupos: grupos,
      })
      setPreviewDados(dados)
      toast({
        title: 'Prévia gerada com segurança',
        description: `Projeção: ${dados.totalProjetado} unidades da malha • Total final ativo no banco: ${dados.totalFinalAtivas ?? dados.totalProjetado} unidades.`,
      })
    } catch (err: any) {
      console.error('Erro ao gerar prévia:', err)
      toast({
        title: 'Erro ao gerar prévia',
        description: err?.message || 'Não foi possível calcular a malha.',
        variant: 'destructive',
      })
    } finally {
      setGerandoPreview(false)
    }
  }

  // Executar regeneração com confirmação explícita
  const handleConfirmarRegeneracao = async () => {
    setRegenerando(true)
    try {
      const resp = await api.regenerarUnidades({
        tipo_condominio: tipoCondominio,
        rotulo_unidade: rotuloEfetivo,
        grupos: grupos,
      })

      await recarregarConfig()
      await carregarUnidades()
      setModalConfirmacaoAberto(false)
      setPreviewDados(null)

      toast({
        title: 'Malha de Unidades Sincronizada',
        description: resp.message,
      })
    } catch (err: any) {
      console.error('Erro ao sincronizar unidades:', err)
      toast({
        title: 'Falha na sincronização',
        description: err?.message || 'Não foi possível atualizar a malha.',
        variant: 'destructive',
      })
    } finally {
      setRegenerando(false)
    }
  }

  // Cadastrar unidade avulsa
  const handleSalvarAvulsa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!avulsaIdentificador.trim()) {
      toast({
        title: 'Identificador obrigatório',
        description: 'Informe o número ou código da unidade.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoAvulsa(true)
    try {
      const resp = await api.cadastrarUnidadeAvulsa({
        identificador: avulsaIdentificador.trim(),
        bloco: avulsaBloco.trim() || 'Avulso',
        tipo_unidade: avulsaTipo.trim() || 'Unidade Especial',
        peso_voto: Number(avulsaPeso) > 0 ? Number(avulsaPeso) : 1,
        andar: avulsaAndar.trim(),
        responsavel_nome: avulsaNome.trim() || `Condômino ${avulsaIdentificador.trim()}`,
      })

      toast({
        title: 'Unidade Avulsa Cadastrada',
        description: resp.message,
      })

      setAvulsaIdentificador('')
      setAvulsaAndar('')
      setAvulsaNome('')
      setModalAvulsaAberto(false)
      await carregarUnidades()
      await recarregarConfig()
    } catch (err: any) {
      console.error('Erro ao cadastrar unidade avulsa:', err)
      toast({
        title: 'Erro ao cadastrar',
        description: err?.message || 'Não foi possível cadastrar a unidade avulsa.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoAvulsa(false)
    }
  }

  // Salvar Identidade Institucional
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSomVotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSomVotoFile(file)
      setRemoverSomVoto(false)
      const localUrl = URL.createObjectURL(file)
      setSomVotoPreviewUrl(localUrl)
    }
  }

  const handleTestarSomAtualOuNovo = () => {
    if (somVotoPreviewUrl) {
      urnaAudio.tocarAudioCustomizadoOuSintetizado(somVotoPreviewUrl)
    } else if (somVotoUrl && !removerSomVoto) {
      urnaAudio.tocarAudioCustomizadoOuSintetizado(somVotoUrl)
    } else {
      urnaAudio.tocarSomConfirmacaoTSE()
    }
  }

  const handleRemoverSom = () => {
    setSomVotoFile(null)
    setSomVotoPreviewUrl(null)
    setRemoverSomVoto(true)
  }

  const handleSalvarDadosGerais = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    setSalvandoGeral(true)
    try {
      const temUploadArquivo = logoFile || somVotoFile || removerSomVoto

      if (temUploadArquivo) {
        const formData = new FormData()
        formData.append('nome_condominio', nomeCondominio.trim())
        formData.append('rotulo_unidade', rotuloEfetivo)
        formData.append('tipo_condominio', tipoCondominio)
        if (logoFile) {
          formData.append('logo', logoFile)
        }
        if (somVotoFile) {
          formData.append('som_voto', somVotoFile)
        } else if (removerSomVoto) {
          formData.append('som_voto', '')
        }
        await api.updateConfiguracao(config.id, formData)
      } else {
        await api.updateConfiguracao(config.id, {
          nome_condominio: nomeCondominio.trim(),
          rotulo_unidade: rotuloEfetivo,
          tipo_condominio: tipoCondominio,
        })
      }

      await api.registrarEventoAuditoria({
        evento: 'configuracao_atualizada',
        fator: `Admin ${user?.name || user?.email} atualizou configurações gerais (Nome: "${nomeCondominio.trim()}", Rótulo: "${rotuloEfetivo}", Tipo: "${tipoCondominio}")`,
      })

      await recarregarConfig()
      toast({
        title: 'Configurações Salvas',
        description:
          'Identidade visual, tipo de condomínio e rótulo padrão atualizados com sucesso.',
      })
    } catch (err: any) {
      console.error('Erro ao salvar configurações gerais:', err)
      toast({
        title: 'Falha ao salvar',
        description: err?.message || 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoGeral(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-purple-700" /> Configurações do Condomínio
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Identidade institucional, parametrização avançada da malha de unidades (vertical,
          horizontal ou misto) e dimensionamento para a assembleia.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* CARD 1: IDENTIDADE DO CONDOMÍNIO (NOME & LOGO) */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Identidade Institucional
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              O nome e a logomarca definidos aqui são refletidos em toda a aplicação (tela de login,
              sidebar, comprovantes e relatórios).
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSalvarDadosGerais}>
            <CardContent className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="nome" className="text-xs font-semibold text-slate-700">
                  Nome Oficial do Condomínio
                </Label>
                <Input
                  id="nome"
                  required
                  value={nomeCondominio}
                  onChange={(e) => setNomeCondominio(e.target.value)}
                  placeholder="Ex: Condomínio Residencial Lago Azul"
                  className="h-10 text-sm border-slate-300"
                />
              </div>

              {/* Upload de Logo com Prévia */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 block">
                  Logomarca do Condomínio
                </Label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="h-20 w-20 rounded-xl border border-slate-300 bg-white flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                    {logoPreview || logoUrl ? (
                      <img
                        src={logoPreview || logoUrl || ''}
                        alt="Logo do condomínio"
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="h-8 w-8 text-slate-300" />
                        <span className="text-[9px] mt-1 text-slate-400">Padrão Gota</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <p className="text-xs text-slate-600">
                      Envie um arquivo PNG, JPG ou SVG de até 5MB. Se nenhuma imagem for enviada, o
                      ícone padrão continuará sendo exibido.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <Label
                        htmlFor="logo-upload"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                      >
                        <Upload className="h-3.5 w-3.5 text-slate-500" /> Selecionar Arquivo
                      </Label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="sr-only"
                        onChange={handleLogoChange}
                      />
                      {logoFile && (
                        <span className="text-xs text-emerald-700 font-medium">
                          {logoFile.name} (pronto para salvar)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload de Som de Confirmação da Cabine */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 block">
                    Som de Confirmação do Voto na Cabine
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleTestarSomAtualOuNovo}
                    className="h-7 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50 px-2"
                  >
                    <Play className="h-3 w-3 mr-1" /> Testar Reprodução
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="h-16 w-16 rounded-xl border border-slate-300 bg-white flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                    <Music className="h-7 w-7 text-purple-600" />
                  </div>

                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <p className="text-xs text-slate-600">
                      Envie um arquivo de áudio (MP3, WAV ou OGG de até 10MB) para tocar quando o
                      voto for gravado. Se nenhum arquivo for enviado, o sistema tocará o bip-bip
                      clássico da urna TSE sintetizado via Web Audio API.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <Label
                        htmlFor="som-upload"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                      >
                        <Upload className="h-3.5 w-3.5 text-slate-500" />
                        {somVotoUrl && !removerSomVoto
                          ? 'Alterar Arquivo de Áudio'
                          : 'Enviar Áudio Customizado'}
                      </Label>
                      <input
                        id="som-upload"
                        type="file"
                        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/x-wav"
                        className="sr-only"
                        onChange={handleSomVotoChange}
                      />

                      {somVotoFile && (
                        <span className="text-xs text-emerald-700 font-medium">
                          {somVotoFile.name} (pronto para salvar)
                        </span>
                      )}

                      {!somVotoFile && somVotoUrl && !removerSomVoto && (
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-purple-700 font-medium">
                            Áudio personalizado ativo
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoverSom}
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Usar Bip Sintetizado TSE
                          </Button>
                        </div>
                      )}

                      {removerSomVoto && (
                        <span className="text-xs text-amber-700 font-medium">
                          Áudio será removido (voltará ao som clássico da urna TSE ao salvar)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end border-t border-slate-100 pt-3">
              <Button
                type="submit"
                disabled={salvandoGeral}
                className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {salvandoGeral ? 'Salvando...' : 'Salvar Identidade'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* CARD 2: CONFIGURAÇÃO AVANÇADA DA MALHA DE UNIDADES */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-700" /> Configuração Avançada de Unidades
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Condomínios verticais, horizontais ou mistos com rótulos customizados, frações de
                  voto e travas de segurança ativas.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalAvulsaAberto(true)}
                  className="h-8 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Nova Unidade Avulsa
                </Button>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-2.5 py-1">
                  {totalAtualUnidades} unidades ativas
                </Badge>{' '}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-1">
            {/* Aviso de integridade e segurança reforçado */}
            <Alert className="border-emerald-200 bg-emerald-50/70 text-emerald-950">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-xs font-bold">
                Trava de Segurança e Integridade Garantida
              </AlertTitle>
              <AlertDescription className="text-xs mt-0.5">
                Nenhuma unidade com votos, presença ou credenciamento existente é apagada ou
                renumerada. O identificador interno de cada unidade continua o mesmo; a regeneração
                apenas insere as unidades que faltam na malha projetada.
              </AlertDescription>
            </Alert>

            {/* PASSO 1: TIPO DO CONDOMÍNIO E RÓTULO GLOBAL */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-700 text-white text-[10px]">
                  1
                </span>
                Tipo de Condomínio e Nomenclatura Global
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tipo de Condomínio */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Condomínio</Label>
                  <Select
                    value={tipoCondominio}
                    onValueChange={(val: TipoCondominio) => {
                      setTipoCondominio(val)
                      setPreviewDados(null)
                    }}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border-slate-300">
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vertical">Vertical (Torres / Prédios / Blocos)</SelectItem>
                      <SelectItem value="horizontal">
                        Horizontal (Casas / Lotes / Quadras)
                      </SelectItem>
                      <SelectItem value="misto">
                        Misto (Torres de Apartamentos + Ruas de Casas)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[11px] text-slate-500">
                    Define a arquitetura e os tipos de grupos disponíveis.
                  </span>
                </div>

                {/* Rótulo da Unidade */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Rótulo Padrão da Unidade
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={rotuloUnidade}
                      onValueChange={(val) => {
                        setRotuloUnidade(val)
                        setPreviewDados(null)
                      }}
                    >
                      <SelectTrigger className="h-10 text-sm bg-white border-slate-300">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ROTULOS_SUGERIDOS.map((rot) => (
                          <SelectItem key={rot} value={rot}>
                            {rot}
                          </SelectItem>
                        ))}
                        <SelectItem value="outro">Outro (personalizado)...</SelectItem>
                      </SelectContent>
                    </Select>

                    {rotuloUnidade === 'outro' ? (
                      <Input
                        value={rotuloLivre}
                        onChange={(e) => {
                          setRotuloLivre(e.target.value)
                          setPreviewDados(null)
                        }}
                        placeholder="Ex: Bangalô, Chalé"
                        className="h-10 text-sm bg-white border-slate-300"
                      />
                    ) : (
                      <div className="h-10 px-3 py-2 rounded-md bg-white border border-slate-200 text-xs text-slate-600 flex items-center">
                        Exibido: <strong>{rotuloEfetivo} 101</strong>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Utilizado em toda a interface (morador, boletim, presença, atas).
                  </span>
                </div>
              </div>
            </div>

            {/* PASSO 2: GRUPOS (TORRES, RUAS, QUADRAS) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-700 text-white text-[10px]">
                    2
                  </span>
                  Grupos de Unidades ({grupos.length})
                </span>

                <div className="flex items-center gap-2">
                  {(tipoCondominio === 'vertical' || tipoCondominio === 'misto') && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdicionarGrupo('vertical')}
                      className="h-8 text-xs bg-white border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Adicionar Grupo Vertical
                    </Button>
                  )}
                  {(tipoCondominio === 'horizontal' || tipoCondominio === 'misto') && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdicionarGrupo('horizontal')}
                      className="h-8 text-xs bg-white border-cyan-200 text-cyan-800 hover:bg-cyan-50"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Adicionar Grupo Horizontal
                    </Button>
                  )}
                </div>
              </div>

              {/* LISTA DE GRUPOS */}
              <div className="space-y-4">
                {grupos.map((grupo, gIndex) => (
                  <div
                    key={grupo.id || gIndex}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            grupo.tipo === 'vertical'
                              ? 'border-purple-300 bg-purple-50 text-purple-800 text-[10px]'
                              : 'border-cyan-300 bg-cyan-50 text-cyan-800 text-[10px]'
                          }
                        >
                          {grupo.tipo === 'vertical' ? 'Vertical' : 'Horizontal'}
                        </Badge>
                        <span className="text-xs font-bold text-slate-800">
                          {grupo.nome || `Grupo ${gIndex + 1}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoverGrupo(gIndex)}
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                        </Button>
                      </div>
                    </div>

                    {/* Linha 1: Dados do Grupo */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">
                          Nome do Grupo
                        </Label>
                        <Input
                          value={grupo.nome}
                          onChange={(e) => handleAtualizarGrupo(gIndex, 'nome', e.target.value)}
                          placeholder="Ex: Bloco A, Quadra 10"
                          className="h-9 text-xs border-slate-300"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">
                          Rótulo deste Grupo
                        </Label>
                        <Input
                          value={grupo.rotulo || rotuloEfetivo}
                          onChange={(e) => handleAtualizarGrupo(gIndex, 'rotulo', e.target.value)}
                          placeholder="Ex: Apartamento, Casa, Lote"
                          className="h-9 text-xs border-slate-300"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                          <span>Peso de Voto (Fração)</span>
                          <Scale className="h-3 w-3 text-slate-400" />
                        </Label>
                        <Input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          value={grupo.peso_voto ?? 1}
                          onChange={(e) =>
                            handleAtualizarGrupo(gIndex, 'peso_voto', Number(e.target.value))
                          }
                          className="h-9 text-xs border-slate-300"
                        />
                        <span className="text-[10px] text-slate-400">
                          Padrão 1 (voto igualitário)
                        </span>
                      </div>
                    </div>

                    {/* Linha 2: Parâmetros específicos por tipo */}
                    {grupo.tipo === 'vertical' ? (
                      <div className="space-y-3 pt-2 border-t border-slate-50">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Qtd de Blocos / Torres
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={grupo.quantidade_blocos ?? 1}
                              onChange={(e) =>
                                handleAtualizarGrupo(
                                  gIndex,
                                  'quantidade_blocos',
                                  Number(e.target.value),
                                )
                              }
                              className="h-9 text-xs border-slate-300"
                            />
                            <span className="text-[10px] text-slate-400">Ex: 2 blocos (A e B)</span>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Prefixo do Bloco
                            </Label>
                            <Input
                              value={
                                grupo.prefixo_bloco && grupo.prefixo_bloco !== '.'
                                  ? grupo.prefixo_bloco
                                  : 'Torre'
                              }
                              onChange={(e) => {
                                const val = e.target.value.trim() === '.' ? 'Torre' : e.target.value
                                handleAtualizarGrupo(gIndex, 'prefixo_bloco', val)
                              }}
                              placeholder="Bloco, Torre, Edifício"
                              className="h-9 text-xs border-slate-300"
                            />
                            <span className="text-[10px] text-slate-400">Ex: Bloco A</span>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Andares por Bloco
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              max={60}
                              value={grupo.andares_por_bloco ?? 5}
                              onChange={(e) =>
                                handleAtualizarGrupo(
                                  gIndex,
                                  'andares_por_bloco',
                                  Number(e.target.value),
                                )
                              }
                              className="h-9 text-xs border-slate-300"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Unidades por Andar
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              max={30}
                              value={grupo.unidades_por_andar ?? 4}
                              onChange={(e) =>
                                handleAtualizarGrupo(
                                  gIndex,
                                  'unidades_por_andar',
                                  Number(e.target.value),
                                )
                              }
                              className="h-9 text-xs border-slate-300"
                            />
                          </div>
                        </div>

                        {/* Configuração de Numeração Vertical */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Andar Inicial
                            </Label>
                            <Select
                              value={grupo.andar_inicial ?? '1'}
                              onValueChange={(val) =>
                                handleAtualizarGrupo(gIndex, 'andar_inicial', val)
                              }
                            >
                              <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1º Andar (101, 102...)</SelectItem>
                                <SelectItem value="0">Térreo = 0 (01, 02... ou 001)</SelectItem>
                                <SelectItem value="T">Térreo = "T" (T01, T02...)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Modelo de Numeração
                            </Label>
                            <Select
                              value={grupo.modelo_numeracao ?? 'andar_posicao'}
                              onValueChange={(val) =>
                                handleAtualizarGrupo(gIndex, 'modelo_numeracao', val)
                              }
                            >
                              <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="andar_posicao">
                                  Andar + Posição (101, 102... 201)
                                </SelectItem>
                                <SelectItem value="andar_posicao_prefixo">
                                  Bloco com hífen (A-101, A-102...)
                                </SelectItem>
                                <SelectItem value="sequencial">
                                  Sequencial simples (1, 2, 3...)
                                </SelectItem>
                                <SelectItem value="custom">
                                  Template livre ({'{bloco}'}...)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Dígitos da Unidade
                            </Label>
                            <Select
                              value={String(grupo.digitos_unid ?? 2)}
                              onValueChange={(val) =>
                                handleAtualizarGrupo(gIndex, 'digitos_unid', Number(val))
                              }
                            >
                              <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 dígito (1, 2... andar 1 ⇒ 11)</SelectItem>
                                <SelectItem value="2">
                                  2 dígitos (01, 02... andar 1 ⇒ 101)
                                </SelectItem>
                                <SelectItem value="3">
                                  3 dígitos (001, 002... andar 1 ⇒ 1001)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Template customizado se selecionado */}
                        {grupo.modelo_numeracao === 'custom' && (
                          <div className="p-2.5 rounded bg-purple-50/70 border border-purple-200 text-xs space-y-1.5">
                            <Label className="text-[11px] font-semibold text-purple-900">
                              Template Customizado:
                            </Label>
                            <Input
                              value={grupo.template_custom || '{bloco}-{andar}{unid}'}
                              onChange={(e) =>
                                handleAtualizarGrupo(gIndex, 'template_custom', e.target.value)
                              }
                              placeholder="Ex: T{bloco}A{andar}U{unid}"
                              className="h-8 text-xs border-purple-300 bg-white"
                            />
                            <p className="text-[10px] text-purple-700">
                              Variáveis disponíveis: <code>{'{bloco}'}</code> (A, B...),{' '}
                              <code>{'{andar}'}</code> (1, 2, T...), <code>{'{unid}'}</code> (01,
                              02...), <code>{'{seq}'}</code> (1, 2...)
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Parâmetros do Grupo Horizontal */
                      <div className="space-y-3 pt-2 border-t border-slate-50">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Quantidade de Unidades
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              max={500}
                              value={grupo.quantidade_unidades ?? 20}
                              onChange={(e) =>
                                handleAtualizarGrupo(
                                  gIndex,
                                  'quantidade_unidades',
                                  Number(e.target.value),
                                )
                              }
                              className="h-9 text-xs border-slate-300"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Prefixo (Rua / Quadra)
                            </Label>
                            <Input
                              value={grupo.prefixo_rua || 'Rua'}
                              onChange={(e) =>
                                handleAtualizarGrupo(gIndex, 'prefixo_rua', e.target.value)
                              }
                              placeholder="Ex: Rua A, Qd 04"
                              className="h-9 text-xs border-slate-300"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Número Inicial
                            </Label>
                            <Input
                              type="number"
                              value={grupo.numero_inicial ?? 1}
                              onChange={(e) =>
                                handleAtualizarGrupo(
                                  gIndex,
                                  'numero_inicial',
                                  Number(e.target.value),
                                )
                              }
                              className="h-9 text-xs border-slate-300"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Dígitos do Número
                            </Label>
                            <Select
                              value={String(grupo.digitos_unid ?? 2)}
                              onValueChange={(val) =>
                                handleAtualizarGrupo(gIndex, 'digitos_unid', Number(val))
                              }
                            >
                              <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 dígito (1, 2, 3...)</SelectItem>
                                <SelectItem value="2">2 dígitos (01, 02, 03...)</SelectItem>
                                <SelectItem value="3">3 dígitos (001, 002...)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* PASSO 3: BOTÃO DE PRÉVIA OBRIGATÓRIA ANTES DE GERAR */}
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-purple-700" /> Prévia Obrigatória de Sincronização
                </p>
                <p className="text-xs text-purple-800">
                  Por segurança regimental, o sistema calcula a projeção e exibe os identificadores
                  exatos antes de qualquer inserção no banco de dados.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleGerarPreview}
                disabled={gerandoPreview}
                className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs shrink-0 h-10 px-4"
              >
                <Sparkles className={`mr-1.5 h-4 w-4 ${gerandoPreview ? 'animate-spin' : ''}`} />
                {gerandoPreview ? 'Calculando Malha...' : 'Visualizar Prévia da Malha'}
              </Button>
            </div>

            {/* PAINEL COM RESULTADO DA PRÉVIA */}
            {previewDados && (
              <div className="p-4 rounded-xl border border-slate-300 bg-white shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Projeção Calculada com
                      Sucesso
                    </h3>
                    <p className="text-xs text-slate-500">
                      Malha nova: <strong>{previewDados.totalProjetado}</strong> unidades • Total
                      ativo final que ficará no banco:{' '}
                      <strong className="text-purple-700 text-sm">
                        {previewDados.totalFinalAtivas ?? previewDados.totalProjetado} unidades
                      </strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                      {previewDados.preservadas} na malha
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                      +{previewDados.novasASeremCriadas} novas
                    </Badge>
                    {(previewDados.desativadasProjetadas || 0) > 0 && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                        {previewDados.desativadasProjetadas} a desativar (sem vínculo)
                      </Badge>
                    )}
                    {(previewDados.preservadasForaDaMalha || 0) > 0 && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                        {previewDados.preservadasForaDaMalha} fora da malha com vínculo
                        (preservadas)
                      </Badge>
                    )}
                    <Badge className="bg-slate-900 text-white font-bold text-xs">
                      Total Final: {previewDados.totalFinalAtivas ?? previewDados.totalProjetado}{' '}
                      ativas
                    </Badge>
                  </div>
                </div>

                {/* Grade da amostra */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Amostra das Primeiras Unidades da Malha (Primeiras {previewDados.amostra.length}
                    )
                  </span>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {previewDados.amostra.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border text-center text-xs flex flex-col justify-between ${
                          item.status === 'existente'
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-white border-purple-200 text-purple-900'
                        }`}
                      >
                        <div className="font-mono font-bold text-sm">{item.identificador}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {item.bloco || item.grupo}
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-1">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1 py-0 ${
                              item.status === 'existente'
                                ? 'border-emerald-300 text-emerald-700 bg-white'
                                : 'border-purple-300 text-purple-700 bg-white'
                            }`}
                          >
                            {item.status === 'existente' ? 'Preservada' : 'Nova'}
                          </Badge>
                          {item.peso_voto && item.peso_voto !== 1 && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 border-amber-300 text-amber-700"
                            >
                              P:{item.peso_voto}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botão de confirmação de geração */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => setModalConfirmacaoAberto(true)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-10 px-5 shadow-xs"
                  >
                    <Check className="mr-1.5 h-4 w-4" /> Confirmar e Gerar Malha de Unidades
                  </Button>
                </div>
              </div>
            )}

            {/* Amostra das unidades atualmente cadastradas no banco */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Unidades Atualmente no Banco de Dados ({unidadesCadastradas.length})
                </span>
                <span className="text-[11px] text-slate-400">Todas protegidas contra exclusão</span>
              </div>
              <div className="max-h-44 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200 grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-1.5 text-center text-xs">
                {unidadesCadastradas.slice(0, 48).map((u) => (
                  <div
                    key={u.id}
                    className="p-1 rounded bg-slate-50 border border-slate-100 text-slate-700 font-mono text-[11px] truncate"
                    title={`${u.tipo_unidade || rotuloEfetivo} ${u.identificador} (${u.bloco || 'Lago Azul'}) - Peso: ${u.peso_voto ?? 1}`}
                  >
                    {u.identificador}
                  </div>
                ))}
                {unidadesCadastradas.length > 48 && (
                  <div className="p-1 rounded bg-purple-50 text-purple-700 font-semibold text-[11px] flex items-center justify-center col-span-2">
                    +{unidadesCadastradas.length - 48} unidades
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL DE CONFIRMAÇÃO EXPLÍCITA ANTES DE GERAR */}
      <Dialog open={modalConfirmacaoAberto} onOpenChange={setModalConfirmacaoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> Confirmação de Sincronização da
              Malha
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Revise o impacto da operação antes de confirmar a gravação definitiva:
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <p className="flex justify-between">
                <span className="text-slate-600">Tipo de Condomínio:</span>
                <strong className="text-slate-900 capitalize">{tipoCondominio}</strong>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-600">Rótulo das Unidades:</span>
                <strong className="text-slate-900">{rotuloEfetivo}</strong>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-600">Novas unidades a serem criadas:</span>
                <strong className="text-purple-700">
                  +{previewDados?.novasASeremCriadas || 0}
                </strong>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-600">Unidades existentes preservadas:</span>
                <strong className="text-emerald-700">{previewDados?.preservadas || 0}</strong>
              </p>
              {(previewDados?.desativadasProjetadas || 0) > 0 && (
                <p className="flex justify-between">
                  <span className="text-slate-600">
                    Unidades legadas a desativar (sem vínculo):
                  </span>
                  <strong className="text-amber-700">
                    -{previewDados?.desativadasProjetadas || 0}
                  </strong>
                </p>
              )}
              {(previewDados?.preservadasForaDaMalha || 0) > 0 && (
                <p className="flex justify-between">
                  <span className="text-slate-600">
                    Unidades fora da malha com vínculo (preservadas):
                  </span>
                  <strong className="text-blue-700">
                    {previewDados?.preservadasForaDaMalha || 0}
                  </strong>
                </p>
              )}
              <p className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                <span className="text-slate-800">Total final de unidades ativas no banco:</span>
                <span className="text-purple-700 text-sm">
                  {previewDados?.totalFinalAtivas ??
                    (previewDados?.preservadas || 0) + (previewDados?.novasASeremCriadas || 0)}{' '}
                  unidades
                </span>
              </p>
            </div>

            <p className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] leading-relaxed">
              <strong>Garantia de Não-Destrutividade:</strong> As unidades que já possuem
              comparecimento, credenciamento ou cédulas de votação no sistema manterão seus IDs e
              vínculos imutáveis.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={regenerando}
              onClick={() => setModalConfirmacaoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={regenerando}
              onClick={handleConfirmarRegeneracao}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
            >
              {regenerando ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sincronizando...
                </>
              ) : (
                'Confirmar e Gravar na Trilha de Auditoria'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CADASTRO DE UNIDADE AVULSA */}
      <Dialog open={modalAvulsaAberto} onOpenChange={setModalAvulsaAberto}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSalvarAvulsa}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-purple-700" /> Cadastrar Unidade Avulsa
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Adicione coberturas, salões, garagens, lojas ou unidades com numeração fora do
                padrão regular.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="av-ident" className="text-xs font-semibold text-slate-700">
                  Identificador da Unidade *
                </Label>
                <Input
                  id="av-ident"
                  required
                  value={avulsaIdentificador}
                  onChange={(e) => setAvulsaIdentificador(e.target.value)}
                  placeholder="Ex: COB-01, LOJA-A, BOX-12"
                  className="h-9 text-xs border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="av-tipo" className="text-xs font-semibold text-slate-700">
                    Tipo da Unidade
                  </Label>
                  <Input
                    id="av-tipo"
                    value={avulsaTipo}
                    onChange={(e) => setAvulsaTipo(e.target.value)}
                    placeholder="Cobertura, Box, Loja"
                    className="h-9 text-xs border-slate-300"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="av-bloco" className="text-xs font-semibold text-slate-700">
                    Bloco / Setor
                  </Label>
                  <Input
                    id="av-bloco"
                    value={avulsaBloco}
                    onChange={(e) => setAvulsaBloco(e.target.value)}
                    placeholder="Torre A, Térreo"
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="av-peso" className="text-xs font-semibold text-slate-700">
                    Peso do Voto (Fração)
                  </Label>
                  <Input
                    id="av-peso"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={avulsaPeso}
                    onChange={(e) => setAvulsaPeso(e.target.value)}
                    placeholder="1"
                    className="h-9 text-xs border-slate-300"
                  />
                  <span className="text-[10px] text-slate-400">Padrão 1 (ou fração ideal)</span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="av-andar" className="text-xs font-semibold text-slate-700">
                    Andar (Opcional)
                  </Label>
                  <Input
                    id="av-andar"
                    value={avulsaAndar}
                    onChange={(e) => setAvulsaAndar(e.target.value)}
                    placeholder="Ex: Cobertura, Térreo"
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="av-nome" className="text-xs font-semibold text-slate-700">
                  Nome do Titular / Responsável (Opcional)
                </Label>
                <Input
                  id="av-nome"
                  value={avulsaNome}
                  onChange={(e) => setAvulsaNome(e.target.value)}
                  placeholder="Nome do condômino titular"
                  className="h-9 text-xs border-slate-300"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={salvandoAvulsa}
                onClick={() => setModalAvulsaAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoAvulsa}
                className="bg-purple-700 hover:bg-purple-800 text-white font-semibold"
              >
                {salvandoAvulsa ? 'Salvando...' : 'Cadastrar Unidade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ConfiguracoesPage

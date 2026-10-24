import React, { useState, useEffect } from 'react'
import { api, type UnidadeRecord } from '@/lib/api'
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
} from 'lucide-react'

export const ConfiguracoesPage: React.FC = () => {
  const { config, recarregarConfig, logoUrl } = useCondoConfig()
  const { user } = useAuth()

  // Estados do formulário de dados gerais
  const [nomeCondominio, setNomeCondominio] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [salvandoGeral, setSalvandoGeral] = useState(false)

  // Estados da estrutura de unidades
  const [qtdBlocos, setQtdBlocos] = useState(2)
  const [unidadesPorBloco, setUnidadesPorBloco] = useState(26)
  const [prefixoBloco, setPrefixoBloco] = useState('Bloco')
  const [totalAtualUnidades, setTotalAtualUnidades] = useState<number>(52)
  const [unidadesCadastradas, setUnidadesCadastradas] = useState<UnidadeRecord[]>([])
  const [regenerando, setRegenerando] = useState(false)

  useEffect(() => {
    if (config) {
      setNomeCondominio(config.nome_condominio || 'Condomínio Residencial Lago Azul')
      setQtdBlocos(config.quantidade_blocos || 2)
      setUnidadesPorBloco(config.unidades_por_bloco || 26)
      setPrefixoBloco(config.prefixo_bloco || 'Bloco')
    }
  }, [config])

  const carregarUnidades = async () => {
    try {
      const u = await api.getUnidades()
      setUnidadesCadastradas(u)
      setTotalAtualUnidades(u.length)
    } catch (err) {
      console.error('Erro ao carregar unidades:', err)
    }
  }

  useEffect(() => {
    carregarUnidades()
  }, [])

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

  const handleSalvarDadosGerais = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    setSalvandoGeral(true)
    try {
      if (logoFile) {
        const formData = new FormData()
        formData.append('nome_condominio', nomeCondominio.trim())
        formData.append('logo', logoFile)
        await api.updateConfiguracao(config.id, formData)
      } else {
        await api.updateConfiguracao(config.id, {
          nome_condominio: nomeCondominio.trim(),
        })
      }

      await api.registrarEventoAuditoria({
        evento: 'autenticacao_concluida',
        fator: `Admin ${user?.name || user?.email} atualizou configurações gerais (Nome: "${nomeCondominio.trim()}")`,
      })

      await recarregarConfig()
      toast({
        title: 'Configurações Salvas',
        description: 'Nome e identidade visual atualizados com sucesso.',
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

  const handleRegenerarUnidades = async () => {
    const totalNovo = qtdBlocos * unidadesPorBloco
    const confirmacao = window.confirm(
      `Deseja sincronizar a malha de unidades para ${qtdBlocos} blocos com ${unidadesPorBloco} unidades cada (${totalNovo} unidades)?\n\nATENÇÃO: Nenhuma unidade com vínculos ou cédulas existentes será apagada. Apenas novas unidades faltantes serão adicionadas.`,
    )
    if (!confirmacao) return

    setRegenerando(true)
    try {
      const resp = await api.regenerarUnidades({
        quantidadeBlocos: qtdBlocos,
        unidadesPorBloco: unidadesPorBloco,
        prefixoBloco: prefixoBloco.trim(),
      })

      await recarregarConfig()
      await carregarUnidades()

      toast({
        title: 'Unidades Sincronizadas',
        description: resp.message,
      })
    } catch (err: any) {
      console.error('Erro ao regenerar unidades:', err)
      toast({
        title: 'Erro na Regeneração',
        description: err?.message || 'Falha ao sincronizar unidades.',
        variant: 'destructive',
      })
    } finally {
      setRegenerando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-purple-700" /> Configurações do Condomínio
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Identidade institucional do condomínio e dimensionamento da malha de unidades para a
          assembleia.
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
                  {/* Prévia Atual ou Nova */}
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
                      ícone padrão Lago Azul continuará sendo exibido.
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

        {/* CARD 2: GESTÃO E REGENERAÇÃO DA MALHA DE UNIDADES */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-700" /> Estrutura & Regeneração de Unidades
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Configure a quantidade de blocos e apartamentos para geração da malha do
                  condomínio.
                </CardDescription>
              </div>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-2.5 py-1">
                {totalAtualUnidades} unidades cadastradas
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {/* Aviso de integridade e segurança */}
            <Alert className="border-amber-200 bg-amber-50/70 text-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-xs font-bold">
                Preservação de Registros Históricos
              </AlertTitle>
              <AlertDescription className="text-xs mt-0.5">
                A regeneração de unidades opera de maneira <strong>não-destrutiva</strong>. Unidades
                existentes que possuem credenciamentos, presença ou votos na urna{' '}
                <strong>jamais</strong> serão apagadas. A regeneração apenas insere as unidades que
                faltam na numeração esperada.
              </AlertDescription>
            </Alert>

            {/* Configuração de Blocos e Unidades */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="blocos" className="text-xs font-semibold text-slate-700">
                  Quantidade de Blocos
                </Label>
                <Input
                  id="blocos"
                  type="number"
                  min={1}
                  max={10}
                  value={qtdBlocos}
                  onChange={(e) => setQtdBlocos(Number(e.target.value))}
                  className="h-10 text-sm border-slate-300"
                />
                <span className="text-[11px] text-slate-400">Ex: 2 blocos (A e B)</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unidadesPorBloco" className="text-xs font-semibold text-slate-700">
                  Unidades por Bloco
                </Label>
                <Input
                  id="unidadesPorBloco"
                  type="number"
                  min={1}
                  max={100}
                  value={unidadesPorBloco}
                  onChange={(e) => setUnidadesPorBloco(Number(e.target.value))}
                  className="h-10 text-sm border-slate-300"
                />
                <span className="text-[11px] text-slate-400">Ex: 26 por bloco</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prefixo" className="text-xs font-semibold text-slate-700">
                  Prefixo de Designação
                </Label>
                <Input
                  id="prefixo"
                  value={prefixoBloco}
                  onChange={(e) => setPrefixoBloco(e.target.value)}
                  placeholder="Bloco, Torre, Edifício..."
                  className="h-10 text-sm border-slate-300"
                />
                <span className="text-[11px] text-slate-400">Ex: Bloco A, Bloco B</span>
              </div>
            </div>

            {/* Painel Resumo */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    Dimensionamento Projetado: {qtdBlocos * unidadesPorBloco} unidades
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Cadastradas no banco: <strong>{totalAtualUnidades}</strong> • Faltantes para
                    completar malha:{' '}
                    <strong>
                      {Math.max(0, qtdBlocos * unidadesPorBloco - totalAtualUnidades)}
                    </strong>
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleRegenerarUnidades}
                disabled={regenerando}
                className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs shrink-0"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${regenerando ? 'animate-spin' : ''}`} />
                {regenerando ? 'Sincronizando...' : 'Regenerar / Sincronizar Unidades'}
              </Button>
            </div>

            {/* Pré-visualização compacta das unidades atuais */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Amostra das Unidades Registradas ({unidadesCadastradas.length})
              </span>
              <div className="max-h-40 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200 grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center text-xs">
                {unidadesCadastradas.slice(0, 36).map((u) => (
                  <div
                    key={u.id}
                    className="p-1 rounded bg-slate-50 border border-slate-100 text-slate-700 font-mono text-[11px] truncate"
                    title={`Apto ${u.identificador} (${u.bloco || 'Lago Azul'})`}
                  >
                    {u.identificador}
                  </div>
                ))}
                {unidadesCadastradas.length > 36 && (
                  <div className="p-1 rounded bg-purple-50 text-purple-700 font-semibold text-[11px] flex items-center justify-center">
                    +{unidadesCadastradas.length - 36} mais
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ConfiguracoesPage

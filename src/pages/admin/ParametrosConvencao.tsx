import React, { useState, useEffect } from 'react'
import { api, type CondoConfigRecord } from '@/lib/api'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { BookOpen, Scale, Save, CheckCircle2, Info, SlidersHorizontal } from 'lucide-react'

export const ParametrosConvencaoPage: React.FC = () => {
  const { config, recarregarConfig } = useCondoConfig()
  const { user } = useAuth()

  const [inadimplenteVota, setInadimplenteVota] = useState(true)
  const [locatarioVota, setLocatarioVota] = useState(false)
  const [quorumMateria, setQuorumMateria] = useState('Maioria simples dos presentes')
  const [tipoCedula, setTipoCedula] = useState('secreta')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (config) {
      setInadimplenteVota(config.default_inadimplente_vota ?? true)
      setLocatarioVota(config.default_locatario_vota ?? false)
      setQuorumMateria(config.default_quorum_materia || 'Maioria simples dos presentes')
      setTipoCedula(config.default_tipo_cedula || 'secreta')
    }
  }, [config])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    setSalvando(true)
    try {
      await api.updateConfiguracao(config.id, {
        default_inadimplente_vota: inadimplenteVota,
        default_locatario_vota: locatarioVota,
        default_quorum_materia: quorumMateria.trim(),
        default_tipo_cedula: tipoCedula,
      })

      await api.registrarEventoAuditoria({
        evento: 'configuracao_atualizada',
        fator: `Admin ${user?.name || user?.email} atualizou parâmetros globais de convenção condominial`,
      })
      await recarregarConfig()
      toast({
        title: 'Parâmetros Salvos',
        description: 'Os valores padrão globais serão pré-preenchidos nas próximas deliberações.',
      })
    } catch (err: any) {
      console.error('Erro ao salvar parâmetros da convenção:', err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao gravar parâmetros globais.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Scale className="h-6 w-6 text-purple-700" /> Parâmetros Globais da Convenção Condominial
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Definição dos padrões regimentais aplicados automaticamente na abertura de novas
          deliberações da assembleia.
        </p>
      </div>

      <Alert className="border-purple-200 bg-purple-50/70 text-purple-950">
        <Info className="h-4 w-4 text-purple-700" />
        <AlertTitle className="text-xs font-bold">Autonomia Regimental e Flexibilidade</AlertTitle>
        <AlertDescription className="text-xs mt-0.5">
          Conforme as regras do condomínio, os parâmetros abaixo funcionam como{' '}
          <strong>defaults globais</strong>: eles pré-preenchem a criação de qualquer nova
          assembleia, mas podem ser ajustados individualmente pela Mesa Diretora de acordo com o
          quórum especial da matéria (ex: 2/3 para obras voluptuárias).
        </AlertDescription>
      </Alert>

      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-purple-700" /> Padrões Globais de Deliberação
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Estes valores são carregados automaticamente ao clicar em &ldquo;Nova Assembleia /
            Deliberação&rdquo;.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSalvar}>
          <CardContent className="space-y-5 pt-1">
            {/* 1. Inadimplente vota? */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-lg">
                <p className="font-bold text-slate-900 text-sm">
                  Condômino inadimplente tem direito a voto por padrão?
                </p>
                <p className="text-xs text-slate-500">
                  Quando desativado, o sistema rejeita a emissão de cédula para unidades com débitos
                  registrados na data da assembleia (art. 1.335, III do Código Civil).
                </p>
              </div>
              <Switch checked={inadimplenteVota} onCheckedChange={setInadimplenteVota} />
            </div>

            {/* 2. Locatário vota? */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-lg">
                <p className="font-bold text-slate-900 text-sm">
                  Locatário tem direito a voto sem procuração específica?
                </p>
                <p className="text-xs text-slate-500">
                  Regra regimental padrão para matérias ordinárias que envolvam despesas comuns do
                  dia a dia do condomínio.
                </p>
              </div>
              <Switch checked={locatarioVota} onCheckedChange={setLocatarioVota} />
            </div>

            {/* 3. Tipo padrão de cédula e Quórum padrão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Escrutínio Padrão da Cédula
                </Label>
                <Select value={tipoCedula} onValueChange={setTipoCedula}>
                  <SelectTrigger className="text-xs h-10 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="secreta">
                      Secreta (Urna Criptografada SHA-256 — Padrão)
                    </SelectItem>
                    <SelectItem value="nominal">Nominal (Escrutínio Aberto com Ata)</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-slate-400">
                  Garante o sigilo constitucional do voto na cabine eletrônica.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Regra de Quórum Padrão da Matéria
                </Label>
                <Input
                  value={quorumMateria}
                  onChange={(e) => setQuorumMateria(e.target.value)}
                  placeholder="Ex: Maioria simples dos presentes"
                  className="text-xs h-10 border-slate-300"
                />
                <span className="text-[11px] text-slate-400">
                  Texto sugerido no cadastro de novos itens da pauta.
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-slate-100 pt-3">
            <Button
              type="submit"
              disabled={salvando}
              className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {salvando ? 'Salvando Parâmetros...' : 'Salvar Parâmetros Globais'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default ParametrosConvencaoPage

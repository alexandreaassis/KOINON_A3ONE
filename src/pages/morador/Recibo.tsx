import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { api, type ComprovanteRecord } from '@/lib/api'
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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import {
  Receipt,
  Search,
  CheckCircle2,
  Printer,
  Copy,
  Building,
  ShieldCheck,
  Calendar,
  Hash,
} from 'lucide-react'

export const ReciboPage: React.FC = () => {
  const { unidadeSelecionada } = useAuth()
  const { rotuloUnidade } = useCondoConfig()

  const [comprovantes, setComprovantes] = useState<ComprovanteRecord[]>([])
  const [buscaCodigo, setBuscaCodigo] = useState('')
  const [comprovanteBuscado, setComprovanteBuscado] = useState<ComprovanteRecord | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      if (!unidadeSelecionada) {
        setCarregando(false)
        return
      }
      setCarregando(true)
      try {
        const comps = await api.getComprovantesPorUnidade(unidadeSelecionada.id)
        if (!ativo) return
        setComprovantes(comps)
      } catch (err) {
        console.error('Erro ao carregar comprovantes:', err)
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [unidadeSelecionada])

  const handleBuscarPorCodigo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!buscaCodigo.trim()) return

    setBuscando(true)
    try {
      const comp = await api.getComprovantePorCodigo(buscaCodigo)
      if (comp) {
        setComprovanteBuscado(comp)
        toast({
          title: 'Comprovante Localizado',
          description: `Código ${buscaCodigo.toUpperCase()} autenticado pela urna.`,
        })
      } else {
        toast({
          title: 'Código Não Encontrado',
          description: 'Nenhum comprovante localizado com este código de conferência.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro na Busca',
        description: err?.message || 'Falha ao pesquisar comprovante.',
        variant: 'destructive',
      })
    } finally {
      setBuscando(false)
    }
  }

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo)
    toast({
      title: 'Copiado!',
      description: 'Código de conferência copiado para a área de transferência.',
    })
  }

  const imprimir = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Comprovantes e Recibos de Votação
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Auditoria individual do voto eletrônico no Condomínio Lago Azul com código de
            conferência criptográfica.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={imprimir}
          className="text-xs self-start sm:self-center gap-1.5"
        >
          <Printer className="h-4 w-4" /> Imprimir Recibo
        </Button>
      </div>

      {/* Busca Rápida por Código de Conferência */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Search className="h-4 w-4 text-cyan-700" /> Validador de Recibo por Código
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Digite o código de 8 caracteres alfanuméricos impresso no seu comprovante para validar
            sua existência na urna.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleBuscarPorCodigo} className="flex gap-2">
            <Input
              placeholder="Ex: W7K9XM2P"
              value={buscaCodigo}
              maxLength={8}
              onChange={(e) => setBuscaCodigo(e.target.value.toUpperCase())}
              className="font-mono text-sm uppercase max-w-xs"
            />
            <Button
              type="submit"
              disabled={buscando || !buscaCodigo}
              className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs"
            >
              {buscando ? 'Conferindo...' : 'Conferir na Urna'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Resultado da Busca Específica */}
      {comprovanteBuscado && (
        <Card className="border-cyan-300 bg-cyan-50/40 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-800 uppercase">
                Resultado da Consulta
              </span>
              <Badge className="bg-emerald-600 text-white shrink-0 text-center leading-normal">
                Voto Autêntico
              </Badge>
            </div>
            <CardTitle className="text-base font-bold text-slate-900">
              Código de Conferência: {comprovanteBuscado.codigo_conferencia}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5 text-slate-700">
            <p>
              <strong>Data e Hora do Registro:</strong> {comprovanteBuscado.data_hora}
            </p>
            <p>
              <strong>Hash da Cédula (SHA-256):</strong>{' '}
              <span className="font-mono">{comprovanteBuscado.hash_abreviado}...</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de Comprovantes da Unidade */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
          Comprovantes da Unidade {unidadeSelecionada?.tipo_unidade || rotuloUnidade}{' '}
          {unidadeSelecionada?.identificador} ({comprovantes.length})
        </h3>

        {comprovantes.length === 0 ? (
          <Card className="border-slate-200 text-center p-8">
            <Receipt className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhum voto registrado para esta unidade
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Assim que sua unidade concluir a votação na cabine, o recibo com o código de
              conferência será emitido aqui.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comprovantes.map((comp) => (
              <Card
                key={comp.id}
                className="border-slate-200 shadow-xs hover:border-cyan-300 transition-all"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider bg-cyan-50 px-2 py-0.5 rounded">
                      Cédula Eletrônica Gravada
                    </span>
                    <Badge
                      variant="outline"
                      className="border-emerald-500 text-emerald-800 text-[10px] shrink-0 text-center leading-normal"
                    >
                      Encadeada SHA-256
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-1">
                    Assembleia Lago Azul
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 pt-1">
                  {/* Bloco Destaque do Código */}
                  <div className="p-3 rounded-lg bg-slate-900 text-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Código de Conferência
                      </span>
                      <span className="text-xl font-mono font-bold tracking-widest text-cyan-300">
                        {comp.codigo_conferencia}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copiarCodigo(comp.codigo_conferencia)}
                      className="text-slate-300 hover:text-white hover:bg-slate-800"
                      title="Copiar código"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Building className="h-3.5 w-3.5" /> Unidade:
                      </span>
                      <strong className="text-slate-900">
                        {unidadeSelecionada?.tipo_unidade || rotuloUnidade}{' '}
                        {unidadeSelecionada?.identificador}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="h-3.5 w-3.5" /> Data/Hora:
                      </span>
                      <strong className="text-slate-900">{comp.data_hora}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Hash className="h-3.5 w-3.5" /> Hash da Cédula:
                      </span>
                      <span className="font-mono text-[11px] text-slate-800">
                        {comp.hash_abreviado}...
                      </span>
                    </div>
                  </div>

                  {/* Orientação de Guarda */}
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                    <strong>Orientação de guarda:</strong> Guarde este código de 8 caracteres. Ele
                    comprova que sua unidade compareceu e teve sua cédula computada na apuração
                    final, sem expor suas opções nominais em deliberações de escrutínio secreto.
                  </div>
                </CardContent>

                <CardFooter className="pt-0 flex justify-between border-t border-slate-100 py-2 text-[11px] text-slate-400">
                  <span>Conferido pela Mesa Diretora</span>
                  <span>Lago Azul • Skip Cloud</span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
export default ReciboPage

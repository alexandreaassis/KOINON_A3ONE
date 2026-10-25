import React, { useState, useEffect } from 'react'
import {
  api,
  type DeliberacaoRecord,
  type AuditoriaEventRecord,
  type ApuracaoResponse,
  type UnidadeRecord,
} from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { toast } from '@/hooks/use-toast'
import {
  History,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Copy,
  Hash,
  ShieldCheck,
  Building,
  KeyRound,
  Vote,
  Share2,
} from 'lucide-react'

export const AuditoriaPage: React.FC = () => {
  const { rotuloUnidade } = useCondoConfig()
  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [eventos, setEventos] = useState<AuditoriaEventRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [boletim, setBoletim] = useState<ApuracaoResponse | null>(null)
  const [carregandoBoletim, setCarregandoBoletim] = useState(false)
  const [carregandoEventos, setCarregandoEventos] = useState(true)

  const carregarIniciais = async () => {
    try {
      const [delibs, aud, unids] = await Promise.all([
        api.getDeliberacoes(),
        api.getAuditoriaEvents(100),
        api.getUnidades(),
      ])
      setDeliberacoes(delibs)
      setEventos(aud.items)
      setUnidades(unids)

      if (delibs.length > 0 && !deliberacaoAtiva) {
        setDeliberacaoAtiva(delibs[0])
        buscarBoletim(delibs[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar auditoria:', err)
    } finally {
      setCarregandoEventos(false)
    }
  }

  const buscarBoletim = async (deliberacaoId: string) => {
    setCarregandoBoletim(true)
    try {
      const data = await api.getApuracao(deliberacaoId)
      setBoletim(data)
    } catch (err) {
      console.error('Erro ao carregar boletim de urna:', err)
      setBoletim(null)
    } finally {
      setCarregandoBoletim(false)
    }
  }

  useEffect(() => {
    carregarIniciais()
  }, [])

  const selecionarDeliberacao = (id: string) => {
    const d = deliberacoes.find((item) => item.id === id) || null
    setDeliberacaoAtiva(d)
    if (d) {
      buscarBoletim(d.id)
    }
  }

  const copiarHash = (h: string) => {
    navigator.clipboard.writeText(h)
    toast({
      title: 'Hash Copiado!',
      description: 'Hash SHA-256 copiado para a área de transferência.',
    })
  }

  const getBadgeEvento = (evento: string) => {
    switch (evento) {
      case 'cedula_registrada':
        return <Badge className="bg-emerald-600 text-white text-[10px]">Cédula Registrada</Badge>
      case 'otp_validado':
        return <Badge className="bg-cyan-600 text-white text-[10px]">OTP Validado</Badge>
      case 'otp_enviado':
        return <Badge className="bg-blue-600 text-white text-[10px]">OTP Enviado</Badge>
      case 'otp_falhou':
        return <Badge className="bg-red-600 text-white text-[10px]">OTP Falhou</Badge>
      case 'autenticacao_concluida':
        return <Badge className="bg-teal-600 text-white text-[10px]">2FA Concluído</Badge>
      case 'token_emitido':
        return <Badge className="bg-indigo-600 text-white text-[10px]">Token Emitido</Badge>
      case 'assembleia_aberta':
        return <Badge className="bg-purple-600 text-white text-[10px]">Assembleia Aberta</Badge>
      case 'assembleia_encerrada':
        return <Badge className="bg-amber-600 text-white text-[10px]">Votação Encerrada</Badge>
      case 'apuracao_concluida':
        return <Badge className="bg-emerald-700 text-white text-[10px]">Apuração Concluída</Badge>
      case 'resultado_publicado':
        return <Badge className="bg-slate-900 text-white text-[10px]">Resultado Publicado</Badge>
      case 'malha_unidades_gerada':
        return <Badge className="bg-purple-700 text-white text-[10px]">Malha Gerada</Badge>
      case 'unidade_avulsa_criada':
        return (
          <Badge className="bg-fuchsia-700 text-white text-[10px]">Unidade Avulsa Criada</Badge>
        )
      case 'configuracao_atualizada':
        return <Badge className="bg-blue-700 text-white text-[10px]">Configuração Atualizada</Badge>
      case 'usuario_gerenciado':
        return <Badge className="bg-violet-700 text-white text-[10px]">Usuário Gerenciado</Badge>
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {evento}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="h-5 w-5 text-amber-600" /> Auditoria Geral e Boletim de Urna
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Conferência matemática da cadeia SHA-256, boletim de urna por item e registro imutável
            de eventos.
          </p>
        </div>

        {/* Seletor de Deliberação */}
        {deliberacoes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Assembleia:</span>
            <Select value={deliberacaoAtiva?.id || ''} onValueChange={selecionarDeliberacao}>
              <SelectTrigger className="w-[240px] text-xs h-9">
                <SelectValue placeholder="Selecione a deliberação" />
              </SelectTrigger>
              <SelectContent>
                {deliberacoes.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.titulo} ({d.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Tabs defaultValue="boletim" className="space-y-4">
        <TabsList className="bg-slate-200/80 p-1">
          <TabsTrigger value="boletim" className="text-xs">
            <FileCheck2 className="mr-1.5 h-3.5 w-3.5" /> Boletim de Urna Oficial
          </TabsTrigger>
          <TabsTrigger value="eventos" className="text-xs">
            <History className="mr-1.5 h-3.5 w-3.5" /> Log de Eventos Encadeados ({eventos.length})
          </TabsTrigger>
        </TabsList>

        {/* ================= ABA 1: BOLETIM DE URNA ================= */}
        <TabsContent value="boletim" className="space-y-4">
          {boletim ? (
            <>
              {/* Card Resumo do Boletim */}
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-900 text-white text-[10px]">
                        BOLETIM DE URNA ELETRÔNICA
                      </Badge>
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        {boletim.apuracao.integridadeMatematica
                          ? 'Urna 100% Íntegra'
                          : 'Divergência'}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 mt-1">
                      {boletim.deliberacao.titulo}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Tipo de Cédula: {boletim.deliberacao.tipo_cedula.toUpperCase()} • Status:{' '}
                      {boletim.deliberacao.status}
                    </CardDescription>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="text-xs gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimir Boletim
                  </Button>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  {/* Hash Raiz da Urna */}
                  <div className="p-3.5 rounded-lg bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Hash Raiz da Urna (SHA-256) — Transcrição Oficial em Ata
                      </span>
                      <span className="font-mono text-xs text-emerald-400 break-all select-all">
                        {boletim.apuracao.hashRaizUrna}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copiarHash(boletim.apuracao.hashRaizUrna)}
                      className="bg-slate-800 text-slate-200 hover:text-white border-slate-700 text-xs shrink-0"
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copiar Hash
                    </Button>
                  </div>

                  {/* Estatísticas de Comparecimento e Cédulas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Comparecimento Total
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        {boletim.apuracao.totalComparecimentos}
                      </span>
                      <span className="text-[10px] text-slate-500 block">unidades votantes</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Cédulas Registradas
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        {boletim.apuracao.totalCedulas}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        (esperado: {boletim.apuracao.esperadoCedulas})
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Presenças Físicas
                      </span>
                      <span className="text-xl font-bold text-amber-700">
                        {boletim.apuracao.presencas.presencial}
                      </span>
                      <span className="text-[10px] text-slate-500 block">no plenário</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Presenças Remotas
                      </span>
                      <span className="text-xl font-bold text-cyan-700">
                        {boletim.apuracao.presencas.remoto}
                      </span>
                      <span className="text-[10px] text-slate-500 block">canal online</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contagem por Item da Pauta */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Apuração Matéria por Matéria ({boletim.apuracao.itens.length} itens)
                </h3>

                {boletim.apuracao.itens.map((item) => (
                  <Card key={item.id} className="border-slate-200 shadow-xs">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded">
                          Item {item.ordem}
                        </span>
                        <span className="text-xs text-slate-500">
                          Total de Votos no Item: <strong>{item.votos.total}</strong>
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 mt-1">
                        {item.titulo}
                      </CardTitle>
                      {item.quorum_aplicavel && (
                        <CardDescription className="text-xs text-slate-500">
                          Quórum Regimental: {item.quorum_aplicavel}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                        {/* Favorável */}
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                          <span className="text-xs font-semibold text-emerald-900 block">
                            Favorável (Sim)
                          </span>
                          <span className="text-2xl font-black text-emerald-700">
                            {item.votos.favoravel}
                          </span>
                          <span className="text-[11px] text-emerald-800 block">
                            {item.votos.total > 0
                              ? `${Math.round((item.votos.favoravel / item.votos.total) * 100)}% dos votos`
                              : '0%'}
                          </span>
                        </div>

                        {/* Contrário */}
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                          <span className="text-xs font-semibold text-red-900 block">
                            Contrário (Não)
                          </span>
                          <span className="text-2xl font-black text-red-700">
                            {item.votos.contrario}
                          </span>
                          <span className="text-[11px] text-red-800 block">
                            {item.votos.total > 0
                              ? `${Math.round((item.votos.contrario / item.votos.total) * 100)}% dos votos`
                              : '0%'}
                          </span>
                        </div>

                        {/* Abstenção */}
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <span className="text-xs font-semibold text-amber-900 block">
                            Abstenção
                          </span>
                          <span className="text-2xl font-black text-amber-700">
                            {item.votos.abstencao}
                          </span>
                          <span className="text-[11px] text-amber-800 block">
                            {item.votos.total > 0
                              ? `${Math.round((item.votos.abstencao / item.votos.total) * 100)}% dos votos`
                              : '0%'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card className="p-8 text-center border-slate-200">
              <FileCheck2 className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {carregandoBoletim ? 'Carregando boletim de urna...' : 'Nenhum boletim disponível'}
              </p>
            </Card>
          )}
        </TabsContent>

        {/* ================= ABA 2: LOG DE AUDITORIA ================= */}
        <TabsContent value="eventos" className="space-y-3">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Hash className="h-4 w-4 text-cyan-700" /> Trilha de Auditoria Encadeada
                (Append-Only)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Cada evento gera um hash SHA-256 atrelado ao hash do evento anterior, garantindo
                imunidade a adulterações.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-2">
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {eventos.map((ev) => {
                  const unid = unidades.find((u) => u.id === ev.unidade)
                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 font-bold text-[11px]">
                            #{ev.sequencial || '—'}
                          </span>
                          {getBadgeEvento(ev.evento)}
                          {unid && (
                            <span className="font-semibold text-slate-800">
                              {unid.tipo_unidade || rotuloUnidade} {unid.identificador}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 text-[11px]">
                          {ev.data_hora
                            ? new Date(ev.data_hora).toLocaleString('pt-BR')
                            : ev.created}
                        </span>
                      </div>

                      {ev.fator && (
                        <p className="text-slate-600 text-[11px]">
                          <strong>Fator:</strong> {ev.fator}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                        <span className="truncate max-w-[280px]">
                          Hash anterior:{' '}
                          {ev.hash_anterior ? ev.hash_anterior.substring(0, 16) : '0000...'}...
                        </span>
                        <span className="truncate max-w-[280px] text-emerald-700 font-semibold">
                          Hash evento:{' '}
                          {ev.hash_evento ? ev.hash_evento.substring(0, 16) : '0000...'}...
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default AuditoriaPage

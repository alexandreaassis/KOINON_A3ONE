import React, { useState, useEffect } from 'react'
import {
  api,
  type DeliberacaoRecord,
  type UnidadeRecord,
  type PresencaAssinaturaRecord,
  type PresencaRecord,
  type CredenciamentoRecord,
} from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { useAuth } from '@/context/AuthContext'
import { formatarCpf, validarCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
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
import { Badge } from '@/components/ui/badge'
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
import {
  Printer,
  UserCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Upload,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react'

export const ListaPresencaPage: React.FC = () => {
  const { nomeCondominio, logoUrl, rotuloUnidade } = useCondoConfig()
  const { user } = useAuth()

  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [presencasAssinadas, setPresencasAssinadas] = useState<PresencaAssinaturaRecord[]>([])
  const [presencasAntigas, setPresencasAntigas] = useState<PresencaRecord[]>([])
  const [credenciamentos, setCredenciamentos] = useState<CredenciamentoRecord[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtro
  const [busca, setBusca] = useState('')

  // Modal Assinatura / Registro de Presença
  const [modalPresencaAberto, setModalPresencaAberto] = useState(false)
  const [unidadeSelecionadaId, setUnidadeSelecionadaId] = useState('')
  const [participanteNome, setParticipanteNome] = useState('')
  const [participanteCpf, setParticipanteCpf] = useState('')
  const [cpfErro, setCpfErro] = useState<string | null>(null)
  const [formaPresenca, setFormaPresenca] = useState<'presencial' | 'remoto' | 'procuracao'>(
    'presencial',
  )
  const [nomeProcurador, setNomeProcurador] = useState('')
  const [cpfProcurador, setCpfProcurador] = useState('')
  const [procuradorCpfErro, setProcuradorCpfErro] = useState<string | null>(null)
  const [arquivoProcuracao, setArquivoProcuracao] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Carregar dados
  const carregarDados = async (delibId?: string) => {
    setCarregando(true)
    try {
      const [delibs, unids, creds] = await Promise.all([
        api.getDeliberacoes(),
        api.getUnidades(),
        api.getCredenciamentos("status = 'aprovado'"),
      ])

      setDeliberacoes(delibs)
      setUnidades(unids)
      setCredenciamentos(creds)

      const delib = delibId
        ? delibs.find((d) => d.id === delibId) || delibs[0]
        : delibs.find((d) => d.status !== 'PUBLICADA' && d.status !== 'ENCERRADA') || delibs[0]

      setDeliberacaoAtiva(delib || null)

      if (delib) {
        const [assList, presList] = await Promise.all([
          api.getPresencasAssinatura(delib.id),
          api.getPresencas(delib.id),
        ])
        setPresencasAssinadas(assList)
        setPresencasAntigas(presList)
      }
    } catch (err: any) {
      console.error('Erro ao carregar lista de presença:', err)
      toast({
        title: 'Erro ao carregar lista de presença',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Ao selecionar uma unidade no modal, pré-preencher com credenciamento aprovado se existir
  const handleSelecionarUnidadeModal = (uId: string) => {
    setUnidadeSelecionadaId(uId)
    const cred = credenciamentos.find((c) => c.unidade === uId)
    if (cred) {
      setParticipanteNome(cred.titular_nome)
      setParticipanteCpf(formatarCpf(cred.cpf))
      if (cred.tipo_vinculo === 'procurador') {
        setFormaPresenca('procuracao')
      }
    } else {
      const u = unidades.find((item) => item.id === uId)
      if (u && u.responsavel_nome) {
        setParticipanteNome(u.responsavel_nome)
      }
    }
  }

  // Hash SHA-256 no browser
  const calcularSha256 = async (texto: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(texto)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Submeter Registro de Presença com Assinatura Eletrônica
  const handleSalvarPresenca = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliberacaoAtiva || !unidadeSelecionadaId) {
      toast({ title: 'Selecione a unidade', variant: 'destructive' })
      return
    }

    if (!participanteNome.trim()) {
      toast({ title: 'Nome do participante obrigatório', variant: 'destructive' })
      return
    }

    const rawCpf = participanteCpf.replace(/\D/g, '')
    if (rawCpf.length > 0 && !validarCpf(participanteCpf)) {
      setCpfErro(MSG_CPF_INVALIDO)
      return
    }
    setCpfErro(null)

    if (formaPresenca === 'procuracao') {
      if (!nomeProcurador.trim()) {
        toast({ title: 'Nome do procurador obrigatório', variant: 'destructive' })
        return
      }
      const rawCpfProc = cpfProcurador.replace(/\D/g, '')
      if (rawCpfProc.length > 0 && !validarCpf(cpfProcurador)) {
        setProcuradorCpfErro(MSG_CPF_INVALIDO)
        return
      }
      setProcuradorCpfErro(null)
    }

    setSalvando(true)
    try {
      const dataHora = new Date().toISOString()
      const payloadHash = JSON.stringify({
        deliberacao: deliberacaoAtiva.id,
        unidade: unidadeSelecionadaId,
        nome: participanteNome.trim(),
        cpf: rawCpf,
        forma: formaPresenca,
        nomeProcurador: nomeProcurador.trim(),
        cpfProcurador: cpfProcurador.replace(/\D/g, ''),
        momento: dataHora,
      })

      const hashAssinatura = await calcularSha256(payloadHash)

      // Checar se já existe registro prévio desta unidade
      const existente = presencasAssinadas.find((p) => p.unidade === unidadeSelecionadaId)

      const formData = new FormData()
      formData.append('deliberacao', deliberacaoAtiva.id)
      formData.append('unidade', unidadeSelecionadaId)
      formData.append('nome', participanteNome.trim())
      formData.append('cpf', rawCpf)
      formData.append('forma', formaPresenca)
      formData.append('assinatura_hash', hashAssinatura)
      formData.append('data_hora_assinatura', dataHora)
      formData.append('ip_dispositivo', navigator.userAgent)

      if (formaPresenca === 'procuracao') {
        formData.append('nome_procurador', nomeProcurador.trim())
        formData.append('cpf_procurador', cpfProcurador.replace(/\D/g, ''))
        if (arquivoProcuracao) {
          formData.append('procuracao_arquivo', arquivoProcuracao)
        }
      }

      await api.salvarPresencaAssinatura(formData, existente?.id)

      // Registrar também na collection legada `presencas` se ainda não estiver
      try {
        await api.registrarPresencaPresencial(deliberacaoAtiva.id, unidadeSelecionadaId)
      } catch {
        /* intentionally ignored */
      }

      // Gravar auditoria
      await api.registrarEventoAuditoria({
        evento: 'presenca_assinada',
        fator: `Mesa: presença registrada (${formaPresenca}) para unidade ${unidadeSelecionadaId} - Assinante: ${participanteNome}`,
        unidade: unidadeSelecionadaId,
        dispositivo: navigator.userAgent,
      })

      toast({
        title: 'Presença e Assinatura Registradas!',
        description: `Carimbo SHA-256 gerado: ${hashAssinatura.substring(0, 16)}...`,
      })

      setModalPresencaAberto(false)
      setUnidadeSelecionadaId('')
      setParticipanteNome('')
      setParticipanteCpf('')
      setNomeProcurador('')
      setCpfProcurador('')
      setArquivoProcuracao(null)

      if (deliberacaoAtiva) {
        const assList = await api.getPresencasAssinatura(deliberacaoAtiva.id)
        setPresencasAssinadas(assList)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar presença',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Unidades combinadas com status de presença
  const mapaPresencas = new Map<string, PresencaAssinaturaRecord>()
  presencasAssinadas.forEach((p) => mapaPresencas.set(p.unidade, p))

  // Unidades filtradas pela busca
  const unidadesFiltradas = unidades.filter((u) => {
    if (!busca.trim()) return true
    const termo = busca.toLowerCase()
    const ident = (u.identificador || '').toLowerCase()
    const bloco = (u.bloco || '').toLowerCase()
    const resp = (u.responsavel_nome || '').toLowerCase()
    const pres = mapaPresencas.get(u.id)
    const proc = (pres?.nome_procurador || '').toLowerCase()
    return (
      ident.includes(termo) || bloco.includes(termo) || resp.includes(termo) || proc.includes(termo)
    )
  })

  const totalPresentes = presencasAssinadas.length
  const totalPresencial = presencasAssinadas.filter((p) => p.forma === 'presencial').length
  const totalRemoto = presencasAssinadas.filter((p) => p.forma === 'remoto').length
  const totalProcuracao = presencasAssinadas.filter((p) => p.forma === 'procuracao').length

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Tela (Oculto em impressão) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-amber-600" /> Lista de Presença & Assinatura
            Eletrônica
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Controle de quórum de instalação, presenças remotas/presenciais, indicadores de
            procuração e assinatura digital.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {deliberacoes.length > 0 && (
            <Select
              value={deliberacaoAtiva?.id || ''}
              onValueChange={(val) => {
                const encontrada = deliberacoes.find((d) => d.id === val)
                if (encontrada) carregarDados(encontrada.id)
              }}
            >
              <SelectTrigger className="w-56 text-xs h-9 bg-white border-slate-300">
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
          )}

          <Button
            size="sm"
            onClick={() => window.print()}
            variant="outline"
            className="text-xs h-9 border-slate-300"
          >
            <Printer className="h-4 w-4 mr-1.5" /> Imprimir Documento A4
          </Button>

          <Button
            size="sm"
            onClick={() => setModalPresencaAberto(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9"
            disabled={!deliberacaoAtiva}
          >
            <UserCheck className="h-4 w-4 mr-1.5" /> Registrar Presença / Assinatura
          </Button>
        </div>
      </div>

      {/* Cards de Métricas (Oculto em impressão) */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200">
          <span className="text-xs text-slate-500 font-semibold block">Total de Presentes</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{totalPresentes}</span>
            <span className="text-xs text-slate-500">/ {unidades.length} unidades</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-xs text-slate-500 font-semibold block">Presencial</span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block">{totalPresencial}</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-xs text-slate-500 font-semibold block">Remoto / Online</span>
          <span className="text-2xl font-bold text-cyan-700 mt-1 block">{totalRemoto}</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-xs text-slate-500 font-semibold block">Por Procuração</span>
          <span className="text-2xl font-bold text-amber-700 mt-1 block">{totalProcuracao}</span>
        </Card>
      </div>

      {/* Barra de Busca (Oculto em impressão) */}
      <div className="print:hidden flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por unidade, condômino ou procurador..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 text-xs h-9 bg-white"
          />
        </div>

        <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex-1">
          <strong>Ressalva Jurídica:</strong> As assinaturas e carimbos SHA-256 gerados atestam a
          presença no sistema condominial interno; certifique-se da exigência de firma reconhecida
          em procurações para fins cartorários.
        </div>
      </div>

      {/* DOCUMENTO OFICIAL A4 IMPRIMÍVEL (Mesmo padrão do Boletim de Urna) */}
      <article className="border border-slate-300 shadow-md bg-white rounded-lg p-8 max-w-[900px] mx-auto print:border-none print:shadow-none print:p-0 print:max-w-none text-slate-900 font-serif leading-normal">
        {/* Cabeçalho Institucional do Documento */}
        <header className="border-b-2 border-slate-900 pb-4 mb-6 text-center font-sans">
          <div className="flex items-center justify-between mb-2">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={nomeCondominio}
                className="h-12 w-12 object-contain print:h-10 print:w-10"
              />
            )}
            <div className="flex-1 text-center px-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-800 block">
                Plataforma Oficial de Governança Condominial
              </span>
              <h1 className="text-lg font-bold text-slate-950 uppercase">{nomeCondominio}</h1>
              <p className="text-xs text-slate-600">
                Lista Oficial de Presença e Registro de Comparecimento em Assembleia
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-slate-600">
              <span>Emissão:</span>
              <br />
              <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
            </div>
          </div>

          <div className="bg-slate-100 p-2 rounded text-xs font-semibold text-slate-800 flex items-center justify-between mt-2 font-mono">
            <span>Assembleia: {deliberacaoAtiva?.titulo || '—'}</span>
            <span>
              Quórum Presente: {totalPresentes} de {unidades.length} unidades (
              {((totalPresentes / (unidades.length || 1)) * 100).toFixed(1)}%)
            </span>
          </div>
        </header>

        {/* Tabela de Assinaturas e Presenças */}
        <section className="font-sans text-xs">
          <table className="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 w-20 text-center">Unidade</th>
                <th className="p-2 border-r border-slate-300">Titular / Representante</th>
                <th className="p-2 border-r border-slate-300 w-28 text-center">Modalidade</th>
                <th className="p-2 border-r border-slate-300">Representação / Procurador</th>
                <th className="p-2 text-center w-48">Assinatura / Hash SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {unidadesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                    Nenhuma unidade encontrada para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                unidadesFiltradas.map((u) => {
                  const pres = mapaPresencas.get(u.id)
                  const presLegada = presencasAntigas.find((p) => p.unidade === u.id)
                  const estaPresente = !!pres || !!presLegada

                  return (
                    <tr
                      key={u.id}
                      className={estaPresente ? 'bg-white' : 'bg-slate-50 text-slate-400'}
                    >
                      {/* Unidade */}
                      <td className="p-2 border-r border-slate-300 font-bold text-center">
                        {u.tipo_unidade || rotuloUnidade} {u.identificador}
                        {u.bloco && (
                          <span className="block text-[10px] font-normal text-slate-500">
                            ({u.bloco})
                          </span>
                        )}
                      </td>

                      {/* Nome do Titular */}
                      <td className="p-2 border-r border-slate-300">
                        {pres ? (
                          <>
                            <strong className="text-slate-900 block">{pres.nome}</strong>
                            {pres.cpf && (
                              <span className="text-[10px] text-slate-600 font-mono">
                                CPF: {formatarCpf(pres.cpf)}
                              </span>
                            )}
                          </>
                        ) : u.responsavel_nome ? (
                          <span className="text-slate-600">{u.responsavel_nome}</span>
                        ) : (
                          <span className="text-slate-400 italic">Não registrado</span>
                        )}
                      </td>

                      {/* Modalidade */}
                      <td className="p-2 border-r border-slate-300 text-center">
                        {pres ? (
                          <Badge
                            variant="outline"
                            className={`text-[9px] uppercase px-1 py-0 font-bold ${
                              pres.forma === 'procuracao'
                                ? 'border-amber-500 text-amber-800 bg-amber-50'
                                : pres.forma === 'remoto'
                                  ? 'border-cyan-500 text-cyan-800 bg-cyan-50'
                                  : 'border-emerald-500 text-emerald-800 bg-emerald-50'
                            }`}
                          >
                            {pres.forma}
                          </Badge>
                        ) : presLegada ? (
                          <Badge variant="outline" className="text-[9px] uppercase px-1 py-0">
                            {presLegada.tipo}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-400">Ausente</span>
                        )}
                      </td>

                      {/* Procurador / Representante */}
                      <td className="p-2 border-r border-slate-300">
                        {pres?.forma === 'procuracao' ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-amber-900 block">
                              Por Procuração: {pres.nome_procurador}
                            </span>
                            {pres.cpf_procurador && (
                              <span className="text-[10px] text-slate-600 font-mono block">
                                CPF: {formatarCpf(pres.cpf_procurador)}
                              </span>
                            )}
                            {pres.procuracao_arquivo && (
                              <a
                                href={pb.files.getURL(pres, pres.procuracao_arquivo)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-cyan-700 hover:underline print:hidden"
                              >
                                <ExternalLink className="h-3 w-3" /> Ver arquivo da procuração
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Assinatura Eletrônica / Hash */}
                      <td className="p-2 text-center">
                        {pres?.assinatura_hash ? (
                          <div className="font-mono text-[9px] leading-tight text-slate-700">
                            <span className="font-bold text-emerald-700 block">
                              ✓ ASSINADO DIGITALMENTE
                            </span>
                            <span className="break-all text-[8px] text-slate-500 block">
                              {pres.assinatura_hash.substring(0, 20)}...
                            </span>
                            <span className="text-[8px] text-slate-400 block">
                              {pres.data_hora_assinatura
                                ? new Date(pres.data_hora_assinatura).toLocaleString('pt-BR')
                                : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="border-b border-dashed border-slate-300 h-6" />
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </section>

        {/* Rodapé Institucional com Assinatura da Mesa e Resalva LGPD */}
        <footer className="mt-8 pt-4 border-t-2 border-slate-900 font-sans break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center pt-6 pb-2">
            <div className="space-y-1">
              <div className="border-t border-slate-900 mx-auto w-4/5 pt-1" />
              <p className="text-xs font-bold text-slate-950 uppercase">
                {deliberacaoAtiva?.mesa_presidente_nome || 'Presidente da Mesa Diretora'}
              </p>
              {deliberacaoAtiva?.mesa_presidente_cpf && (
                <p className="text-[10px] text-slate-600 font-mono">
                  CPF: {formatarCpf(deliberacaoAtiva.mesa_presidente_cpf)}
                </p>
              )}
              <p className="text-[10px] text-slate-500">Presidente da Assembleia</p>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-900 mx-auto w-4/5 pt-1" />
              <p className="text-xs font-bold text-slate-950 uppercase">
                {deliberacaoAtiva?.mesa_secretario_nome || 'Secretário(a) da Mesa'}
              </p>
              {deliberacaoAtiva?.mesa_secretario_cpf && (
                <p className="text-[10px] text-slate-600 font-mono">
                  CPF: {formatarCpf(deliberacaoAtiva.mesa_secretario_cpf)}
                </p>
              )}
              <p className="text-[10px] text-slate-500">Secretário(a) dos Trabalhos</p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-0.5">
            <p>
              Documento emitido pelo sistema de votação eletrônica {nomeCondominio} em conformidade
              com a Lei 10.406/2002 e LGPD (Lei 13.709/2018).
            </p>
            <p className="text-slate-400 text-[9px]">
              Assinaturas eletrônicas com integridade criptográfica SHA-256 vinculadas aos registros
              de auditoria.
            </p>
          </div>
        </footer>
      </article>

      {/* Modal Registrar Presença / Assinatura */}
      <Dialog open={modalPresencaAberto} onOpenChange={setModalPresencaAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Registrar Presença e Assinatura Eletrônica
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registre a presença do condômino ou procurador com geração instantânea de carimbo
              SHA-256.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarPresenca} className="space-y-3 text-xs">
            {/* Seletor de Unidade */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Selecione a Unidade</Label>
              <Select value={unidadeSelecionadaId} onValueChange={handleSelecionarUnidadeModal}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Escolha a unidade..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {unidades.map((u) => {
                    const jaRegistrado = mapaPresencas.has(u.id)
                    return (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.tipo_unidade || rotuloUnidade} {u.identificador} (
                        {u.bloco || 'Principal'}){jaRegistrado ? ' — [JÁ PRESENTE]' : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Modalidade de Participação */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Modalidade de Presença</Label>
              <Select value={formaPresenca} onValueChange={(val) => setFormaPresenca(val as any)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial (No local da assembleia)</SelectItem>
                  <SelectItem value="remoto">Remoto (Plataforma online)</SelectItem>
                  <SelectItem value="procuracao">Por Procuração / Representante Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Titular da Unidade */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700">Nome do Titular</Label>
                <Input
                  type="text"
                  placeholder="Nome do condômino"
                  value={participanteNome}
                  onChange={(e) => setParticipanteNome(e.target.value)}
                  required
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700">CPF do Titular</Label>
                <Input
                  type="text"
                  placeholder="000.000.000-00"
                  value={participanteCpf}
                  onChange={(e) => {
                    setParticipanteCpf(formatarCpf(e.target.value))
                    setCpfErro(null)
                  }}
                  className={`text-xs h-9 ${cpfErro ? 'border-red-500' : ''}`}
                />
                {cpfErro && <p className="text-[10px] text-red-600">{cpfErro}</p>}
              </div>
            </div>

            {/* Campos Específicos se for por Procuração */}
            {formaPresenca === 'procuracao' && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Dados do Procurador / Representante</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700">Nome do Procurador</Label>
                    <Input
                      type="text"
                      placeholder="Nome completo do procurador"
                      value={nomeProcurador}
                      onChange={(e) => setNomeProcurador(e.target.value)}
                      required
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700">CPF do Procurador</Label>
                    <Input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpfProcurador}
                      onChange={(e) => {
                        setCpfProcurador(formatarCpf(e.target.value))
                        setProcuradorCpfErro(null)
                      }}
                      className={`text-xs h-8 bg-white ${procuradorCpfErro ? 'border-red-500' : ''}`}
                    />
                    {procuradorCpfErro && (
                      <p className="text-[10px] text-red-600">{procuradorCpfErro}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">
                    Cópia da Procuração Digitalizada (PDF ou imagem)
                  </Label>
                  <Input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setArquivoProcuracao(e.target.files[0])
                      }
                    }}
                    className="text-xs h-8 bg-white"
                  />
                  <span className="text-[10px] text-slate-500">
                    Opcional no momento da assinatura, mas recomendado para conferência cartorária.
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalPresencaAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                disabled={salvando}
              >
                {salvando ? 'Gravando Assinatura...' : 'Confirmar Presença e Assinar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ListaPresencaPage

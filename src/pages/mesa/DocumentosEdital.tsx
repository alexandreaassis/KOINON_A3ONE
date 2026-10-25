import React, { useState, useEffect } from 'react'
import {
  api,
  type DeliberacaoRecord,
  type ItemPautaRecord,
  type DocumentoPautaRecord,
  type NotificacaoRecord,
  type TipoDocumentoPauta,
  type CargoCandidato,
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
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  UploadCloud,
  Send,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react'

export const DocumentosEditalPage: React.FC = () => {
  const { nomeCondominio, logoUrl } = useCondoConfig()
  const { user } = useAuth()

  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [itensPauta, setItensPauta] = useState<ItemPautaRecord[]>([])
  const [documentos, setDocumentos] = useState<DocumentoPautaRecord[]>([])
  const [notificacoes, setNotificacoes] = useState<NotificacaoRecord[]>([])
  const [carregando, setCarregando] = useState(true)

  // Estado do Edital
  const [editalLocal, setEditalLocal] = useState({
    primeiraConvocacao: '19:00',
    segundaConvocacao: '19:30',
    dataAssembleia: '',
    localTexto: 'Salão de Festas do Condomínio / Plataforma Virtual Votum',
    disposicoesGerais:
      'Os condôminos poderão votar presencialmente ou por meio da plataforma eletrônica. É admitida representação por procuração com firma reconhecida ou assinatura eletrônica idônea.',
    sindicoNome: '',
    sindicoCpf: '',
  })
  const [sindicoCpfErro, setSindicoCpfErro] = useState<string | null>(null)
  const [assinandoEdital, setAssinandoEdital] = useState(false)
  const [editalAssinadoHash, setEditalAssinadoHash] = useState<string | null>(null)
  const [editalAssinadoData, setEditalAssinadoData] = useState<string | null>(null)
  const [disparandoEmails, setDisparandoEmails] = useState(false)

  // Modal Upload de Documento da Pauta
  const [modalUploadAberto, setModalUploadAberto] = useState(false)
  const [tipoDoc, setTipoDoc] = useState<TipoDocumentoPauta>('prestacao_contas')
  const [tituloDoc, setTituloDoc] = useState('')
  const [descricaoDoc, setDescricaoDoc] = useState('')
  const [cargoCandidato, setCargoCandidato] = useState<CargoCandidato>('sindico')
  const [nomeCandidato, setNomeCandidato] = useState('')
  const [arquivoFile, setArquivoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Carregar dados
  const carregarDados = async (delibId?: string) => {
    setCarregando(true)
    try {
      const delibs = await api.getDeliberacoes()
      setDeliberacoes(delibs)

      const delibAtual = delibId
        ? delibs.find((d) => d.id === delibId) || delibs[0]
        : delibs.find((d) => d.status !== 'PUBLICADA' && d.status !== 'ENCERRADA') || delibs[0]

      setDeliberacaoAtiva(delibAtual || null)

      if (delibAtual) {
        const [itens, docs, notifs, assinaturas] = await Promise.all([
          api.getItensPauta(delibAtual.id),
          api.getDocumentosPauta(delibAtual.id),
          api.getNotificacoes(delibAtual.id),
          api.getAssinaturasPorDeliberacao(delibAtual.id),
        ])
        setItensPauta(itens)
        setDocumentos(docs)
        setNotificacoes(notifs)

        // Checar se já existe assinatura de edital gravada
        const assEdital = assinaturas.find(
          (a) => a.documento_tipo === 'edital' && a.status === 'valida',
        )
        if (assEdital) {
          setEditalAssinadoHash(assEdital.hash_documento)
          setEditalAssinadoData(assEdital.data_hora || assEdital.created)
          setEditalLocal((prev) => ({
            ...prev,
            sindicoNome: assEdital.assinante_nome,
            sindicoCpf: formatarCpf(assEdital.assinante_cpf),
          }))
        } else {
          setEditalAssinadoHash(null)
          setEditalAssinadoData(null)
          if (delibAtual.mesa_presidente_nome) {
            setEditalLocal((prev) => ({
              ...prev,
              sindicoNome: delibAtual.mesa_presidente_nome || '',
              sindicoCpf: formatarCpf(delibAtual.mesa_presidente_cpf || ''),
            }))
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados de documentos & edital:', err)
      toast({
        title: 'Erro ao carregar dados',
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

  // Gerar Hash SHA-256 no browser via crypto.subtle
  const calcularSha256Browser = async (texto: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(texto)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Ação: Assinar e Publicar Edital de Convocação
  const handleAssinarEdital = async () => {
    if (!deliberacaoAtiva) return

    if (!editalLocal.sindicoNome.trim()) {
      toast({
        title: 'Nome do Síndico / Convocante obrigatório',
        description: 'Preencha o nome do responsável pela assinatura da convocação.',
        variant: 'destructive',
      })
      return
    }

    const rawCpf = editalLocal.sindicoCpf.replace(/\D/g, '')
    if (rawCpf.length > 0 && !validarCpf(editalLocal.sindicoCpf)) {
      setSindicoCpfErro(MSG_CPF_INVALIDO)
      toast({
        title: 'CPF do Convocante inválido',
        description: 'Digite um CPF válido antes de assinar eletronicamente.',
        variant: 'destructive',
      })
      return
    }
    setSindicoCpfErro(null)

    setAssinandoEdital(true)
    try {
      const conteudoEdital = JSON.stringify({
        condominio: nomeCondominio,
        deliberacaoId: deliberacaoAtiva.id,
        titulo: deliberacaoAtiva.titulo,
        pauta: itensPauta.map((it) => `${it.ordem}. ${it.titulo}`),
        primeiraConvocacao: editalLocal.primeiraConvocacao,
        segundaConvocacao: editalLocal.segundaConvocacao,
        disposicoes: editalLocal.disposicoesGerais,
        sindicoNome: editalLocal.sindicoNome.trim(),
        sindicoCpf: rawCpf,
        momento: new Date().toISOString(),
      })

      const hash = await calcularSha256Browser(conteudoEdital)

      await api.registrarAssinaturaDocumento({
        documento_id: `edital_${deliberacaoAtiva.id}`,
        documento_tipo: 'edital',
        deliberacao: deliberacaoAtiva.id,
        assinante_nome: editalLocal.sindicoNome.trim(),
        assinante_cpf: rawCpf,
        tipo: 'sindico',
        hash_documento: hash,
        data_hora: new Date().toISOString(),
        usuario: user?.id,
        ip_dispositivo: navigator.userAgent,
      })

      // Registrar na auditoria
      await api.registrarEventoAuditoria({
        evento: 'assinatura_registrada',
        fator: `Síndico: ${editalLocal.sindicoNome.trim()} assinou digitalmente o Edital da deliberação ${deliberacaoAtiva.id}`,
        dispositivo: navigator.userAgent,
      })

      setEditalAssinadoHash(hash)
      setEditalAssinadoData(new Date().toISOString())
      toast({
        title: 'Edital Assinado Eletronicamente',
        description: `Assinatura SHA-256 registrada com sucesso: ${hash.substring(0, 16)}...`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha ao registrar assinatura',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setAssinandoEdital(false)
    }
  }

  // Ação: Publicar edital e notificar moradores por e-mail
  const handlePublicarENotificar = async () => {
    if (!deliberacaoAtiva) return
    if (!editalAssinadoHash) {
      toast({
        title: 'Assine o edital primeiro',
        description:
          'É necessário gerar a assinatura eletrônica do convocante antes do disparo aos moradores.',
        variant: 'destructive',
      })
      return
    }

    if (
      !confirm(
        `Confirma o envio do Edital de Convocação por e-mail para todos os moradores ativos cadastrados no ${nomeCondominio}?`,
      )
    ) {
      return
    }

    setDisparandoEmails(true)
    try {
      const resumoPauta = itensPauta.map((it) => `${it.ordem}. ${it.titulo}`).join('\n')
      const resp = await api.dispararEditalConvocacao({
        deliberacaoId: deliberacaoAtiva.id,
        tituloEdital: `Convocação: ${deliberacaoAtiva.titulo}`,
        resumoPauta,
        dataAssembleia: editalLocal.dataAssembleia || 'Conforme Edital Oficial',
        linkApp: window.location.origin,
      })

      toast({
        title: 'Notificações Enfileiradas com Sucesso!',
        description: resp.message || `Disparado para ${resp.totalDestinatarios} moradores.`,
      })

      // Recarregar notificações
      const notifs = await api.getNotificacoes(deliberacaoAtiva.id)
      setNotificacoes(notifs)
    } catch (err: any) {
      toast({
        title: 'Falha no disparo do edital',
        description: err?.message || 'Ocorreu um erro ao enfileirar os e-mails.',
        variant: 'destructive',
      })
    } finally {
      setDisparandoEmails(false)
    }
  }

  // Ação: Reenviar notificação individual
  const handleReenviarNotificacao = async (notifId: string) => {
    try {
      const resp = await api.reenviarNotificacao(notifId)
      if (resp.success) {
        toast({ title: 'E-mail reenviado com sucesso!' })
      } else {
        toast({
          title: 'Erro no reenvio',
          description: resp.message,
          variant: 'destructive',
        })
      }
      if (deliberacaoAtiva) {
        const notifs = await api.getNotificacoes(deliberacaoAtiva.id)
        setNotificacoes(notifs)
      }
    } catch (err: any) {
      toast({
        title: 'Falha ao reenviar',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  // Ação: Upload de Documento da Pauta
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliberacaoAtiva) return
    if (!tituloDoc.trim()) {
      toast({ title: 'Informe o título do documento', variant: 'destructive' })
      return
    }
    if (!arquivoFile) {
      toast({ title: 'Selecione um arquivo (PDF ou imagem)', variant: 'destructive' })
      return
    }

    if (arquivoFile.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo não pode exceder 10MB.',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('deliberacao', deliberacaoAtiva.id)
      formData.append('tipo', tipoDoc)
      formData.append('titulo', tituloDoc.trim())
      formData.append('descricao', descricaoDoc.trim())
      formData.append('arquivo', arquivoFile)
      formData.append('ordem', String(documentos.length + 1))
      if (user?.id) formData.append('criado_por', user.id)

      if (tipoDoc === 'curriculo_candidato') {
        formData.append('cargo_candidato', cargoCandidato)
        formData.append('nome_candidato', nomeCandidato.trim())
      }

      await api.uploadDocumentoPauta(formData)

      // Registrar auditoria
      await api.registrarEventoAuditoria({
        evento: 'documento_upload',
        fator: `Mesa: upload do documento "${tituloDoc.trim()}" (${tipoDoc}) na deliberação ${deliberacaoAtiva.id}`,
        dispositivo: navigator.userAgent,
      })

      toast({ title: 'Documento Anexado à Pauta!' })
      setModalUploadAberto(false)
      setTituloDoc('')
      setDescricaoDoc('')
      setNomeCandidato('')
      setArquivoFile(null)

      const docs = await api.getDocumentosPauta(deliberacaoAtiva.id)
      setDocumentos(docs)
    } catch (err: any) {
      toast({
        title: 'Falha no upload',
        description: err?.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  // Ação: Excluir Documento da Pauta
  const handleExcluirDoc = async (docId: string, docTitulo: string) => {
    if (!confirm(`Deseja realmente remover o documento "${docTitulo}"?`)) return
    try {
      await api.deleteDocumentoPauta(docId)
      toast({ title: 'Documento Removido' })
      if (deliberacaoAtiva) {
        const docs = await api.getDocumentosPauta(deliberacaoAtiva.id)
        setDocumentos(docs)
      }
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err?.message, variant: 'destructive' })
    }
  }

  const getArquivoUrl = (doc: DocumentoPautaRecord) => {
    if (!doc.arquivo) return ''
    return pb.files.getURL(doc, doc.arquivo)
  }

  const formatarTipoDoc = (tipo: TipoDocumentoPauta) => {
    switch (tipo) {
      case 'convencao_proposta':
        return 'Proposta de Convenção'
      case 'regimento_interno':
        return 'Regimento Interno'
      case 'prestacao_contas':
        return 'Prestação de Contas'
      case 'curriculo_candidato':
        return 'Currículo de Candidato'
      case 'edital':
        return 'Edital de Convocação'
      case 'procuracao':
        return 'Modelo de Procuração'
      default:
        return 'Outro Documento'
    }
  }

  const formatarCargo = (cargo?: CargoCandidato) => {
    switch (cargo) {
      case 'sindico':
        return 'Síndico(a)'
      case 'vice_sindico':
        return 'Vice-Síndico(a)'
      case 'conselheiro_fiscal':
        return 'Conselheiro Fiscal'
      case 'conselheiro_consultivo':
        return 'Conselheiro Consultivo'
      default:
        return 'Candidato'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Seletor de Assembleia */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" /> Documentos da Pauta & Edital de
            Convocação
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Geração de Edital formal com assinatura eletrônica SHA-256, anexo de documentos da pauta
            e disparo aos moradores.
          </p>
        </div>

        {deliberacoes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Assembleia:
            </span>
            <Select
              value={deliberacaoAtiva?.id || ''}
              onValueChange={(val) => {
                const encontrada = deliberacoes.find((d) => d.id === val)
                if (encontrada) carregarDados(encontrada.id)
              }}
            >
              <SelectTrigger className="w-64 text-xs h-9 bg-white border-slate-300">
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

      {/* Tabs Principais: Edital de Convocação / Pauta Documental / Notificações Disparadas */}
      <Tabs defaultValue="edital" className="w-full">
        <TabsList className="bg-slate-200/80 p-1 border border-slate-200 grid grid-cols-3 max-w-xl">
          <TabsTrigger value="edital" className="text-xs font-semibold">
            Edital de Convocação
          </TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs font-semibold">
            Documentos da Pauta ({documentos.length})
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="text-xs font-semibold">
            Notificações E-mail ({notificacoes.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: EDITAL DE CONVOCAÇÃO */}
        <TabsContent value="edital" className="space-y-6 pt-3">
          {deliberacaoAtiva ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna de Configuração do Edital */}
              <div className="space-y-4">
                <Card className="border-slate-200 shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-cyan-600" />
                      Parâmetros do Edital
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Preencha os dados e assine eletronicamente antes de notificar os condôminos.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700">Data da Assembleia</Label>
                      <Input
                        type="text"
                        placeholder="Ex: 28/10/2026 das 19h às 22h"
                        value={editalLocal.dataAssembleia}
                        onChange={(e) =>
                          setEditalLocal({ ...editalLocal, dataAssembleia: e.target.value })
                        }
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-700">1ª Convocação</Label>
                        <Input
                          type="text"
                          value={editalLocal.primeiraConvocacao}
                          onChange={(e) =>
                            setEditalLocal({ ...editalLocal, primeiraConvocacao: e.target.value })
                          }
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-700">2ª Convocação</Label>
                        <Input
                          type="text"
                          value={editalLocal.segundaConvocacao}
                          onChange={(e) =>
                            setEditalLocal({ ...editalLocal, segundaConvocacao: e.target.value })
                          }
                          className="text-xs h-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700">Local dos Trabalhos</Label>
                      <Input
                        type="text"
                        value={editalLocal.localTexto}
                        onChange={(e) =>
                          setEditalLocal({ ...editalLocal, localTexto: e.target.value })
                        }
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700">Disposições Gerais / Regras</Label>
                      <Textarea
                        rows={3}
                        value={editalLocal.disposicoesGerais}
                        onChange={(e) =>
                          setEditalLocal({ ...editalLocal, disposicoesGerais: e.target.value })
                        }
                        className="text-xs resize-none"
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-700 font-semibold">
                          Nome do Síndico / Convocante
                        </Label>
                        <Input
                          type="text"
                          placeholder="Nome completo do Síndico"
                          value={editalLocal.sindicoNome}
                          onChange={(e) =>
                            setEditalLocal({ ...editalLocal, sindicoNome: e.target.value })
                          }
                          className="text-xs h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-700 font-semibold">
                          CPF do Convocante
                        </Label>
                        <Input
                          type="text"
                          placeholder="000.000.000-00"
                          value={editalLocal.sindicoCpf}
                          onChange={(e) => {
                            setEditalLocal({
                              ...editalLocal,
                              sindicoCpf: formatarCpf(e.target.value),
                            })
                            setSindicoCpfErro(null)
                          }}
                          className={`text-xs h-8 ${sindicoCpfErro ? 'border-red-500' : ''}`}
                        />
                        {sindicoCpfErro && (
                          <p className="text-[10px] text-red-600 font-medium">{sindicoCpfErro}</p>
                        )}
                      </div>
                    </div>

                    {/* Resalva Jurídica */}
                    <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                      <span className="font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                        Ressalva Jurídica:
                      </span>
                      A assinatura eletrônica deste sistema (nome + CPF + carimbo hash SHA-256)
                      atesta a autenticidade no ambiente condominial interno, mas não substitui
                      certificado ICP-Brasil/e-CPF caso expressamente exigido pelo Cartório de
                      Registro de Pessoas Jurídicas ou convenção.
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2 pt-0">
                    <Button
                      className="w-full bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-9"
                      onClick={handleAssinarEdital}
                      disabled={assinandoEdital}
                    >
                      <ShieldCheck className="h-4 w-4 mr-1.5" />
                      {editalAssinadoHash
                        ? 'Atualizar Assinatura Eletrônica'
                        : 'Assinar Edital Eletronicamente'}
                    </Button>

                    <Button
                      variant="default"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                      onClick={handlePublicarENotificar}
                      disabled={disparandoEmails || !editalAssinadoHash}
                    >
                      <Send className="h-4 w-4 mr-1.5" />
                      Publicar Edital e Notificar Moradores
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Coluna de Visualização do Edital Visual Profissional (A4) */}
              <div className="lg:col-span-2">
                <Card className="border-slate-300 shadow-md bg-white">
                  <CardHeader className="bg-slate-900 text-white rounded-t-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {logoUrl && (
                          <img
                            src={logoUrl}
                            alt={nomeCondominio}
                            className="h-10 w-10 object-contain bg-white rounded p-1"
                          />
                        )}
                        <div>
                          <p className="text-[10px] tracking-widest uppercase text-cyan-300 font-bold">
                            Edital Oficial de Convocação
                          </p>
                          <h3 className="text-base font-bold text-white leading-tight">
                            {nomeCondominio}
                          </h3>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-mono text-slate-300 block">
                          Assembleia Geral
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-cyan-400 text-cyan-200 px-2 py-0"
                        >
                          {deliberacaoAtiva.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-8 space-y-6 text-slate-800 font-serif leading-relaxed text-sm bg-white">
                    <div className="text-center space-y-1 border-b border-slate-200 pb-4">
                      <h4 className="text-lg font-bold text-slate-950 uppercase tracking-wide">
                        {deliberacaoAtiva.titulo}
                      </h4>
                      <p className="text-xs text-slate-600 font-sans italic">
                        Convocação Formal aos Condôminos e Moradores
                      </p>
                    </div>

                    <div className="space-y-3 text-xs font-sans">
                      <p className="text-justify leading-relaxed">
                        O Síndico e a Mesa Diretora do <strong>{nomeCondominio}</strong>, no uso de
                        suas atribuições legais conferidas pelo Código Civil Brasileiro (Lei nº
                        10.406/2002, art. 1.350) e pela Convenção Condominial, vêm por meio deste{' '}
                        <strong>CONVOCAR</strong> todos os senhores condôminos titulares de unidades
                        autônomas a se reunirem em Assembleia Geral, que será realizada sob as
                        seguintes condições:
                      </p>

                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-2">
                        <p>
                          <strong>• Data e Horário:</strong>{' '}
                          {editalLocal.dataAssembleia || 'Conforme cronograma da assembleia'}
                        </p>
                        <p>
                          <strong>• 1ª Convocação:</strong> às {editalLocal.primeiraConvocacao}{' '}
                          horas (com quórum legal).
                        </p>
                        <p>
                          <strong>• 2ª Convocação:</strong> às {editalLocal.segundaConvocacao} horas
                          (com qualquer número de presentes).
                        </p>
                        <p>
                          <strong>• Local / Plataforma:</strong> {editalLocal.localTexto}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-sans">
                          Ordem do Dia / Pauta de Deliberações:
                        </h5>
                        <ol className="list-decimal list-inside space-y-1.5 pl-2">
                          {itensPauta.length > 0 ? (
                            itensPauta.map((it) => (
                              <li key={it.id} className="text-xs text-slate-800">
                                <strong>{it.titulo}</strong>
                                {it.texto && (
                                  <span className="text-slate-600 block pl-4 font-normal">
                                    {it.texto}
                                  </span>
                                )}
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-slate-500 italic">
                              Nenhum item de pauta adicionado ainda nesta deliberação.
                            </li>
                          )}
                        </ol>
                      </div>

                      <div className="space-y-2 pt-2">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-sans">
                          Disposições Gerais e Regras de Participação:
                        </h5>
                        <p className="text-justify leading-relaxed text-slate-700">
                          {editalLocal.disposicoesGerais}
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
                          <li>
                            Quórum de aprovação por matéria:{' '}
                            <strong>{deliberacaoAtiva.quorum_materia || 'Maioria simples'}</strong>.
                          </li>
                          <li>
                            Voto de condômino inadimplente:{' '}
                            <strong>
                              {deliberacaoAtiva.inadimplente_pode_votar ? 'Permitido' : 'Vedado'}
                            </strong>{' '}
                            (conforme convenção parametrizada).
                          </li>
                          <li>
                            Voto de locatário:{' '}
                            <strong>
                              {deliberacaoAtiva.locatario_pode_votar ? 'Permitido' : 'Vedado'}
                            </strong>
                            .
                          </li>
                          <li>
                            Modalidade de voto:{' '}
                            <strong>
                              {deliberacaoAtiva.tipo_cedula === 'secreta'
                                ? 'Cédula Secreta com criptografia SHA-256'
                                : 'Votação Aberta Nominal'}
                            </strong>
                            .
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Rodapé da Assinatura Eletrônica do Convocante */}
                    <div className="pt-8 border-t-2 border-slate-900 font-sans text-center space-y-2">
                      <div className="w-64 border-t border-slate-800 mx-auto pt-1" />
                      <p className="text-xs font-bold uppercase text-slate-900">
                        {editalLocal.sindicoNome || 'Síndico / Mesa Diretora'}
                      </p>
                      {editalLocal.sindicoCpf && (
                        <p className="text-[11px] text-slate-600 font-mono">
                          CPF: {editalLocal.sindicoCpf}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500">
                        Representante Legal do {nomeCondominio}
                      </p>

                      {/* Selo Criptográfico de Assinatura */}
                      {editalAssinadoHash && (
                        <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-left space-y-1 font-mono text-[10px]">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>DOCUMENTO ASSINADO DIGITALMENTE (SHA-256)</span>
                          </div>
                          <p className="text-slate-600 break-all">
                            <strong>Hash:</strong> {editalAssinadoHash}
                          </p>
                          <p className="text-slate-500">
                            <strong>Data/Hora do Carimbo:</strong>{' '}
                            {editalAssinadoData
                              ? new Date(editalAssinadoData).toLocaleString('pt-BR')
                              : 'Registrado'}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
              <p className="text-slate-500 text-sm">Nenhuma assembleia selecionada.</p>
            </div>
          )}
        </TabsContent>

        {/* ABA 2: DOCUMENTOS DA PAUTA */}
        <TabsContent value="documentos" className="space-y-6 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pauta Documental da Assembleia</h3>
              <p className="text-xs text-slate-500">
                Anexe propostas, convenções, prestações de contas e currículos de candidatos para
                consulta pública dos condôminos.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setModalUploadAberto(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9"
              disabled={!deliberacaoAtiva}
            >
              <UploadCloud className="h-4 w-4 mr-1.5" /> Anexar Novo Documento
            </Button>
          </div>

          {documentos.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-xl border border-dashed border-slate-300">
              <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-700">
                Nenhum documento anexado ainda
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Adicione a proposta de convenção, regimento interno ou relatórios financeiros para
                que os moradores visualizem inline.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalUploadAberto(true)}
                className="mt-4 text-xs"
              >
                Fazer Upload
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentos.map((doc) => {
                const url = getArquivoUrl(doc)
                const isPdf = doc.arquivo?.toLowerCase().endsWith('.pdf')
                return (
                  <Card
                    key={doc.id}
                    className="border-slate-200 shadow-xs flex flex-col justify-between"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                          {formatarTipoDoc(doc.tipo)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExcluirDoc(doc.id, doc.titulo)}
                          className="h-7 w-7 text-red-500 hover:bg-red-50"
                          title="Remover documento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <CardTitle className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">
                        {doc.titulo}
                      </CardTitle>
                      {doc.descricao && (
                        <CardDescription className="text-xs text-slate-600 line-clamp-2">
                          {doc.descricao}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-2 text-xs py-2">
                      {doc.tipo === 'curriculo_candidato' && (
                        <div className="p-2 rounded bg-cyan-50 border border-cyan-100 text-[11px] text-cyan-900">
                          <p>
                            <strong>Candidato:</strong> {doc.nome_candidato || '—'}
                          </p>
                          <p>
                            <strong>Cargo:</strong> {formatarCargo(doc.cargo_candidato)}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{doc.arquivo || 'Arquivo anexado'}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      {url ? (
                        <>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold py-1.5 px-3 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Visualizar
                          </a>
                          <a
                            href={url}
                            download
                            className="inline-flex items-center justify-center p-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800"
                            title="Baixar arquivo"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sem arquivo</span>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA 3: NOTIFICAÇÕES POR E-MAIL */}
        <TabsContent value="notificacoes" className="space-y-6 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Histórico de Notificações Eletrônicas
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe o status de entrega dos e-mails de convocação, avisos de credenciamento e
                publicação.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => deliberacaoAtiva && carregarDados(deliberacaoAtiva.id)}
              className="text-xs h-9 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar Status
            </Button>
          </div>

          {/* Cards de Métricas de Entrega */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block">Total Registradas</span>
              <span className="text-2xl font-bold text-slate-900">{notificacoes.length}</span>
            </Card>
            <Card className="p-4 border-emerald-200 bg-emerald-50/40">
              <span className="text-xs text-emerald-700 font-semibold block">
                Enviadas com Sucesso
              </span>
              <span className="text-2xl font-bold text-emerald-700">
                {notificacoes.filter((n) => n.status === 'enviada').length}
              </span>
            </Card>
            <Card className="p-4 border-red-200 bg-red-50/40">
              <span className="text-xs text-red-700 font-semibold block">Falhas de Envio</span>
              <span className="text-2xl font-bold text-red-700">
                {notificacoes.filter((n) => n.status === 'falha').length}
              </span>
            </Card>
          </div>

          {/* Tabela de Notificações */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Destinatário</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Assunto</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Data Envio</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notificacoes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                        Nenhuma notificação registrada para esta deliberação.
                      </td>
                    </tr>
                  ) : (
                    notificacoes.map((n) => (
                      <tr key={n.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-medium text-slate-900">{n.destinatario}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {n.tipo.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate" title={n.titulo}>
                          {n.titulo}
                        </td>
                        <td className="p-3">
                          <Badge
                            className={`text-[10px] uppercase ${
                              n.status === 'enviada'
                                ? 'bg-emerald-600 text-white'
                                : n.status === 'pendente'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-red-600 text-white'
                            }`}
                          >
                            {n.status}
                          </Badge>
                          {n.mensagem_erro && (
                            <span
                              className="block text-[10px] text-red-600 mt-0.5 truncate max-w-xs"
                              title={n.mensagem_erro}
                            >
                              {n.mensagem_erro}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500">
                          {n.enviada_em
                            ? new Date(n.enviada_em).toLocaleString('pt-BR')
                            : new Date(n.created).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3 text-right">
                          {n.status === 'falha' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReenviarNotificacao(n.id)}
                              className="text-[11px] h-7 px-2 border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Reenviar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Upload de Documento da Pauta */}
      <Dialog open={modalUploadAberto} onOpenChange={setModalUploadAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Anexar Documento à Pauta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Faça upload de arquivos PDF ou imagens (até 10MB) que compõem a pauta da assembleia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadDoc} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Tipo de Documento</Label>
              <Select
                value={tipoDoc}
                onValueChange={(val) => setTipoDoc(val as TipoDocumentoPauta)}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="convencao_proposta">Proposta de Convenção</SelectItem>
                  <SelectItem value="regimento_interno">Regimento Interno</SelectItem>
                  <SelectItem value="prestacao_contas">Prestação de Contas / Balancete</SelectItem>
                  <SelectItem value="curriculo_candidato">Currículo de Candidato</SelectItem>
                  <SelectItem value="edital">Edital de Convocação</SelectItem>
                  <SelectItem value="procuracao">Modelo de Procuração</SelectItem>
                  <SelectItem value="outro">Outro Documento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoDoc === 'curriculo_candidato' && (
              <div className="grid grid-cols-2 gap-2 p-2 rounded bg-slate-50 border border-slate-200">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Cargo Pretendido</Label>
                  <Select
                    value={cargoCandidato}
                    onValueChange={(val) => setCargoCandidato(val as CargoCandidato)}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sindico">Síndico(a)</SelectItem>
                      <SelectItem value="vice_sindico">Vice-Síndico(a)</SelectItem>
                      <SelectItem value="conselheiro_fiscal">Conselheiro Fiscal</SelectItem>
                      <SelectItem value="conselheiro_consultivo">Conselheiro Consultivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Nome do Candidato</Label>
                  <Input
                    type="text"
                    placeholder="Nome completo"
                    value={nomeCandidato}
                    onChange={(e) => setNomeCandidato(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Título de Exibição</Label>
              <Input
                type="text"
                placeholder="Ex: Minuta da Nova Convenção 2026"
                value={tituloDoc}
                onChange={(e) => setTituloDoc(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Descrição / Instruções aos Moradores</Label>
              <Textarea
                rows={2}
                placeholder="Breve resumo explicativo sobre o documento..."
                value={descricaoDoc}
                onChange={(e) => setDescricaoDoc(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-700">Arquivo (PDF ou Imagem - máx. 10MB)</Label>
              <Input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setArquivoFile(e.target.files[0])
                  }
                }}
                required
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalUploadAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                disabled={uploading}
              >
                {uploading ? 'Enviando...' : 'Confirmar Upload'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DocumentosEditalPage

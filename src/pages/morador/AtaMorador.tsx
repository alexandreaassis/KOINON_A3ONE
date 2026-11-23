import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type DeliberacaoRecord, type AtaAssembleiaRecord } from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { formatarCpf } from '@/lib/cpf'
import { BlocoAssinaturaCompacto } from '@/components/assinatura/BlocoAssinaturaCompacto'
import { SafeHtml } from '@/components/editor/SafeHtml'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
import { imprimirOuBaixarPdfAta } from '@/lib/pdfAta'
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
import {
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ExternalLink,
  Loader2,
} from 'lucide-react'

export const AtaMoradorPage: React.FC = () => {
  const { id: paramDelibId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { nomeCondominio, logoUrl } = useCondoConfig()

  const [deliberacoes, setDeliberacoes] = useState<DeliberacaoRecord[]>([])
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [ata, setAta] = useState<AtaAssembleiaRecord | null>(null)
  const [carregando, setCarregando] = useState(true)

  const carregarDados = async (delibId?: string) => {
    setCarregando(true)
    try {
      const delibs = await api.getDeliberacoes()
      setDeliberacoes(delibs)

      const delibAtual = delibId
        ? delibs.find((d) => d.id === delibId) || delibs[0]
        : paramDelibId
          ? delibs.find((d) => d.id === paramDelibId) || delibs[0]
          : delibs.find((d) => d.status === 'APURADA' || d.status === 'PUBLICADA') ||
            delibs.find((d) => d.status !== 'ENCERRADA') ||
            delibs[0]

      setDeliberacaoAtiva(delibAtual || null)

      if (delibAtual) {
        const ataSalva = await api.getAtaPorDeliberacao(delibAtual.id).catch(() => null)
        setAta(ataSalva)
      } else {
        setAta(null)
      }
    } catch (err) {
      console.error('Erro ao carregar ata para morador:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados(paramDelibId)
  }, [paramDelibId])

  const presNome =
    ata?.presidente_nome || deliberacaoAtiva?.mesa_presidente_nome || 'Presidente da Mesa'
  const presCpf = formatarCpf(ata?.presidente_cpf || deliberacaoAtiva?.mesa_presidente_cpf || '')
  const secNome =
    ata?.secretario_nome || deliberacaoAtiva?.mesa_secretario_nome || 'Secretário(a) da Mesa'
  const secCpf = formatarCpf(ata?.secretario_cpf || deliberacaoAtiva?.mesa_secretario_cpf || '')

  const dispararImpressao = () => {
    if (!deliberacaoAtiva) return
    imprimirOuBaixarPdfAta({
      nomeCondominio,
      logoUrl,
      titulo: ata?.titulo || `ATA DA ASSEMBLEIA GERAL — ${deliberacaoAtiva.titulo}`,
      subtitulo: 'Assembleia Geral de Condôminos • Documento Oficial',
      conteudoHtml: sanitizeHtml(ata?.conteudo_html || ''),
      status: ata?.status || 'rascunho',
      hashAta: ata?.hash_ata,
      hashRaizUrna: ata?.hash_raiz_urna || deliberacaoAtiva.hash_raiz,
      dataPublicacao: ata?.data_publicacao,

      presidenteNome: presNome,
      presidenteCpf: presCpf,
      presidenteFormato: ata?.presidente_formato,
      presidenteAssinaturaVisual: ata?.presidente_assinatura_visual,
      presidenteAssinaturaTexto: ata?.presidente_assinatura_texto,
      presidenteAssinadoEm: ata?.presidente_assinado_em,
      presidenteHash: ata?.presidente_hash,

      secretarioNome: secNome,
      secretarioCpf: secCpf,
      secretarioFormato: ata?.secretario_formato,
      secretarioAssinaturaVisual: ata?.secretario_assinatura_visual,
      secretarioAssinaturaTexto: ata?.secretario_assinatura_texto,
      secretarioAssinadoEm: ata?.secretario_assinado_em,
      secretarioHash: ata?.secretario_hash,
    })
  }

  if (carregando) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-700" />
          <p className="text-xs text-slate-600">Carregando Ata da Assembleia...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Topo com Seletor e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
              Área do Condômino
            </span>
            {ata?.status === 'publicada' ? (
              <Badge className="bg-emerald-600 text-white text-[10px] uppercase">
                Ata Homologada & Publicada
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-400 text-amber-700 text-[10px] uppercase"
              >
                Minuta em Elaboração pela Mesa
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-700" /> Ata da Assembleia Geral
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe o registro oficial das deliberações, apuração dos votos e assinaturas
            eletrônicas da mesa.
          </p>
        </div>

        {/* Seletor de Assembleia */}
        <div className="w-full sm:w-72 shrink-0">
          <Select value={deliberacaoAtiva?.id || ''} onValueChange={(val) => carregarDados(val)}>
            <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-300">
              <SelectValue placeholder="Selecione a assembleia" />
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
      </div>

      {deliberacaoAtiva ? (
        ata && ata.status === 'publicada' ? (
          <div className="space-y-4">
            {/* Barra de Ações para o Morador */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-600">
                Documento publicado em{' '}
                <strong>
                  {ata.data_publicacao
                    ? new Date(ata.data_publicacao).toLocaleString('pt-BR')
                    : 'data recente'}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={dispararImpressao}
                  className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-8 gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" /> Baixar PDF / Imprimir
                </Button>
              </div>
            </div>

            {/* Visualização da Ata no Formato Institucional A4 */}
            <article className="max-w-[850px] mx-auto bg-white border border-slate-300 shadow-md p-8 sm:p-12 rounded-lg font-serif leading-relaxed text-slate-900">
              {/* Cabeçalho */}
              <header className="border-b-2 border-slate-900 pb-4 mb-6 font-sans">
                <div className="flex items-center justify-between gap-4">
                  {logoUrl && (
                    <img src={logoUrl} alt={nomeCondominio} className="h-12 w-12 object-contain" />
                  )}
                  <div className="flex-1 text-center">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-800 block">
                      Ata de Assembleia e Deliberativa
                    </span>
                    <h1 className="text-lg font-bold text-slate-950 uppercase">{nomeCondominio}</h1>
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Assembleia Geral de Condôminos
                    </p>
                  </div>
                  <div className="text-right text-[11px] font-mono text-slate-600">
                    <span>Emissão:</span>
                    <br />
                    <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
                  </div>
                </div>
              </header>

              {/* Título da Ata */}
              <div className="text-center my-6 p-2 bg-slate-50 border border-slate-200 rounded font-sans">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-950">
                  {ata.titulo || `ATA DA ASSEMBLEIA — ${deliberacaoAtiva.titulo}`}
                </h2>
              </div>

              {/* Conteúdo HTML */}
              <div className="text-justify text-xs sm:text-[11pt] space-y-3 font-serif leading-relaxed">
                <SafeHtml content={sanitizeHtml(ata.conteudo_html || '')} />
              </div>

              {/* Bloco Criptográfico de Auditoria */}
              <div className="mt-8 p-3.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-mono text-slate-700 space-y-1 font-sans">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-700" />
                  CERTIFICAÇÃO E INTEGRIDADE CRIPTOGRÁFICA (SHA-256):
                </p>
                <p>
                  Hash Raiz da Urna:{' '}
                  {ata.hash_raiz_urna || deliberacaoAtiva.hash_raiz || 'Consolidado'}
                </p>
                {ata.hash_ata && (
                  <p className="break-all">Carimbo SHA-256 da Ata: {ata.hash_ata}</p>
                )}
                {ata.data_publicacao && (
                  <p>
                    Data de Publicação Oficial:{' '}
                    {new Date(ata.data_publicacao).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>

              {/* Bloco de Assinaturas da Mesa Diretora */}
              <footer className="mt-10 pt-4 border-t-2 border-slate-900 font-sans">
                <div className="grid grid-cols-2 gap-8 text-center pt-4">
                  <BlocoAssinaturaCompacto
                    nome={presNome}
                    cpf={presCpf}
                    cargo="Presidente da Assembleia"
                    formato={ata.presidente_formato || 'desenho'}
                    assinaturaVisual={ata.presidente_assinatura_visual}
                    assinaturaTexto={ata.presidente_assinatura_texto}
                    larguraLinha="w-60"
                  />

                  <BlocoAssinaturaCompacto
                    nome={secNome}
                    cpf={secCpf}
                    cargo="Secretário(a) da Assembleia"
                    formato={ata.secretario_formato || 'desenho'}
                    assinaturaVisual={ata.secretario_assinatura_visual}
                    assinaturaTexto={ata.secretario_assinatura_texto}
                    larguraLinha="w-60"
                  />
                </div>
              </footer>
            </article>
          </div>
        ) : (
          <Card className="border-slate-200 p-12 text-center bg-white shadow-xs">
            <div className="max-w-md mx-auto space-y-3">
              <Clock className="h-10 w-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                Ata da Assembleia em Fase de Lavratura e Assinatura
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                A ata da assembleia <strong>"{deliberacaoAtiva.titulo}"</strong> está sendo lavrada
                e assinada pela Mesa Diretora com auxílio de inteligência artificial.
              </p>
              <p className="text-xs text-slate-500">
                Assim que a mesa finalizar as assinaturas eletrônicas e homologar a publicação, o
                documento completo estará disponível para leitura e download em PDF nesta tela.
              </p>
            </div>
          </Card>
        )
      ) : (
        <Card className="border-slate-200 p-8 text-center">
          <p className="text-xs text-slate-500">Nenhuma assembleia selecionada.</p>
        </Card>
      )}
    </div>
  )
}

export default AtaMoradorPage

import React, { useState, useEffect } from 'react'
import {
  api,
  type DeliberacaoRecord,
  type DocumentoPautaRecord,
  type TipoDocumentoPauta,
  type CargoCandidato,
} from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import pb from '@/lib/pocketbase/client'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  FileText,
  Download,
  ExternalLink,
  Eye,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Vote,
  Sparkles,
} from 'lucide-react'

export const DocumentosAssembleiaMoradorPage: React.FC = () => {
  const { nomeCondominio } = useCondoConfig()
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [documentos, setDocumentos] = useState<DocumentoPautaRecord[]>([])
  const [carregando, setCarregando] = useState(true)

  // Visualização inline em modal
  const [docModal, setDocModal] = useState<DocumentoPautaRecord | null>(null)

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true)
      try {
        const delib = await api.getDeliberacaoAtiva()
        setDeliberacaoAtiva(delib)
        if (delib) {
          const docs = await api.getDocumentosPauta(delib.id)
          setDocumentos(docs)
        }
      } catch (err) {
        console.error('Erro ao carregar documentos da assembleia:', err)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

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
        return 'Documento da Pauta'
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
      {/* Cabeçalho */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-700" /> Documentos da Assembleia
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Consulte as minutas de convenção, prestações de contas, regimentos e currículos de
          candidatos em pauta no {nomeCondominio}.
        </p>
      </div>

      {deliberacaoAtiva ? (
        <div className="space-y-4">
          <Card className="border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xs">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 block">
                  Assembleia em Andamento
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{deliberacaoAtiva.titulo}</h3>
                {deliberacaoAtiva.descricao && (
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    {deliberacaoAtiva.descricao}
                  </p>
                )}
              </div>
              <Badge className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs shrink-0">
                {deliberacaoAtiva.status}
              </Badge>
            </CardContent>
          </Card>

          {/* Lista de Documentos */}
          {carregando ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Carregando documentos da pauta...
            </div>
          ) : documentos.length === 0 ? (
            <Card className="border-slate-200 p-8 text-center">
              <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-800">
                Nenhum documento anexado no momento
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                A mesa diretora ainda não disponibilizou arquivos complementares para esta
                assembleia.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentos.map((doc) => {
                const url = getArquivoUrl(doc)
                const isPdf = doc.arquivo?.toLowerCase().endsWith('.pdf')
                return (
                  <Card
                    key={doc.id}
                    className="border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all bg-white"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold uppercase text-cyan-800 border-cyan-300 bg-cyan-50"
                        >
                          {formatarTipoDoc(doc.tipo)}
                        </Badge>
                        {isPdf && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 uppercase">
                            PDF
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm font-bold text-slate-900 mt-2 line-clamp-2">
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
                        <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                          <p>
                            <strong>Candidato:</strong> {doc.nome_candidato || '—'}
                          </p>
                          <p>
                            <strong>Cargo:</strong> {formatarCargo(doc.cargo_candidato)}
                          </p>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      {url ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setDocModal(doc)}
                            className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-8 gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> Visualizar
                          </Button>
                          <a
                            href={url}
                            download
                            className="inline-flex items-center justify-center p-2 h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="Baixar cópia do documento"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Arquivo indisponível</span>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <Card className="border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-600">Não há assembleia ativa no momento.</p>
        </Card>
      )}

      {/* Modal de Visualização Inline do Arquivo */}
      <Dialog open={!!docModal} onOpenChange={(open) => !open && setDocModal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="pb-2 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {docModal?.titulo}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {docModal && formatarTipoDoc(docModal.tipo)} • {nomeCondominio}
                </DialogDescription>
              </div>

              {docModal && getArquivoUrl(docModal) && (
                <a
                  href={getArquivoUrl(docModal)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-cyan-700 font-semibold hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir em nova aba
                </a>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-[500px] w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
            {docModal && getArquivoUrl(docModal) ? (
              docModal.arquivo?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={getArquivoUrl(docModal)}
                  className="w-full h-[600px] border-0"
                  title={docModal.titulo}
                />
              ) : (
                <div className="p-4 flex items-center justify-center max-h-[600px] overflow-auto">
                  <img
                    src={getArquivoUrl(docModal)}
                    alt={docModal.titulo}
                    className="max-h-[550px] max-w-full object-contain rounded shadow-sm"
                  />
                </div>
              )
            ) : (
              <p className="text-xs text-slate-500">Arquivo não encontrado.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DocumentosAssembleiaMoradorPage

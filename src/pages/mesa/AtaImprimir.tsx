import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type DeliberacaoRecord, type AtaAssembleiaRecord } from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { formatarCpf } from '@/lib/cpf'
import { BlocoAssinaturaCompacto } from '@/components/assinatura/BlocoAssinaturaCompacto'
import { SafeHtml } from '@/components/editor/SafeHtml'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Printer, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react'

export const AtaImprimirPage: React.FC = () => {
  const { id: deliberacaoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { nomeCondominio, logoUrl } = useCondoConfig()

  const [deliberacao, setDeliberacao] = useState<DeliberacaoRecord | null>(null)
  const [ata, setAta] = useState<AtaAssembleiaRecord | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      if (!deliberacaoId) return
      setCarregando(true)
      try {
        const [delib, ataSalva] = await Promise.all([
          api.getDeliberacao(deliberacaoId),
          api.getAtaPorDeliberacao(deliberacaoId),
        ])
        setDeliberacao(delib)
        setAta(ataSalva)
      } catch (err) {
        console.error('Erro ao carregar ata para impressão:', err)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [deliberacaoId])

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-700" />
          <p className="text-xs text-slate-600">Preparando documento para impressão...</p>
        </div>
      </div>
    )
  }

  if (!deliberacao) {
    return (
      <div className="p-8 text-center">
        <p className="text-xs text-slate-500">Assembleia não encontrada.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/mesa/ata')}
          className="mt-4 text-xs"
        >
          Voltar para Ata da Assembleia
        </Button>
      </div>
    )
  }

  const tituloDocumento =
    ata?.titulo || `ATA DA ASSEMBLEIA GERAL ORDINÁRIA/EXTRAORDINÁRIA — ${deliberacao.titulo}`
  const conteudo = ata?.conteudo_html || '<p>Ata em fase de elaboração.</p>'

  const presNome = ata?.presidente_nome || deliberacao.mesa_presidente_nome || 'Presidente da Mesa'
  const presCpf = formatarCpf(ata?.presidente_cpf || deliberacao.mesa_presidente_cpf || '')
  const secNome =
    ata?.secretario_nome || deliberacao.mesa_secretario_nome || 'Secretário(a) da Mesa'
  const secCpf = formatarCpf(ata?.secretario_cpf || deliberacao.mesa_secretario_cpf || '')

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-slate-900">
      {/* Barra de Ação Superior (não impressa) */}
      <div className="max-w-[850px] mx-auto mb-4 px-4 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/mesa/ata')}
          className="text-xs h-8 gap-1.5 bg-white border-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Painel da Ata
        </Button>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs ${
              ata?.status === 'publicada'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                : ata?.status === 'assinada'
                  ? 'border-blue-500 text-blue-700 bg-blue-50'
                  : 'border-amber-500 text-amber-700 bg-amber-50'
            }`}
          >
            {ata?.status === 'publicada'
              ? 'Publicada'
              : ata?.status === 'assinada'
                ? 'Assinada'
                : 'Minuta / Rascunho'}
          </Badge>
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-8 gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir Documento (Ctrl+P)
          </Button>
        </div>
      </div>

      {/* Folha A4 Institucional */}
      <article className="max-w-[850px] mx-auto bg-white p-10 sm:p-14 border border-slate-300 print:border-none print:shadow-none shadow-sm rounded-lg print:rounded-none font-serif leading-relaxed">
        {/* Cabeçalho */}
        <header className="border-b-2 border-slate-900 pb-4 mb-6 font-sans">
          <div className="flex items-center justify-between gap-4">
            {logoUrl && (
              <img src={logoUrl} alt={nomeCondominio} className="h-14 w-14 object-contain" />
            )}
            <div className="flex-1 text-center">
              <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-800 block">
                Ata Notarial e Deliberativa
              </span>
              <h1 className="text-xl font-bold text-slate-950 uppercase">{nomeCondominio}</h1>
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
        <div className="text-center my-6 p-2.5 bg-slate-50 border border-slate-200 rounded font-sans">
          <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide text-slate-950">
            {tituloDocumento}
          </h2>
        </div>

        {/* Conteúdo HTML Sanitizado */}
        <div className="text-justify text-xs sm:text-[11pt] space-y-3 font-serif leading-relaxed">
          <SafeHtml content={sanitizeHtml(conteudo)} />
        </div>

        {/* Bloco de Integridade Criptográfica */}
        <div className="mt-8 p-3.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-mono text-slate-700 space-y-1 font-sans break-inside-avoid">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-cyan-700" />
            CERTIFICAÇÃO E INTEGRIDADE CRIPTOGRÁFICA (SHA-256):
          </p>
          <p>
            <strong>Hash Raiz da Urna Auditada:</strong>{' '}
            {ata?.hash_raiz_urna || deliberacao.hash_raiz || 'Consolidado no encerramento'}
          </p>
          {ata?.hash_ata && (
            <p className="break-all">
              <strong>Carimbo SHA-256 da Ata:</strong> {ata.hash_ata}
            </p>
          )}
          {ata?.data_publicacao && (
            <p>
              <strong>Data de Publicação Oficial:</strong>{' '}
              {new Date(ata.data_publicacao).toLocaleString('pt-BR')}
            </p>
          )}
        </div>

        {/* Bloco de Assinaturas da Mesa Diretora */}
        <footer className="mt-12 pt-4 border-t-2 border-slate-900 font-sans break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center pt-4">
            <BlocoAssinaturaCompacto
              nome={presNome}
              cpf={presCpf}
              cargo="Presidente da Assembleia"
              formato={ata?.presidente_formato || 'desenho'}
              assinaturaVisual={ata?.presidente_assinatura_visual}
              assinaturaTexto={ata?.presidente_assinatura_texto}
              larguraLinha="w-60"
            />

            <BlocoAssinaturaCompacto
              nome={secNome}
              cpf={secCpf}
              cargo="Secretário(a) da Assembleia"
              formato={ata?.secretario_formato || 'desenho'}
              assinaturaVisual={ata?.secretario_assinatura_visual}
              assinaturaTexto={ata?.secretario_assinatura_texto}
              larguraLinha="w-60"
            />
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[9px] text-slate-500 font-sans">
            Documento emitido eletronicamente pela Plataforma Indaba de Governança Condominial sob
            os rigores do Código Civil Brasileiro.
          </div>
        </footer>
      </article>
    </div>
  )
}

export default AtaImprimirPage

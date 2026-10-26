import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  api,
  type DeliberacaoRecord,
  type ApuracaoResponse,
  type ApuracaoItemResult,
  type AssinaturaDocumentoRecord,
  type FormatoAssinatura,
} from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { useAuth } from '@/context/AuthContext'
import { formatarCpf } from '@/lib/cpf'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { BlocoAssinaturaCompacto } from '@/components/assinatura/BlocoAssinaturaCompacto'
import { ModalAssinaturaEletronica } from '@/components/assinatura/ModalAssinaturaEletronica'
import { Printer, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react'

export const InformativoDeliberacoesPage: React.FC = () => {
  const { deliberacaoId } = useParams<{ deliberacaoId: string }>()
  const navigate = useNavigate()
  const { nomeCondominio, logoUrl } = useCondoConfig()
  const { user } = useAuth()

  const [deliberacao, setDeliberacao] = useState<DeliberacaoRecord | null>(null)
  const [apuracao, setApuracao] = useState<ApuracaoResponse['apuracao'] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Assinaturas da Mesa Diretora
  const [assinaturaPresidente, setAssinaturaPresidente] =
    useState<AssinaturaDocumentoRecord | null>(null)
  const [assinaturaSecretario, setAssinaturaSecretario] =
    useState<AssinaturaDocumentoRecord | null>(null)
  const [modalAssinaturaMesa, setModalAssinaturaMesa] = useState<
    'mesa_presidente' | 'mesa_secretario' | null
  >(null)
  const [salvandoMesa, setSalvandoMesa] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true)
      try {
        let dId = deliberacaoId
        if (!dId) {
          const ativa = await api.getDeliberacaoAtiva()
          dId = ativa?.id
        }

        if (!dId) {
          setErro('Nenhuma assembleia encontrada.')
          setCarregando(false)
          return
        }

        const [delib, apResp, assinaturasDoc] = await Promise.all([
          api.getDeliberacao(dId),
          api.getApuracao(dId),
          api.getAssinaturasPorDeliberacao(dId).catch(() => [] as AssinaturaDocumentoRecord[]),
        ])

        setDeliberacao(delib)
        setApuracao(apResp.apuracao)

        const docIdInformativo = `informativo_${dId}`
        const presMesa = assinaturasDoc.find(
          (a) =>
            (a.documento_id === docIdInformativo || a.documento_tipo === 'informativo') &&
            a.tipo === 'mesa_presidente' &&
            a.status === 'valida',
        )
        const secMesa = assinaturasDoc.find(
          (a) =>
            (a.documento_id === docIdInformativo || a.documento_tipo === 'informativo') &&
            a.tipo === 'mesa_secretario' &&
            a.status === 'valida',
        )
        setAssinaturaPresidente(presMesa || null)
        setAssinaturaSecretario(secMesa || null)
      } catch (err: any) {
        console.error('Erro ao carregar informativo:', err)
        setErro(err?.message || 'Falha ao processar apuração para o informativo.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [deliberacaoId])

  // Hash SHA-256 no browser
  const calcularSha256 = async (texto: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(texto)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Assinar como Mesa Diretora (Presidente ou Secretário)
  const handleConfirmarAssinaturaMesa = async (dados: {
    nome: string
    cpf: string
    cargo?: string
    formato: FormatoAssinatura
    assinaturaVisual?: string
    assinaturaTexto?: string
  }) => {
    if (!deliberacao || !modalAssinaturaMesa) return

    setSalvandoMesa(true)
    try {
      const dataHoraIso = new Date().toISOString()
      const docId = `informativo_${deliberacao.id}`

      const payloadHash = JSON.stringify({
        deliberacaoId: deliberacao.id,
        tipoDocumento: 'informativo',
        cargoMesa: modalAssinaturaMesa,
        nome: dados.nome,
        cpf: dados.cpf,
        totalMatérias: apuracao?.itens.length || 0,
        momentoAssinatura: dataHoraIso,
      })

      const hash = await calcularSha256(payloadHash)

      const reg = await api.registrarAssinaturaDocumento({
        documento_id: docId,
        documento_tipo: 'informativo',
        deliberacao: deliberacao.id,
        assinante_nome: dados.nome,
        assinante_cpf: dados.cpf,
        tipo: modalAssinaturaMesa,
        hash_documento: hash,
        data_hora: dataHoraIso,
        usuario: user?.id,
        ip_dispositivo: navigator.userAgent,
        formato_assinatura: dados.formato,
        assinatura_visual: dados.assinaturaVisual,
        assinatura_texto: dados.assinaturaTexto,
      })

      if (modalAssinaturaMesa === 'mesa_presidente') {
        setAssinaturaPresidente(reg)
      } else {
        setAssinaturaSecretario(reg)
      }

      await api.registrarEventoAuditoria({
        evento: 'assinatura_registrada',
        fator: `Mesa Diretora: ${dados.nome} assinou o Informativo de Deliberações (${modalAssinaturaMesa}) com modo ${dados.formato}`,
        dispositivo: navigator.userAgent,
      })

      setModalAssinaturaMesa(null)
      toast({
        title: 'Assinatura do informativo registrada',
        description: `Carimbo SHA-256 gerado: ${hash.substring(0, 16)}...`,
      })
    } catch (err: any) {
      const isRede =
        !err?.status ||
        err?.status === 0 ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError')
      const msg = isRede
        ? 'Falha de conexão com o servidor. O traço da sua assinatura foi preservado — clique em "Confirmar e Assinar" novamente.'
        : err?.message || 'Falha ao registrar assinatura eletrônica.'
      toast({
        title: 'Erro ao registrar assinatura',
        description: msg,
        variant: 'destructive',
      })
      throw err
    } finally {
      setSalvandoMesa(false)
    }
  }

  const julgarResultado = (item: ApuracaoItemResult) => {
    const fav = item.votos.favoravel || 0
    const cont = item.votos.contrario || 0
    if (fav > cont)
      return { status: 'APROVADA', cor: 'text-emerald-700 bg-emerald-50 border-emerald-300' }
    if (cont > fav) return { status: 'REPROVADA', cor: 'text-red-700 bg-red-50 border-red-300' }
    return { status: 'EMPATE', cor: 'text-amber-700 bg-amber-50 border-amber-300' }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 text-sm">
        Carregando Informativo de Deliberações...
      </div>
    )
  }

  if (erro || !deliberacao || !apuracao) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-600 mb-2" />
        <h2 className="text-lg font-bold text-slate-900">Informativo Indisponível</h2>
        <p className="text-xs text-slate-600 mt-1 max-w-md">{erro || 'Dados não localizados.'}</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="mt-4 text-xs">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:p-0 print:bg-white text-slate-900">
      {/* Barra Superior de Ações (Oculta na impressão) */}
      <div className="max-w-[850px] mx-auto mb-6 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-xs gap-1.5 bg-white border-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Painel
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir Documento A4
          </Button>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL A4 */}
      <article className="max-w-[850px] mx-auto bg-white border border-slate-300 shadow-md print:shadow-none print:border-none p-8 sm:p-10 rounded-lg print:p-0 font-serif leading-relaxed">
        {/* Cabeçalho */}
        <header className="border-b-2 border-slate-900 pb-4 mb-6 font-sans">
          <div className="flex items-center justify-between gap-4">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={nomeCondominio}
                className="h-12 w-12 object-contain print:h-10 print:w-10"
              />
            )}
            <div className="flex-1 text-center">
              <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-800 block">
                Comunicação Oficial aos Condôminos
              </span>
              <h1 className="text-lg font-bold text-slate-950 uppercase">{nomeCondominio}</h1>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                INFORMATIVO OFICIAL DE DELIBERAÇÕES DA ASSEMBLEIA
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-slate-600">
              <span>Emissão:</span>
              <br />
              <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
            </div>
          </div>

          <div className="mt-3 p-2 bg-slate-100 rounded text-xs text-slate-800 flex items-center justify-between font-mono">
            <span>
              <strong>Assembleia:</strong> {deliberacao.titulo}
            </span>
            <span>
              <strong>Status:</strong> {deliberacao.status}
            </span>
          </div>
        </header>

        {/* Resumo da Participação */}
        <section className="font-sans text-xs mb-6 p-4 bg-slate-50 border border-slate-200 rounded-md">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-2">
            Quórum de Instalação e Participação Eleitoral
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">
                Total de Comparecimentos:
              </span>
              <strong className="text-sm text-slate-900">
                {apuracao.totalComparecimentos} unidades
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">
                Presencial:
              </span>
              <strong className="text-sm text-emerald-700">
                {apuracao.presencas?.presencial || 0}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">
                Remoto / Online:
              </span>
              <strong className="text-sm text-cyan-700">{apuracao.presencas?.remoto || 0}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">
                Total de Cédulas:
              </span>
              <strong className="text-sm text-slate-900">{apuracao.totalCedulas}</strong>
            </div>
          </div>
        </section>

        {/* Quadro Detalhado de Deliberações */}
        <section className="space-y-4 mb-8">
          <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            Resultado das Matérias Submetidas à Votação
          </h3>

          {apuracao.itens.map((item) => {
            const resultado = julgarResultado(item)
            const total = item.votos.total || 1
            const percFav = ((item.votos.favoravel / total) * 100).toFixed(1)
            const percCont = ((item.votos.contrario / total) * 100).toFixed(1)
            const percAbs = ((item.votos.abstencao / total) * 100).toFixed(1)

            return (
              <div
                key={item.id}
                className="border border-slate-300 rounded-md p-4 bg-white break-inside-avoid space-y-3 font-sans text-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Item {item.ordem} da Pauta
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 font-serif">{item.titulo}</h4>
                    {item.texto && (
                      <p className="text-xs text-slate-600 mt-0.5 font-normal">{item.texto}</p>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold border uppercase tracking-wider shrink-0 ${resultado.cor}`}
                  >
                    {resultado.status}
                  </span>
                </div>

                {/* Tabela de Votos */}
                <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-slate-200">
                  <div className="p-2 rounded bg-emerald-50/50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 uppercase font-semibold block">
                      Favoráveis
                    </span>
                    <span className="text-sm font-bold text-emerald-800">
                      {item.votos.favoravel}
                    </span>
                    <span className="text-[10px] text-slate-500 block">({percFav}%)</span>
                  </div>

                  <div className="p-2 rounded bg-red-50/50 border border-red-100">
                    <span className="text-[10px] text-red-800 uppercase font-semibold block">
                      Contrários
                    </span>
                    <span className="text-sm font-bold text-red-800">{item.votos.contrario}</span>
                    <span className="text-[10px] text-slate-500 block">({percCont}%)</span>
                  </div>

                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-700 uppercase font-semibold block">
                      Abstenções
                    </span>
                    <span className="text-sm font-bold text-slate-700">{item.votos.abstencao}</span>
                    <span className="text-[10px] text-slate-500 block">({percAbs}%)</span>
                  </div>

                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-700 uppercase font-semibold block">
                      Total de Votos
                    </span>
                    <span className="text-sm font-bold text-slate-900">{item.votos.total}</span>
                    <span className="text-[10px] text-slate-500 block">(100%)</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 italic">
                  Quórum aplicável:{' '}
                  <strong>
                    {item.quorum_aplicavel || deliberacao.quorum_materia || 'Maioria simples'}
                  </strong>
                </div>
              </div>
            )
          })}
        </section>

        {/* Rodapé com Assinaturas da Mesa Diretora e Declaração LGPD */}
        <footer className="mt-8 pt-4 border-t-2 border-slate-900 font-sans break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center pt-6 pb-2">
            {/* Presidente */}
            <div className="flex flex-col items-center">
              <BlocoAssinaturaCompacto
                nome={deliberacao.mesa_presidente_nome || 'Presidente da Mesa Diretora'}
                cpf={deliberacao.mesa_presidente_cpf}
                cargo="Presidente da Assembleia"
                formato={assinaturaPresidente?.formato_assinatura || 'em_branco'}
                assinaturaVisual={assinaturaPresidente?.assinatura_visual}
                assinaturaTexto={assinaturaPresidente?.assinatura_texto}
                larguraLinha="w-60"
              />
              <div className="mt-1 print:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalAssinaturaMesa('mesa_presidente')}
                  className="h-6 text-[10px] px-2 text-slate-700 border-slate-300 gap-1"
                >
                  <ShieldCheck className="h-3 w-3 text-cyan-700" />
                  {assinaturaPresidente ? 'Reassinar como Presidente' : 'Assinar como Presidente'}
                </Button>
              </div>
            </div>

            {/* Secretário */}
            <div className="flex flex-col items-center">
              <BlocoAssinaturaCompacto
                nome={deliberacao.mesa_secretario_nome || 'Secretário(a) da Mesa'}
                cpf={deliberacao.mesa_secretario_cpf}
                cargo="Secretário(a) dos Trabalhos"
                formato={assinaturaSecretario?.formato_assinatura || 'em_branco'}
                assinaturaVisual={assinaturaSecretario?.assinatura_visual}
                assinaturaTexto={assinaturaSecretario?.assinatura_texto}
                larguraLinha="w-60"
              />
              <div className="mt-1 print:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalAssinaturaMesa('mesa_secretario')}
                  className="h-6 text-[10px] px-2 text-slate-700 border-slate-300 gap-1"
                >
                  <ShieldCheck className="h-3 w-3 text-cyan-700" />
                  {assinaturaSecretario ? 'Reassinar como Secretário' : 'Assinar como Secretário'}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-0.5">
            <p>Informativo emitido pelo sistema de votação eletrônica {nomeCondominio}.</p>
            <p className="text-slate-400 text-[9px]">
              Apuração auditada com integridade criptográfica SHA-256 (Hash Raiz:{' '}
              {deliberacao.hash_raiz || 'Em consolidação'}).
            </p>
          </div>
        </footer>
      </article>

      {/* Modal Reutilizável de Assinatura Eletrônica da Mesa */}
      {modalAssinaturaMesa && (
        <ModalAssinaturaEletronica
          aberto={!!modalAssinaturaMesa}
          onOpenChange={(ab) => !ab && setModalAssinaturaMesa(null)}
          tituloDocumento="Informativo de Deliberações"
          subtitulo={`Assinatura da Mesa Diretora como ${
            modalAssinaturaMesa === 'mesa_presidente' ? 'Presidente' : 'Secretário(a)'
          } dos trabalhos`}
          nomeInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? deliberacao.mesa_presidente_nome || ''
              : deliberacao.mesa_secretario_nome || ''
          }
          cpfInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? deliberacao.mesa_presidente_cpf || ''
              : deliberacao.mesa_secretario_cpf || ''
          }
          cargoInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? 'Presidente da Mesa Diretora'
              : 'Secretário(a) dos Trabalhos'
          }
          formatoInicial={
            (modalAssinaturaMesa === 'mesa_presidente'
              ? assinaturaPresidente?.formato_assinatura
              : assinaturaSecretario?.formato_assinatura) || 'desenho'
          }
          assinaturaVisualInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? assinaturaPresidente?.assinatura_visual
              : assinaturaSecretario?.assinatura_visual
          }
          assinaturaTextoInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? assinaturaPresidente?.assinatura_texto
              : assinaturaSecretario?.assinatura_texto
          }
          salvando={salvandoMesa}
          onConfirmar={handleConfirmarAssinaturaMesa}
        />
      )}
    </div>
  )
}

export default InformativoDeliberacoesPage

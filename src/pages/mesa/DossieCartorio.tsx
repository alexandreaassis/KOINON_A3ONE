import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  api,
  type DeliberacaoRecord,
  type ItemPautaRecord,
  type UnidadeRecord,
  type PresencaAssinaturaRecord,
  type ApuracaoResponse,
  type ApuracaoItemResult,
  type DocumentoPautaRecord,
  type AssinaturaDocumentoRecord,
  type FormatoAssinatura,
} from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { useAuth } from '@/context/AuthContext'
import { formatarCpf } from '@/lib/cpf'
import { SafeHtml } from '@/components/editor/SafeHtml'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { BlocoAssinaturaCompacto } from '@/components/assinatura/BlocoAssinaturaCompacto'
import { ModalAssinaturaEletronica } from '@/components/assinatura/ModalAssinaturaEletronica'
import {
  Printer,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  FolderArchive,
} from 'lucide-react'

export const DossieCartorioPage: React.FC = () => {
  const { deliberacaoId } = useParams<{ deliberacaoId: string }>()
  const navigate = useNavigate()
  const { nomeCondominio, logoUrl, rotuloUnidade } = useCondoConfig()
  const { user } = useAuth()

  const [deliberacao, setDeliberacao] = useState<DeliberacaoRecord | null>(null)
  const [itensPauta, setItensPauta] = useState<ItemPautaRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [presencas, setPresencas] = useState<PresencaAssinaturaRecord[]>([])
  const [apuracao, setApuracao] = useState<ApuracaoResponse['apuracao'] | null>(null)
  const [assinaturas, setAssinaturas] = useState<AssinaturaDocumentoRecord[]>([])
  const [editalPersonalizado, setEditalPersonalizado] = useState<any | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Assinaturas de Encerramento da Mesa Diretora no Dossiê
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

        const [delib, itens, unids, presList, apResp, assList, edital] = await Promise.all([
          api.getDeliberacao(dId),
          api.getItensPauta(dId),
          api.getUnidades(),
          api.getPresencasAssinatura(dId),
          api.getApuracao(dId),
          api.getAssinaturasPorDeliberacao(dId),
          api.getEditalPorDeliberacao(dId).catch(() => null),
        ])

        setDeliberacao(delib)
        setItensPauta(itens)
        setUnidades(unids)
        setPresencas(presList)
        setApuracao(apResp.apuracao)
        setAssinaturas(assList)
        setEditalPersonalizado(edital)

        // Registrar auditoria da geração do dossiê
        await api.registrarEventoAuditoria({
          evento: 'dossie_gerado',
          fator: `Dossiê completo para cartório gerado da deliberação ${dId}`,
          dispositivo: navigator.userAgent,
        })
      } catch (err: any) {
        console.error('Erro ao montar dossiê do cartório:', err)
        setErro(err?.message || 'Falha ao processar dados do dossiê.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [deliberacaoId])

  const julgarItem = (item: ApuracaoItemResult) => {
    const fav = item.votos.favoravel || 0
    const cont = item.votos.contrario || 0
    if (fav > cont)
      return { status: 'APROVADA', cor: 'text-emerald-800 bg-emerald-50 border-emerald-300' }
    if (cont > fav) return { status: 'REPROVADA', cor: 'text-red-800 bg-red-50 border-red-300' }
    return { status: 'EMPATE', cor: 'text-amber-800 bg-amber-50 border-amber-300' }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 text-sm">
        Compilando Dossiê Completo para Cartório...
      </div>
    )
  }

  if (erro || !deliberacao || !apuracao) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-600 mb-2" />
        <h2 className="text-lg font-bold text-slate-900">Dossiê Indisponível</h2>
        <p className="text-xs text-slate-600 mt-1 max-w-md">{erro || 'Dados não localizados.'}</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="mt-4 text-xs">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
        </Button>
      </div>
    )
  }

  const mapaPresencas = new Map<string, PresencaAssinaturaRecord>()
  presencas.forEach((p) => mapaPresencas.set(p.unidade, p))

  const editalAssinado = assinaturas.find(
    (a) => a.documento_tipo === 'edital' && a.status === 'valida',
  )
  const totalPresentes = presencas.length

  const docIdDossie = deliberacao ? `dossie_${deliberacao.id}` : ''
  const assinaturaPresidenteDossie = assinaturas.find(
    (a) =>
      (a.documento_id === docIdDossie || a.documento_tipo === 'dossie_encerramento') &&
      a.tipo === 'mesa_presidente' &&
      a.status === 'valida',
  )
  const assinaturaSecretarioDossie = assinaturas.find(
    (a) =>
      (a.documento_id === docIdDossie || a.documento_tipo === 'dossie_encerramento') &&
      a.tipo === 'mesa_secretario' &&
      a.status === 'valida',
  )

  // Hash SHA-256 no browser
  const calcularSha256 = async (texto: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(texto)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Assinar termo de encerramento do dossiê
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
      const docId = `dossie_${deliberacao.id}`

      const payloadHash = JSON.stringify({
        deliberacaoId: deliberacao.id,
        tipoDocumento: 'dossie_encerramento',
        cargoMesa: modalAssinaturaMesa,
        nome: dados.nome,
        cpf: dados.cpf,
        totalPresentes,
        hashRaiz: deliberacao.hash_raiz || '',
        momentoAssinatura: dataHoraIso,
      })

      const hash = await calcularSha256(payloadHash)

      const reg = await api.registrarAssinaturaDocumento({
        documento_id: docId,
        documento_tipo: 'dossie_encerramento',
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

      setAssinaturas((antigas) => [reg, ...antigas])

      await api.registrarEventoAuditoria({
        evento: 'assinatura_registrada',
        fator: `Mesa Diretora: ${dados.nome} assinou o Termo de Encerramento do Dossiê (${modalAssinaturaMesa}) com modo ${dados.formato}`,
        dispositivo: navigator.userAgent,
      })

      setModalAssinaturaMesa(null)
      toast({
        title: 'Assinatura do dossiê registrada',
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
        title: 'Erro ao registrar assinatura no dossiê',
        description: msg,
        variant: 'destructive',
      })
      throw err
    } finally {
      setSalvandoMesa(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:p-0 print:bg-white text-slate-900 font-serif leading-relaxed">
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
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Salvar em PDF / Imprimir Dossiê
          </Button>
        </div>
      </div>

      {/* DOCUMENTO PRINCIPAL COM QUEBRAS DE PÁGINA */}
      <div className="max-w-[850px] mx-auto space-y-8 print:space-y-0">
        {/* ========================================================= */}
        {/* SEÇÃO 1: CAPA DO DOSSIÊ PARA CARTÓRIO (PÁGINA 1) */}
        {/* ========================================================= */}
        <section className="bg-white border border-slate-300 shadow-md print:shadow-none print:border-none p-10 min-h-[950px] flex flex-col justify-between print:min-h-screen print:page-break-after-always">
          {/* Topo Capa */}
          <div className="text-center font-sans border-b-2 border-slate-900 pb-6 pt-4">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={nomeCondominio}
                className="h-16 w-16 object-contain mx-auto mb-3"
              />
            )}
            <span className="text-[11px] uppercase tracking-widest text-cyan-800 font-bold block">
              República Federativa do Brasil • Registro de Títulos e Documentos / RCPJ
            </span>
            <h1 className="text-2xl font-bold uppercase text-slate-950 mt-1">{nomeCondominio}</h1>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Dossiê Notarial e Probatório de Assembleia Geral Extraordinária / Ordinária
            </p>
          </div>

          {/* Miolo Capa */}
          <div className="my-auto py-8 text-center space-y-6">
            <div className="p-6 bg-slate-50 border border-slate-300 rounded-lg max-w-xl mx-auto space-y-3 font-sans">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                Identificação do Ato Notificado
              </span>
              <h2 className="text-xl font-bold text-slate-900 font-serif uppercase">
                {deliberacao.titulo}
              </h2>
              {deliberacao.descricao && (
                <p className="text-xs text-slate-600 italic">{deliberacao.descricao}</p>
              )}
              <div className="pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-1">
                <p>
                  <strong>Data de Instalação:</strong>{' '}
                  {deliberacao.data_abertura
                    ? new Date(deliberacao.data_abertura).toLocaleDateString('pt-BR')
                    : 'Conforme Edital'}
                </p>
                <p>
                  <strong>Total de Unidades Cadastradas:</strong> {unidades.length} unidades
                </p>
                <p>
                  <strong>Quórum de Participação:</strong> {totalPresentes} unidades (
                  {((totalPresentes / (unidades.length || 1)) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>

            {/* Sumário do Dossiê */}
            <div className="max-w-md mx-auto text-left font-sans text-xs space-y-2 bg-white p-4 border border-slate-200 rounded">
              <h4 className="font-bold uppercase tracking-wider text-slate-800 text-[11px] border-b pb-1">
                Composição Notarial Deste Dossiê:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                <li>Edital de Convocação com Assinatura do Síndico e Carimbo SHA-256</li>
                <li>Lista Oficial de Presença com Assinaturas e Indicadores de Procuração</li>
                <li>Boletim Oficial de Urna Eletrônica com Raiz Criptográfica</li>
                <li>Informativo Oficial de Deliberações Aprovadas e Escrutínio</li>
                <li>Termo de Encerramento e Assinaturas Finais da Mesa Diretora</li>
              </ol>
            </div>
          </div>

          {/* Rodapé Capa */}
          <div className="border-t-2 border-slate-900 pt-4 text-center font-sans text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">
              Emitido via Plataforma Indaba de Votação e Governança Condominial
            </p>
            <p className="text-[10px] text-slate-500">
              Assinaturas digitais conferidas por carimbo hash SHA-256. Registro para arquivamento e
              publicidade perante o Cartório Competente.
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SEÇÃO 2: EDITAL DE CONVOCAÇÃO (PÁGINA 2) */}
        {/* ========================================================= */}
        <section className="bg-white border border-slate-300 shadow-md print:shadow-none print:border-none p-10 min-h-[950px] print:min-h-screen print:page-break-after-always">
          <header className="border-b-2 border-slate-900 pb-3 mb-6 font-sans flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
                Peça 1 do Dossiê
              </span>
              <h3 className="text-base font-bold uppercase text-slate-900">Edital de Convocação</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">{nomeCondominio}</span>
          </header>

          <div className="space-y-4 text-xs font-sans text-justify leading-relaxed">
            {editalPersonalizado?.texto_abertura ? (
              <SafeHtml content={editalPersonalizado.texto_abertura} />
            ) : (
              <p>
                O Síndico e a Mesa Diretora do <strong>{nomeCondominio}</strong>, no cumprimento dos
                deveres dispostos no art. 1.350 da Lei Federal 10.406/2002 e nas disposições da
                Convenção Condominial, <strong>CONVOCARAM</strong> os senhores condôminos titulares
                de unidades autônomas para se reunirem em Assembleia Geral:
              </p>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
              <p>
                <strong>Título da Assembleia:</strong> {deliberacao.titulo}
              </p>
              <p>
                <strong>Regras parametrizadas da convenção:</strong> Inadimplente:{' '}
                {deliberacao.inadimplente_pode_votar ? 'Pode votar' : 'Impedido'} | Locatário:{' '}
                {deliberacao.locatario_pode_votar ? 'Pode votar' : 'Impedido'} | Modalidade:{' '}
                {deliberacao.tipo_cedula === 'secreta'
                  ? 'Cédula Secreta'
                  : 'Votação Nominal Aberta'}
              </p>
              <p>
                <strong>Quórum Geral:</strong> {deliberacao.quorum_materia || 'Maioria simples'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <h5 className="font-bold text-xs uppercase text-slate-900">Pauta da Assembleia:</h5>
              {editalPersonalizado?.ordem_dia_custom &&
              editalPersonalizado.ordem_dia_custom.trim().length > 0 ? (
                <div className="pl-2">
                  <SafeHtml content={editalPersonalizado.ordem_dia_custom} />
                </div>
              ) : (
                <ol className="list-decimal list-inside space-y-1 pl-2">
                  {itensPauta.map((it) => (
                    <li key={it.id}>
                      <strong>{it.titulo}</strong>
                      {it.texto && (
                        <span className="text-slate-600 block pl-4 font-normal">{it.texto}</span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Disposições Gerais no Dossiê se houver */}
            {editalPersonalizado?.disposicoes_gerais && (
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <h5 className="font-bold text-xs uppercase text-slate-900">Disposições Gerais:</h5>
                <SafeHtml content={editalPersonalizado.disposicoes_gerais} />
              </div>
            )}

            {/* Regras Regimentais se houver */}
            {editalPersonalizado?.regras_participacao && (
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <h5 className="font-bold text-xs uppercase text-slate-900">
                  Regras de Participação:
                </h5>
                <SafeHtml content={editalPersonalizado.regras_participacao} />
              </div>
            )}

            {/* Assinatura do Convocante no Edital */}
            <div className="pt-10 font-sans text-center">
              <div className="flex flex-col items-center">
                <BlocoAssinaturaCompacto
                  nome={
                    editalPersonalizado?.sindico_nome ||
                    editalAssinado?.assinante_nome ||
                    deliberacao.mesa_presidente_nome ||
                    'Síndico / Convocante'
                  }
                  cpf={
                    editalPersonalizado?.sindico_cpf ||
                    editalAssinado?.assinante_cpf ||
                    deliberacao.mesa_presidente_cpf ||
                    ''
                  }
                  cargo={
                    editalPersonalizado?.cargo_convocante ||
                    `Representante Legal do ${nomeCondominio}`
                  }
                  formato={
                    editalPersonalizado?.formato_assinatura ||
                    editalAssinado?.formato_assinatura ||
                    'em_branco'
                  }
                  assinaturaVisual={
                    editalPersonalizado?.assinatura_visual || editalAssinado?.assinatura_visual
                  }
                  assinaturaTexto={
                    editalPersonalizado?.assinatura_texto || editalAssinado?.assinatura_texto
                  }
                  larguraLinha="w-64"
                />
              </div>

              {editalAssinado ? (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-[10px] font-mono text-left space-y-0.5 rounded max-w-lg mx-auto">
                  <span className="font-bold text-emerald-800 block">
                    ✓ EDITAL HOMOLOGADO E ASSINADO ELETRONICAMENTE (SHA-256)
                  </span>
                  <span className="break-all text-slate-600 block">
                    <strong>Hash:</strong> {editalAssinado.hash_documento}
                  </span>
                  <span className="text-slate-500 block">
                    <strong>Carimbo:</strong>{' '}
                    {editalAssinado.data_hora
                      ? new Date(editalAssinado.data_hora).toLocaleString('pt-BR')
                      : ''}
                  </span>
                </div>
              ) : (
                <div className="mt-2 text-[10px] text-slate-400 italic">
                  Assinado eletronicamente no sistema no ato de abertura da assembleia.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SEÇÃO 3: LISTA OFICIAL DE PRESENÇA (PÁGINA 3) */}
        {/* ========================================================= */}
        <section className="bg-white border border-slate-300 shadow-md print:shadow-none print:border-none p-10 min-h-[950px] print:min-h-screen print:page-break-after-always">
          <header className="border-b-2 border-slate-900 pb-3 mb-6 font-sans flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
                Peça 2 do Dossiê
              </span>
              <h3 className="text-base font-bold uppercase text-slate-900">
                Lista Oficial de Presença e Representação
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-600">
              Presentes: {totalPresentes} de {unidades.length}
            </span>
          </header>

          <table className="w-full text-left border-collapse border border-slate-300 font-sans text-[11px]">
            <thead>
              <tr className="bg-slate-200 font-bold border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 w-20 text-center">Unidade</th>
                <th className="p-2 border-r border-slate-300">Titular / Representante</th>
                <th className="p-2 border-r border-slate-300 w-24 text-center">Forma</th>
                <th className="p-2 border-r border-slate-300">Procurador (se houver)</th>
                <th className="p-2 text-center w-40">Assinatura SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {unidades.map((u) => {
                const pres = mapaPresencas.get(u.id)
                return (
                  <tr key={u.id} className={pres ? 'bg-white' : 'bg-slate-50 text-slate-400'}>
                    <td className="p-1.5 border-r border-slate-300 font-bold text-center">
                      {u.tipo_unidade || rotuloUnidade} {u.identificador}
                    </td>
                    <td className="p-1.5 border-r border-slate-300">
                      {pres ? (
                        <>
                          <strong className="text-slate-900 block">{pres.nome}</strong>
                          {pres.cpf && (
                            <span className="text-[9px] text-slate-500 font-mono">
                              CPF: {formatarCpf(pres.cpf)}
                            </span>
                          )}
                        </>
                      ) : (
                        u.responsavel_nome || <span className="italic">Ausente</span>
                      )}
                    </td>
                    <td className="p-1.5 border-r border-slate-300 text-center uppercase text-[10px] font-bold">
                      {pres ? pres.forma : '—'}
                    </td>
                    <td className="p-1.5 border-r border-slate-300">
                      {pres?.forma === 'procuracao' ? (
                        <div className="space-y-0.5">
                          <span className="font-bold text-amber-900 block text-[10px]">
                            Procurador: {pres.nome_procurador}
                          </span>
                          {pres.cpf_procurador && (
                            <span className="text-[9px] text-slate-500 font-mono block">
                              CPF: {formatarCpf(pres.cpf_procurador)}
                            </span>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-1.5 text-center font-mono text-[8px]">
                      {pres?.assinatura_hash ? (
                        <div className="text-slate-600">
                          <span className="text-emerald-700 font-bold block">✓ ASSINADO</span>
                          <span className="truncate block max-w-[140px] mx-auto">
                            {pres.assinatura_hash.substring(0, 16)}...
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* ========================================================= */}
        {/* SEÇÃO 4: BOLETIM OFICIAL DE URNA (PÁGINA 4) */}
        {/* ========================================================= */}
        <section className="bg-white border border-slate-300 shadow-md print:shadow-none print:border-none p-10 min-h-[950px] print:min-h-screen print:page-break-after-always">
          <header className="border-b-2 border-slate-900 pb-3 mb-6 font-sans flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
                Peça 3 do Dossiê
              </span>
              <h3 className="text-base font-bold uppercase text-slate-900">
                Boletim de Urna Eletrônica (Certificação Criptográfica)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-600">
              Total Cédulas: {apuracao.totalCedulas}
            </span>
          </header>

          <div className="space-y-4 font-sans text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Raiz Criptográfica de Fechamento (Merkle / Hash Raiz)
              </span>
              <p className="font-mono text-[11px] font-bold text-slate-900 break-all bg-white p-2 border border-slate-300 rounded">
                {deliberacao.hash_raiz || 'Em consolidação final'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-700">
                <p>
                  <strong>Data de Fechamento:</strong>{' '}
                  {deliberacao.data_fechamento_apuracao
                    ? new Date(deliberacao.data_fechamento_apuracao).toLocaleString('pt-BR')
                    : 'Registrado no encerramento'}
                </p>
                <p>
                  <strong>Cédulas Registradas:</strong> {apuracao.totalCedulas}
                </p>
              </div>
            </div>

            <p className="text-justify leading-relaxed text-slate-700">
              Certifica-se, para todos os efeitos de direito, que cada voto emitido foi gravado com
              carimbo criptográfico SHA-256 encadeado aos registros de auditoria do sistema,
              garantindo o sigilo do voto secreto e a imutabilidade do resultado eleitoral.
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SEÇÃO 5: INFORMATIVO DE DELIBERAÇÕES & VOTAÇÃO (PÁGINA 5) */}
        {/* ========================================================= */}
        <section className="bg-white border border-slate-300 shadow-md print:shadow-none print:border-none p-10 min-h-[950px] print:min-h-screen print:page-break-after-always">
          <header className="border-b-2 border-slate-900 pb-3 mb-6 font-sans flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
                Peça 4 do Dossiê
              </span>
              <h3 className="text-base font-bold uppercase text-slate-900">
                Informativo do Escrutínio e Deliberações Aprovadas
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-600">
              {apuracao.itens.length} matérias apreciadas
            </span>
          </header>

          <div className="space-y-4 font-sans text-xs">
            {apuracao.itens.map((item) => {
              const res = julgarItem(item)
              const total = item.votos.total || 1
              return (
                <div
                  key={item.id}
                  className="border border-slate-300 rounded p-3 bg-white space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 font-serif text-sm">
                      {item.ordem}. {item.titulo}
                    </strong>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${res.cor}`}
                    >
                      {res.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                    <div className="p-1 rounded bg-emerald-50 border border-emerald-200">
                      <span>Favoráveis: </span>
                      <strong>{item.votos.favoravel}</strong> (
                      {((item.votos.favoravel / total) * 100).toFixed(1)}%)
                    </div>
                    <div className="p-1 rounded bg-red-50 border border-red-200">
                      <span>Contrários: </span>
                      <strong>{item.votos.contrario}</strong> (
                      {((item.votos.contrario / total) * 100).toFixed(1)}%)
                    </div>
                    <div className="p-1 rounded bg-slate-50 border border-slate-200">
                      <span>Abstenções: </span>
                      <strong>{item.votos.abstencao}</strong> (
                      {((item.votos.abstencao / total) * 100).toFixed(1)}%)
                    </div>
                    <div className="p-1 rounded bg-slate-100 border border-slate-300">
                      <span>Total: </span>
                      <strong>{item.votos.total}</strong>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* SEÇÃO 6: PÁGINA DE ASSINATURAS DA MESA DIRETORA (PÁGINA 6) */}
        {/* ========================================================= */}
        <section className="bg-white border border-slate-300 shadow-md print:shadow-none print:border-none p-10 min-h-[950px] flex flex-col justify-between print:min-h-screen">
          <header className="border-b-2 border-slate-900 pb-3 mb-6 font-sans flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
                Peça 5 do Dossiê
              </span>
              <h3 className="text-base font-bold uppercase text-slate-900">
                Termo de Encerramento e Assinaturas da Mesa Diretora
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-600">{nomeCondominio}</span>
          </header>

          <div className="space-y-4 font-sans text-xs text-justify leading-relaxed">
            <p>
              Aos <strong>{new Date().toLocaleDateString('pt-BR')}</strong>, a Mesa Diretora
              formalmente constituída e eleita para condução dos trabalhos da Assembleia Geral do{' '}
              <strong>{nomeCondominio}</strong>, após encerramento da votação, auditoria dos
              registros e apuração dos votos, <strong>DECLARA</strong> encerrados os trabalhos e
              lavra o presente Dossiê Notarial Eletrônico, composto por todas as peças precedentes,
              atestando sua plena veracidade perante o Cartório de Registro de Pessoas Jurídicas /
              Títulos e Documentos.
            </p>

            {/* Ressalva Jurídica Obrigatória */}
            <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-950 text-[11px] space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                Ressalva Jurídica para Efeitos Cartorários:
              </span>
              <p>
                As assinaturas eletrônicas constantes deste sistema (nome, CPF e carimbo
                criptográfico SHA-256) possuem plena validade probatória entre os condôminos na
                esfera interna do condomínio. Caso o Oficial do Cartório de Registro competente
                exija assinatura digital qualificada com certificado ICP-Brasil (e-CPF/e-CNPJ), os
                membros da Mesa Diretora deverão apor tal certificado sobre este arquivo PDF gerado,
                na forma da legislação vigente (Lei 14.063/2020 e Provimento CNJ).
              </p>
            </div>
          </div>

          {/* Assinaturas da Mesa Diretora (Presidente e Secretário) */}
          <div className="pt-16 pb-8 font-sans">
            <div className="grid grid-cols-2 gap-12 text-center">
              {/* Presidente */}
              <div className="flex flex-col items-center">
                <BlocoAssinaturaCompacto
                  nome={deliberacao.mesa_presidente_nome || 'Presidente da Mesa Diretora'}
                  cpf={deliberacao.mesa_presidente_cpf}
                  cargo="Presidente da Assembleia"
                  formato={assinaturaPresidenteDossie?.formato_assinatura || 'em_branco'}
                  assinaturaVisual={assinaturaPresidenteDossie?.assinatura_visual}
                  assinaturaTexto={assinaturaPresidenteDossie?.assinatura_texto}
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
                    {assinaturaPresidenteDossie
                      ? 'Reassinar como Presidente'
                      : 'Assinar como Presidente'}
                  </Button>
                </div>
              </div>

              {/* Secretário */}
              <div className="flex flex-col items-center">
                <BlocoAssinaturaCompacto
                  nome={deliberacao.mesa_secretario_nome || 'Secretário(a) da Mesa'}
                  cpf={deliberacao.mesa_secretario_cpf}
                  cargo="Secretário(a) dos Trabalhos"
                  formato={assinaturaSecretarioDossie?.formato_assinatura || 'em_branco'}
                  assinaturaVisual={assinaturaSecretarioDossie?.assinatura_visual}
                  assinaturaTexto={assinaturaSecretarioDossie?.assinatura_texto}
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
                    {assinaturaSecretarioDossie
                      ? 'Reassinar como Secretário'
                      : 'Assinar como Secretário'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <footer className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500 font-sans">
            Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR')}. Indaba —
            Governança e Assembleias Condominiais.
          </footer>
        </section>
      </div>

      {/* Modal Reutilizável de Assinatura Eletrônica da Mesa para o Dossiê */}
      {modalAssinaturaMesa && (
        <ModalAssinaturaEletronica
          aberto={!!modalAssinaturaMesa}
          onOpenChange={(ab) => !ab && setModalAssinaturaMesa(null)}
          tituloDocumento="Termo de Encerramento do Dossiê Notarial"
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
              ? assinaturaPresidenteDossie?.formato_assinatura
              : assinaturaSecretarioDossie?.formato_assinatura) || 'desenho'
          }
          assinaturaVisualInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? assinaturaPresidenteDossie?.assinatura_visual
              : assinaturaSecretarioDossie?.assinatura_visual
          }
          assinaturaTextoInicial={
            modalAssinaturaMesa === 'mesa_presidente'
              ? assinaturaPresidenteDossie?.assinatura_texto
              : assinaturaSecretarioDossie?.assinatura_texto
          }
          salvando={salvandoMesa}
          onConfirmar={handleConfirmarAssinaturaMesa}
        />
      )}
    </div>
  )
}

export default DossieCartorioPage

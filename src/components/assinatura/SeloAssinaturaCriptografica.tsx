import React from 'react'
import { CheckCircle2, ShieldCheck, Clock, FileCheck, Hash, AlertTriangle } from 'lucide-react'
import { decidirSelo, type RequisitosAssinatura, type SeloDecidido } from '@/lib/selo/honestidade'

export interface SeloAssinaturaCriptograficaProps {
  hash?: string | null
  hashSha256?: string | null
  dataAssinatura?: string | null
  dataHoraAssinatura?: string | null
  /** Data/hora DECLARADA pelo signatário no ato (recurso existente) — exibida como tal */
  dataDeclaradaSignatario?: string | null
  /** Requisitos efetivamente verificados — decide "simples" vs "avançada" (honestidade.ts) */
  requisitos?: RequisitosAssinatura | null
  nomeSignatario?: string
  cpfSignatario?: string
  cargoSignatario?: string
  tipoDocumento?: string // 'Edital de Convocação' | 'Ata de Assembleia' | 'edital' | 'ata' | 'documento'
  alinhamento?: 'center' | 'left'
  status?: 'valido' | 'desatualizado' | 'pendente'
  className?: string
  tamanho?: 'sm' | 'md' | 'lg'
}

/**
 * Formata o hash SHA-256 em blocos espaçados ou com quebra amigável (8 caracteres por bloco),
 * garantindo legibilidade perfeita sem estourar margens na pré-visualização ou impressão A4.
 */
export function formatarHashSha256Blocos(hash?: string | null): string {
  if (!hash) return ''
  const limpo = hash.trim()
  if (limpo.length !== 64) return limpo
  // Quebrar em grupos de 8 hexadecimais: 8 grupos de 8 caracteres
  const blocos: string[] = []
  for (let i = 0; i < limpo.length; i += 8) {
    blocos.push(limpo.substring(i, i + 8))
  }
  return blocos.join(' ')
}

/**
 * Formata a data e hora oficial da assinatura eletrônica em formato por extenso/brasileiro legível
 */
export function formatarDataHoraAssinatura(dataIso?: string | null): string {
  if (!dataIso) return 'Registrada no ato de assinatura'
  try {
    const d = new Date(dataIso)
    if (isNaN(d.getTime())) return dataIso
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return dataIso
  }
}

/**
 * Selo visual institucional Koinon de integridade e auditoria criptográfica SHA-256.
 * Apresenta o carimbo formal com as cores oficiais Koinon (#0066FF / #002B5E),
 * nome/cargo legíveis, data com hora/minuto/segundo e hash SHA-256 com formatação monoespaçada
 * e quebra adequada para não estourar páginas A4.
 */
export const SeloAssinaturaCriptografica: React.FC<SeloAssinaturaCriptograficaProps> = ({
  hash,
  hashSha256,
  dataAssinatura,
  dataHoraAssinatura,
  dataDeclaradaSignatario,
  requisitos,
  nomeSignatario,
  cpfSignatario,
  cargoSignatario,
  tipoDocumento = 'Edital de Convocação',
  alinhamento = 'left',
  status = 'valido',
  className = '',
}) => {
  const hashEfetivo = hash || hashSha256
  const dataEfetiva = dataAssinatura || dataHoraAssinatura

  // Decisão honesta do selo: "simples" por padrão; "avançada" só com requisitos verificados
  const selo: SeloDecidido = decidirSelo(requisitos ?? null)

  if (status === 'pendente' || !hashEfetivo) {
    return (
      <div
        className={`p-3.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 text-center font-sans text-xs text-slate-500 italic ${className}`}
      >
        Documento em fase de elaboração / aguardando assinatura eletrônica oficial do convocante.
      </div>
    )
  }

  const dataFormatada = formatarDataHoraAssinatura(dataEfetiva)
  const hashBlocos = formatarHashSha256Blocos(hashEfetivo)

  const isDesatualizado = status === 'desatualizado'

  return (
    <div
      className={`selo-assinatura-koinon border ${
        isDesatualizado
          ? 'border-amber-300 bg-amber-50/40'
          : 'border-[#0066FF]/30 bg-gradient-to-br from-[#F3F7FC] via-[#F8FAFC] to-[#EFF6FF]'
      } rounded-lg p-3.5 sm:p-4 text-left shadow-xs font-sans transition-all ${
        alinhamento === 'center' ? 'max-w-xl mx-auto' : 'w-full'
      } ${className}`}
    >
      {/* Cabeçalho do Carimbo */}
      <div
        className={`flex items-start justify-between gap-3 border-b ${
          isDesatualizado ? 'border-amber-200' : 'border-[#0066FF]/15'
        } pb-2.5 mb-2.5`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`h-7 w-7 rounded-full ${
              isDesatualizado
                ? 'bg-amber-100 text-amber-700 ring-amber-300'
                : 'bg-[#0066FF]/10 text-[#0066FF] ring-[#0066FF]/25'
            } flex items-center justify-center shrink-0 ring-1`}
          >
            {isDesatualizado ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-[#002B5E]">
                {isDesatualizado
                  ? 'Assinatura Registrada (Minuta Alterada)'
                  : 'Documento Assinado Eletronicamente'}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                  isDesatualizado ? 'bg-amber-100 text-amber-800' : 'bg-[#0066FF]/10 text-[#0066FF]'
                }`}
              >
                <CheckCircle2 className="h-2.5 w-2.5 inline" /> {selo.rotulo}
              </span>
              {typeof selo.nivel === 'string' && selo.nivel === 'avancada' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  {selo.nivel}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#5A6B82] leading-tight">{selo.descricao}</p>
          </div>
        </div>

        <div className="text-right shrink-0 hidden sm:block">
          <span
            className={`text-[9px] font-mono font-semibold uppercase ${
              isDesatualizado ? 'text-amber-700' : 'text-[#0066FF]'
            } tracking-wider block`}
          >
            {isDesatualizado ? 'VERSÃO ANTERIOR' : 'VIA AUTENTICADA'}
          </span>
          <span className="text-[8px] text-[#5A6B82] block">{tipoDocumento}</span>
        </div>
      </div>

      {/* Grid de Metadados da Assinatura */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-tight mb-2.5">
        {/* Signatário / Cargo */}
        {(nomeSignatario || cargoSignatario) && (
          <div className="space-y-0.5 bg-white/70 rounded p-2 border border-slate-200/60">
            <span className="text-[9px] uppercase font-bold text-[#5A6B82] block tracking-wider">
              Signatário Oficial
            </span>
            <p className="font-semibold text-[#002B5E] text-xs m-0 truncate">
              {nomeSignatario || 'Mesa Diretora'}
            </p>
            {(cpfSignatario || cargoSignatario) && (
              <p className="text-[10px] text-slate-600 m-0">
                {cargoSignatario && <span>{cargoSignatario}</span>}
                {cargoSignatario && cpfSignatario && <span> • </span>}
                {cpfSignatario && <span className="font-mono">CPF: {cpfSignatario}</span>}
              </p>
            )}
          </div>
        )}

        {/* Data e Hora da Assinatura — registrada pela plataforma vs. declarada pelo signatário */}
        <div className="space-y-0.5 bg-white/70 rounded p-2 border border-slate-200/60">
          <span className="text-[9px] uppercase font-bold text-[#5A6B82] block tracking-wider flex items-center gap-1">
            <Clock className="h-2.5 w-2.5 text-[#0066FF]" />
            {dataDeclaradaSignatario
              ? 'Data/hora declarada pelo signatário'
              : 'Data e Hora da Assinatura'}
          </span>
          <p className="font-semibold text-[#002B5E] text-xs font-mono m-0">
            {dataDeclaradaSignatario
              ? formatarDataHoraAssinatura(dataDeclaradaSignatario)
              : dataFormatada}
          </p>
          <p className="text-[9px] text-[#5A6B82] m-0">
            {dataDeclaradaSignatario
              ? `Data registrada pela plataforma: ${dataFormatada} (sem carimbo temporal ICP)`
              : 'Registro com datação e carimbo temporal de auditoria'}
          </p>
        </div>
      </div>

      {/* Bloco do Hash SHA-256 */}
      <div className="bg-[#002B5E]/5 rounded-md p-2 border border-[#002B5E]/10 space-y-1">
        <div className="flex items-center justify-between text-[9px] text-[#002B5E] font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Hash className="h-2.5 w-2.5 text-[#0066FF]" />
            Hash Criptográfico de Integridade (SHA-256)
          </span>
          <span className="text-[8px] font-mono text-[#5A6B82]">256-bit Digest</span>
        </div>
        <div className="bg-white rounded px-2 py-1.5 border border-slate-200/70 font-mono text-[9px] sm:text-[9.5px] text-[#002B5E] font-medium leading-relaxed tracking-wider break-all select-all">
          {hashBlocos}
        </div>
        <p className="text-[8.5px] text-[#5A6B82] leading-tight m-0 pt-0.5">
          Qualquer alteração subsequente no conteúdo deste documento invalida irrevogavelmente este
          carimbo.
        </p>
      </div>

      {/* Base legal honesta — apenas o que realmente se aplica */}
      <p className="text-[8.5px] text-[#5A6B82] leading-snug m-0 pt-2 mt-1 border-t border-slate-200/70">
        {selo.rodapeLegal}
      </p>
    </div>
  )
}

import React from 'react'
import { CenaApresentacaoVideo } from '@/lib/video/cenasRoteiro'

export interface LegendaGuiaLocucaoProps {
  cena: CenaApresentacaoVideo
  indiceAtual: number
  totalCenas: number
}

export const LegendaGuiaLocucao: React.FC<LegendaGuiaLocucaoProps> = ({
  cena,
  indiceAtual,
  totalCenas,
}) => {
  return (
    <div className="bg-white rounded-[14px] border border-[#5A6B82]/20 p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,43,94,0.06)] space-y-3">
      {/* Cabeçalho da Legenda */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#5A6B82]/15 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="bg-[#0066FF] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-[6px]">
            CENA {indiceAtual + 1} DE {totalCenas} ({cena.letra.toUpperCase()})
          </span>
          <h4 className="text-xs sm:text-sm font-semibold text-[#002B5E] truncate max-w-xs sm:max-w-md">
            {cena.titulo}
          </h4>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#5A6B82]">
          <span>
            ⏱ <strong>{cena.duracaoEstimadaTexto}</strong>
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline truncate max-w-[200px]">
            🎯 Foco: <strong className="text-[#002B5E]">{cena.focoAnimacaoSeta}</strong>
          </span>
        </div>
      </div>

      {/* Caixa do Texto do Locutor com Ênfases e Pausas Marcadas */}
      <div className="p-3.5 rounded-[10px] bg-[#F3F7FC] border border-[#0066FF]/20 text-xs sm:text-sm leading-relaxed text-[#002B5E] font-['Poppins',sans-serif]">
        <div className="text-[10px] font-bold text-[#5A6B82] uppercase tracking-wider mb-1">
          SUA FALA (LEGENDA-GUIA PARA LOCUÇÃO HUMANA):
        </div>

        <p className="select-text">
          {cena.partesLocucao.map((p, idx) => {
            if (p.tipo === 'enfase') {
              return (
                <strong key={idx} className="text-[#0066FF] font-bold">
                  {p.texto}
                </strong>
              )
            }
            if (p.tipo === 'pausa') {
              return (
                <span
                  key={idx}
                  className="inline-block mx-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300"
                  title="Pausa de 1 segundo para a respiração e animação da tela"
                >
                  {p.texto}
                </span>
              )
            }
            if (p.tipo === 'direcao') {
              return (
                <span key={idx} className="italic text-[#5A6B82] mx-1">
                  {p.texto}
                </span>
              )
            }
            return <span key={idx}>{p.texto}</span>
          })}
        </p>
      </div>

      {/* Dicas do Locutor */}
      {cena.dicasLocutor && (
        <div className="flex items-center gap-2 text-[11px] text-[#5A6B82]">
          <span className="text-[#0066FF] font-bold">💡 Orientação de voz:</span>
          <span className="italic">{cena.dicasLocutor}</span>
        </div>
      )}
    </div>
  )
}

import React from 'react'

export interface SetaIndicadoraProps {
  /**
   * Posição relativa e direção da seta
   */
  direcao?: 'baixo' | 'cima' | 'esquerda' | 'direita'
  texto?: string
  className?: string
  pulsar?: boolean
}

/**
 * Seta animada com pulso e destaque visual na paleta A3ONE (Azul #0066FF / Marinho #002B5E)
 * para apontar com precisão cirúrgica o elemento de que o locutor fala em cada cena.
 */
export const SetaIndicadora: React.FC<SetaIndicadoraProps> = ({
  direcao = 'baixo',
  texto,
  className = '',
  pulsar = true,
}) => {
  // Rotação do ícone da seta para apontar na direção configurada
  const rotacoes = {
    baixo: 'rotate-180',
    cima: 'rotate-0',
    esquerda: '-rotate-90',
    direita: 'rotate-90',
  }

  // Padrão de 3 quiques: dois rápidos + um mais lento + repouso prolongado, ininterruptamente
  const animacaoQuique = {
    baixo: 'animate-quique-seta-baixo',
    cima: 'animate-quique-seta-cima',
    esquerda: 'animate-quique-seta-esquerda',
    direita: 'animate-quique-seta-direita',
  }

  return (
    <div
      className={`inline-flex items-center gap-2 select-none z-30 pointer-events-none transition-all duration-300 ${
        pulsar ? animacaoQuique[direcao] : ''
      } ${className}`}
    >
      {/* Rótulo explicativo opcional */}
      {texto && (
        <span className="bg-[#002B5E] text-white text-[11px] font-semibold px-2.5 py-1 rounded-[6px] shadow-[0_2px_10px_rgba(0,43,94,0.3)] whitespace-nowrap border border-[#8EC0FF]/40 tracking-wide font-['Poppins',sans-serif]">
          {texto}
        </span>
      )}

      {/* Ícone de Seta Estilizada Koinon */}
      <div className="relative flex items-center justify-center">
        {/* Glow de fundo */}
        <div className="absolute h-8 w-8 rounded-full bg-[#0066FF]/30 animate-ping" />

        <div className="h-7 w-7 rounded-full bg-[#0066FF] text-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,102,255,0.4)] border-2 border-white">
          <svg
            className={`h-4 w-4 ${rotacoes[direcao]} transition-transform`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </div>
      </div>
    </div>
  )
}

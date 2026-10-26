import React from 'react'
import { IndabaSymbol } from './IndabaSymbol'

export interface IndabaLogoProps {
  /**
   * Altura do símbolo e proporção do logotipo completo.
   * Mínimo do símbolo: 24px.
   * @default 28
   */
  size?: number
  /**
   * Variante de cor:
   * - 'color': Símbolo colorido sobre fundo claro (Papel / Areia), wordmark Indaba Deep #1E1B18.
   * - 'negative': Símbolo com traços brancos / círculo Ocre ou branco puro sobre fundo Indaba Deep #1E1B18.
   * - 'negative-solid': Símbolo e wordmark em branco puro #FFFFFF.
   * - 'monochrome': Tudo em Indaba Deep #1E1B18 sobre fundo claro.
   */
  variant?: 'color' | 'negative' | 'negative-solid' | 'monochrome'
  /**
   * Opcional: subtítulo institucional (ex: "Governança & Assembleias" ou nome do condomínio em dados).
   */
  subtitle?: string
  className?: string
}

/**
 * Logotipo Completo Indaba:
 * - Travamento horizontal: símbolo à esquerda, wordmark "Indaba" à direita
 * - Respiro entre eles equivalente à altura da letra I
 * - Wordmark Manrope, peso 600, letter-spacing -0.02em
 * - Grafia obrigatória: "Indaba" (nunca caixa alta integral, nunca acento)
 * - Nenhuma sombra, contorno ou efeito.
 */
export const IndabaLogo: React.FC<IndabaLogoProps> = ({
  size = 28,
  variant = 'color',
  subtitle,
  className = '',
}) => {
  const isNegative = variant === 'negative' || variant === 'negative-solid'
  const wordmarkColor = isNegative ? 'text-[#FFFDFA]' : 'text-[#1E1B18]'
  const subtitleColor = isNegative ? 'text-[#E8E1D6]/70' : 'text-[#6B6259]'

  // Proporção de tipografia com base no tamanho do símbolo:
  // Para size = 28 -> text-xl (~20px), para size = 36 -> text-2xl (~24px)
  const fontSizePx = Math.round(size * 0.72)

  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: `${Math.round(size * 0.36)}px` }}
    >
      <IndabaSymbol size={size} variant={variant} />

      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-semibold tracking-[-0.02em] ${wordmarkColor}`}
          style={{
            fontSize: `${fontSizePx}px`,
            lineHeight: 1,
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          Indaba
        </span>
        {subtitle && (
          <span
            className={`text-[10px] font-medium tracking-wide uppercase mt-1 truncate ${subtitleColor}`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

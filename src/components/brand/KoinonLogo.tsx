import React from 'react'
import { KoinonSymbol } from './KoinonSymbol'

export interface KoinonLogoProps {
  /**
   * Altura do símbolo e proporção do logotipo completo.
   * Mínimo do símbolo: 24px.
   * @default 24
   */
  size?: number
  /**
   * Variante de cor (Paleta Pedra e Azul):
   * - 'color': Símbolo e arcos em #12314F (Koinon Navy), ponto e 'i' em #1F6B94 (Koinon Azure), letras em #12314F.
   * - 'negative': Símbolo com arcos em #FFFFFF, ponto em #1F6B94, letras em #FFFFFF (exceto 'i' em #1F6B94).
   * - 'negative-solid': Mesmo padrão com letras em branco e 'i' em Koinon Azure.
   * - 'monochrome': Arcos e letras em #12314F, ponto e 'i' em #1F6B94.
   */
  variant?: 'color' | 'negative' | 'negative-solid' | 'monochrome'
  /**
   * Opcional: subtítulo institucional (ex: nome do condomínio).
   */
  subtitle?: string
  className?: string
}

/**
 * Logotipo Completo Koinon (Paleta Pedra e Azul):
 * - Travamento horizontal: símbolo à esquerda, wordmark à direita.
 * - Respiro entre eles equivalente à altura da letra K (~size * 0.42).
 * - Wordmark montado como exatamente SEIS elementos separados (um por letra):
 *     <span class="wordmark"><span>K</span><span>o</span><span>i</span><span>n</span><span>o</span><span>n</span></span>
 * - Família Sora, peso 600, letter-spacing -0.02em.
 * - A terceira letra (i) sempre em Koinon Azure #1F6B94; as demais em Koinon Navy #12314F (ou #FFFFFF em versão negativa).
 */
export const KoinonLogo: React.FC<KoinonLogoProps> = ({
  size = 36,
  variant = 'color',
  subtitle,
  className = '',
}) => {
  const isNegative = variant === 'negative' || variant === 'negative-solid'
  const defaultLetterColor = isNegative ? '#FFFFFF' : '#12314F'
  const azureColor = '#1F6B94'
  const subtitleColor = isNegative ? 'text-[#D5DCE5]' : 'text-[#5C6B7A]'

  // Altura da letra K proporcional ao símbolo (~0.72)
  const fontSizePx = Math.max(16, Math.round(size * 0.72))
  const gapPx = Math.max(8, Math.round(size * 0.38))

  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: `${gapPx}px` }}
    >
      <KoinonSymbol size={size} variant={variant} />

      <div className="flex flex-col justify-center leading-none">
        <span
          className="wordmark inline-flex items-baseline select-none"
          style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 600,
            letterSpacing: '-0.02em',
            fontSize: `${fontSizePx}px`,
            lineHeight: 1,
          }}
          aria-label="Koinon"
        >
          <span style={{ color: defaultLetterColor }}>K</span>
          <span style={{ color: defaultLetterColor }}>o</span>
          <span style={{ color: azureColor }}>i</span>
          <span style={{ color: defaultLetterColor }}>n</span>
          <span style={{ color: defaultLetterColor }}>o</span>
          <span style={{ color: defaultLetterColor }}>n</span>
        </span>
        {subtitle && (
          <span
            className={`text-[10px] font-medium tracking-wide uppercase mt-1 truncate ${subtitleColor}`}
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

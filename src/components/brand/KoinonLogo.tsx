import React from 'react'
import { KoinonSymbol } from './KoinonSymbol'

export interface KoinonLogoProps {
  /**
   * Altura do símbolo e proporção do logotipo completo.
   * Mínimo do símbolo: 24px.
   * @default 42
   */
  size?: number
  /**
   * Variante de cor conforme o Manual da Marca v1.0:
   * - 'color': símbolo em Azul #0066FF / ponto central Marinho #002B5E, logotipo em Marinho #002B5E
   * - 'on-navy': sobre fundo marinho, pontos do símbolo em #3D8BFF, centro e letras em Branco #FFFFFF
   * - 'negative' / 'negative-solid': tudo em Branco puro #FFFFFF (para fundo azul ou escuro)
   * - 'monochrome': todo em Preto #000000
   */
  variant?: 'color' | 'on-navy' | 'negative' | 'negative-solid' | 'monochrome'
  /**
   * Orientação do logotipo:
   * - 'horizontal' (principal)
   * - 'vertical'
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical'
  /**
   * Opcional: subtítulo institucional (ex: nome do condomínio).
   */
  subtitle?: string
  className?: string
  scaleMode?: 'master' | 'optical' | 'auto'
}

/**
 * Logomarca Oficial Koinon (Manual da Marca v1.0, págs. 3 e 4):
 * - Une o símbolo Círculo Comum ao logotipo KOINON desenhado em formas geométricas vetoriais.
 * - Versão horizontal é a principal; versão vertical disponível.
 * - Tipografia da marca: Poppins com geometria precisa do "O" circular e "K" nítido.
 * - Proporção: a altura do wordmark KOINON é calibrada proporcionalmente ao símbolo.
 *
 * Cores:
 * - Versão Colorida: símbolo em Azul Koinon #0066FF + Marinho #002B5E, wordmark em Marinho #002B5E.
 * - Sobre Fundo Marinho ('on-navy'): pontos do anel em #3D8BFF, centro e wordmark em #FFFFFF.
 * - Versão Negativa ('negative'): tudo em #FFFFFF.
 * - Monocromática Preto ('monochrome'): tudo em #000000.
 */
export const KoinonLogo: React.FC<KoinonLogoProps> = ({
  size = 42,
  variant = 'color',
  orientation = 'horizontal',
  subtitle,
  className = '',
}) => {
  const isDark = variant === 'on-navy' || variant === 'negative' || variant === 'negative-solid'
  const isBlack = variant === 'monochrome'

  // Cor do wordmark Koinon
  const wordmarkColor = isDark ? '#FFFFFF' : isBlack ? '#000000' : '#002B5E'
  const subtitleColor = variant === 'on-navy' ? '#8EC0FF' : isDark ? '#E2E8F0' : '#5A6B82'

  // No Manual da Marca Koinon (A3ONE):
  // - Wordmark "Koinon" (Capital K, minúsculas o-i-n-o-n)
  // - Tipografia: Poppins, peso 600 (SemiBold), letter-spacing: -0.02em
  // - Cores:
  //   * Variante colorida ('color'): letra "i" em Azul #0066FF, demais letras em Marinho #002B5E
  //   * Variante negativa / on-navy: arcos/pontos em branco, ponto central em #0066FF,
  //     wordmark todo em Branco #FFFFFF
  //   * Monocromática: todo em Preto #000000
  // - Travamento horizontal: símbolo à esquerda, wordmark à direita.
  //   Altura do wordmark alinhada com a do símbolo;
  //   Respiro entre símbolo e wordmark rigorosamente equivalente à altura da letra K.
  //   Na fonte Poppins, a caixa-alta da letra K tem cap-height = 0.70 do font-size.
  //   Calibramos a escala visual para harmonizar a altura total do K com a do símbolo,
  //   e o respiro horizontal (gap) exatamente igual à altura do K.
  const fontSizePx = Math.max(14, Math.round(size * 0.58))
  const kCapHeightPx = Math.round(fontSizePx * 0.7)
  const gapPx = Math.max(8, kCapHeightPx)

  const letterIColor = isDark ? '#FFFFFF' : isBlack ? '#000000' : '#0066FF'

  const wordmarkNode = (
    <span
      className="inline-flex items-baseline font-semibold select-none leading-none tracking-[-0.02em] whitespace-nowrap"
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: `${fontSizePx}px`,
        fontWeight: 600,
        color: wordmarkColor,
        letterSpacing: '-0.02em',
      }}
      aria-label="Koinon"
    >
      <span>K</span>
      <span>o</span>
      <span style={{ color: letterIColor }}>i</span>
      <span>n</span>
      <span>o</span>
      <span>n</span>
    </span>
  )

  if (orientation === 'vertical') {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center select-none ${className}`}
        style={{ gap: `${Math.round(size * 0.22)}px` }}
      >
        <KoinonSymbol size={size} variant={variant} />
        <div className="flex flex-col items-center text-center">
          {wordmarkNode}
          {subtitle && (
            <span
              className="text-[10px] font-medium tracking-wide uppercase mt-1 truncate max-w-[200px]"
              style={{ fontFamily: "'Poppins', sans-serif", color: subtitleColor }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: `${gapPx}px` }}
    >
      <KoinonSymbol size={size} variant={variant} />

      <div className="flex flex-col justify-center leading-none">
        {wordmarkNode}
        {subtitle && (
          <span
            className="text-[10px] font-medium tracking-wide uppercase mt-1 truncate max-w-[260px]"
            style={{ fontFamily: "'Poppins', sans-serif", color: subtitleColor }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

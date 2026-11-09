import React from 'react'
import logoA3OneClaro from '@/assets/a3one-solucoes-integradas-2-5349d.png'
import logoA3OneEscuro from '@/assets/a3one-sem-fundo-93716.png'

export interface EndossoA3OneProps {
  /**
   * Variante de cor:
   * - 'color': sobre fundo claro (frase em cinza #5A6B82, logo oficial clara)
   * - 'on-navy': sobre fundo marinho/azul (frase em #8EC0FF, logo com glow luminoso integrado, sem borda branca)
   * - 'monochrome-white': para fundos escuros monocromáticos
   * - 'monochrome-black': todo em preto
   * @default 'color'
   */
  variant?: 'color' | 'on-navy' | 'monochrome-white' | 'monochrome-black'
  /**
   * Disposição:
   * - 'stacked': frase acima do logo A3ONE (telas de entrada, capas)
   * - 'inline': frase à esquerda do logo A3ONE (rodapés, cabeçalhos horizontais)
   * @default 'inline'
   */
  layout?: 'inline' | 'stacked'
  className?: string
}

/**
 * Selo de Endosso Koinon — "uma solução A3ONE" (Manual da Marca Koinon / Logo Oficial A3ONE Soluções Integradas):
 * - Aplicação:
 *   (a) Centralizado em telas de entrada e capas escuras/coloridas;
 *   (b) No rodapé das telas do sistema (sidebar, footer), e-mails e documentos.
 * - Versão para fundos escuros/coloridos (on-navy / monochrome-white):
 *   Usa a logo com acabamento luminoso sobre gradiente azul da marca, integrando-se
 *   naturalmente sem o bloco/fundo branco reto anterior.
 * - Versão para fundos claros/brancos (color):
 *   Mantém a logo original sobre fundo transparente/branco.
 */
export const EndossoA3One: React.FC<EndossoA3OneProps> = ({
  variant = 'color',
  layout = 'inline',
  className = '',
}) => {
  const isDark = variant === 'on-navy' || variant === 'monochrome-white'
  const textColor = variant === 'on-navy' ? '#8EC0FF' : isDark ? '#FFFFFF' : '#5A6B82'
  const logoSrc = isDark ? logoA3OneEscuro : logoA3OneClaro

  const logoImg = (
    <div className="inline-flex items-center justify-center shrink-0">
      <img
        src={logoSrc}
        alt="A3ONE Soluções Integradas"
        className={`shrink-0 select-none object-contain ${
          layout === 'stacked' ? 'h-7 sm:h-8' : 'h-5 sm:h-6'
        } ${isDark ? 'rounded-[4px] shadow-[0_2px_12px_rgba(0,102,255,0.25)]' : ''} w-auto`}
      />
    </div>
  )

  if (layout === 'stacked') {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center gap-1.5 select-none ${className}`}
      >
        <span
          className="text-[11px] font-normal tracking-wide"
          style={{ fontFamily: "'Poppins', sans-serif", color: textColor }}
        >
          uma solução
        </span>
        {logoImg}
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center justify-center gap-2 select-none ${className}`}>
      <span
        className="text-[11px] font-normal tracking-wide whitespace-nowrap"
        style={{ fontFamily: "'Poppins', sans-serif", color: textColor }}
      >
        uma solução
      </span>
      {logoImg}
    </div>
  )
}

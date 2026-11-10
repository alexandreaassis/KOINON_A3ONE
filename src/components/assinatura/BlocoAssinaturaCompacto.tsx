import React from 'react'
import { formatarCpf } from '@/lib/cpf'
import { FormatoAssinatura } from '@/lib/api'

export interface BlocoAssinaturaCompactoProps {
  nome: string
  cpf?: string
  cargo?: string
  formato?: FormatoAssinatura
  assinaturaVisual?: string // dataURL da imagem desenhada
  assinaturaTexto?: string // texto manuscrito
  larguraLinha?: string // default w-64 ou w-4/5
  corLinha?: string // default border-slate-900
  alinhamento?: 'center' | 'left'
  className?: string
  mostrarLinhaSeEmBranco?: boolean
}

export const BlocoAssinaturaCompacto: React.FC<BlocoAssinaturaCompactoProps> = ({
  nome,
  cpf,
  cargo,
  formato = 'em_branco',
  assinaturaVisual,
  assinaturaTexto,
  larguraLinha = 'w-64',
  corLinha = 'border-[#002B5E]',
  alinhamento = 'center',
  className = '',
  mostrarLinhaSeEmBranco = true,
}) => {
  const alinhamentoClass = alinhamento === 'center' ? 'text-center mx-auto' : 'text-left'

  // Decidir o que exibir na área gráfica acima da linha (altura compacta fixa para não empurrar layout)
  const temDesenho = formato === 'desenho' && !!assinaturaVisual
  const temTexto = formato === 'texto' && !!assinaturaTexto

  return (
    <div className={`inline-block ${alinhamentoClass} ${className} font-sans`}>
      {/* Área gráfica de assinatura (com a assinatura visual destacada e nítida sobre a linha de base) */}
      <div className="min-h-12 flex items-end justify-center overflow-hidden mb-1 pointer-events-none select-none">
        {temDesenho ? (
          <img
            src={assinaturaVisual}
            alt={`Assinatura de ${nome}`}
            className="max-h-16 max-w-[260px] object-contain drop-shadow-xs -mb-[1px] transition-transform"
            loading="eager"
          />
        ) : temTexto ? (
          <span
            style={{ fontFamily: '"Dancing Script", "Great Vibes", cursive' }}
            className="text-3xl sm:text-[32px] text-[#002B5E] font-bold leading-none truncate max-w-[260px] px-2 block pb-0.5"
          >
            {assinaturaTexto}
          </span>
        ) : (
          // Em branco: preserva o espaço vazio acima da linha
          <div className="h-6 w-full" />
        )}
      </div>

      {/* Linha horizontal para assinatura (preserva o alinhamento de base do documento) */}
      {mostrarLinhaSeEmBranco && (
        <div
          className={`${larguraLinha} border-t-2 ${corLinha} ${alinhamento === 'center' ? 'mx-auto' : ''} mb-1.5`}
        />
      )}

      {/* Bloco de identificação bem legível e estruturado */}
      <div className="space-y-0.5 leading-tight">
        <p className="text-xs sm:text-[13px] font-bold uppercase text-[#002B5E] m-0 p-0 tracking-wide">
          {nome}
        </p>
        {cpf && (
          <p className="text-[11px] text-[#5A6B82] font-mono m-0 p-0 font-medium">
            CPF: {formatarCpf(cpf)}
          </p>
        )}
        {cargo && <p className="text-[11px] text-[#5A6B82] m-0 p-0 font-medium">{cargo}</p>}
      </div>
    </div>
  )
}

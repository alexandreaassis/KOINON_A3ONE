import React from 'react'
import { formatarCpf } from '@/lib/cpf'
import type { FormatoAssinatura } from '@/lib/api'

export interface BlocoAssinaturaCompactoProps {
  nome: string
  cpf?: string | null
  cargo?: string | null
  formato?: FormatoAssinatura
  assinaturaVisual?: string
  assinaturaTexto?: string
  alinhamento?: 'left' | 'center'
  corLinha?: string
  larguraLinha?: string
  mostrarLinhaSeEmBranco?: boolean
  className?: string
}

export const BlocoAssinaturaCompacto: React.FC<BlocoAssinaturaCompactoProps> = ({
  nome,
  cpf,
  cargo,
  formato = 'em_branco',
  assinaturaVisual,
  assinaturaTexto,
  alinhamento = 'center',
  corLinha = 'border-[#002B5E]',
  larguraLinha = 'w-72 sm:w-80',
  mostrarLinhaSeEmBranco = true,
  className = '',
}) => {
  const alinhamentoClass = alinhamento === 'center' ? 'text-center' : 'text-left'

  const temDesenho = formato === 'desenho' && !!assinaturaVisual
  const temTexto = formato === 'texto' && !!assinaturaTexto

  return (
    <div className={`inline-block ${alinhamentoClass} ${className} font-sans`}>
      {/* Área gráfica de assinatura (+33% proporcional: traço aumentado de 56/64px para 75/85px e largura máxima de 260px para 346px, rigorosamente assentado sobre a linha regimental) */}
      <div className="min-h-[75px] flex items-end justify-center overflow-visible mb-1 pointer-events-none select-none">
        {temDesenho ? (
          <img
            src={assinaturaVisual}
            alt={`Assinatura de ${nome}`}
            className="max-h-[85px] max-w-[346px] object-contain object-bottom drop-shadow-xs block transition-transform -mb-[1px]"
            loading="eager"
          />
        ) : temTexto ? (
          <span
            style={{ fontFamily: '"Dancing Script", "Great Vibes", cursive' }}
            className="text-[38px] sm:text-[42px] text-[#002B5E] font-bold leading-none truncate max-w-[346px] px-2 block pb-0.5 -mb-[1px]"
            title={assinaturaTexto}
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

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
  corLinha = 'border-[#12314F]',
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
      {/* Área gráfica de assinatura (altura fixa e compacta ~42px, acima da linha) */}
      <div className="h-10 flex items-end justify-center overflow-hidden mb-0.5 pointer-events-none select-none">
        {temDesenho ? (
          <img
            src={assinaturaVisual}
            alt={`Assinatura de ${nome}`}
            className="max-h-10 max-w-[220px] object-contain drop-shadow-xs"
            loading="eager"
          />
        ) : temTexto ? (
          <span
            style={{ fontFamily: '"Dancing Script", "Great Vibes", cursive' }}
            className="text-2xl text-[#12314F] font-bold leading-none truncate max-w-[240px] px-2 block"
          >
            {assinaturaTexto}
          </span>
        ) : (
          // Em branco: preserva o espaço vazio acima da linha
          <div className="h-4 w-full" />
        )}
      </div>

      {/* Linha horizontal para assinatura */}
      {mostrarLinhaSeEmBranco && (
        <div
          className={`${larguraLinha} border-t ${corLinha} ${alinhamento === 'center' ? 'mx-auto' : ''} mb-1`}
        />
      )}

      {/* Bloco compacto de identificação */}
      <div className="space-y-0 leading-tight">
        <p className="text-xs font-semibold uppercase text-[#12314F] m-0 p-0 leading-tight">
          {nome}
        </p>
        {cpf && (
          <p className="text-[10px] text-[#5C6B7A] font-mono m-0 p-0 leading-tight">
            CPF: {formatarCpf(cpf)}
          </p>
        )}
        {cargo && <p className="text-[10px] text-[#5C6B7A] m-0 p-0 leading-tight">{cargo}</p>}{' '}
      </div>
    </div>
  )
}

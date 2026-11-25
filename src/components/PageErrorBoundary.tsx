/**
 * ErrorBoundary em nível de página/rota.
 *
 * Sem ele, qualquer throw durante a renderização de uma página derruba toda a
 * árvore React e o usuário vê apenas uma tela branca (ex.: o bug da
 * /morador/credenciamento com tipo_vinculo vindo como array). Aqui o erro fica
 * contido na área da rota ativa, com mensagem clara e ação de recuperação.
 */
import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  erro: Error | null
}

export class PageErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { erro: null }

  static getDerivedStateFromError(erro: Error): ErrorBoundaryState {
    return { erro }
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    console.error(
      '[Koinon] Erro de renderização contido pelo PageErrorBoundary:',
      erro,
      info.componentStack,
    )
  }

  private recarregar = () => {
    window.location.reload()
  }

  private voltarInicio = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-[#F3F7FC] p-4 text-[#002B5E]">
          <div className="max-w-md w-full rounded-[14px] border border-[#5A6B82]/25 bg-white p-6 shadow-[0_4px_24px_rgba(0,43,94,0.06)] text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Algo deu errado nesta tela</h1>
            <p className="mt-2 text-sm text-slate-600">
              Ocorreu um erro inesperado ao exibir esta página. Os demais módulos continuam
              disponíveis — tente recarregar.
            </p>
            {this.state.erro.message ? (
              <p className="mt-3 rounded-md bg-slate-50 border border-slate-200 p-2 text-[11px] font-mono text-slate-500 break-words">
                {this.state.erro.message}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-2">
              <Button
                onClick={this.recarregar}
                className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-medium"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Recarregar página
              </Button>
              <Button variant="outline" onClick={this.voltarInicio}>
                <Home className="mr-2 h-4 w-4" /> Voltar para o início
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default PageErrorBoundary

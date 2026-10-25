import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SeletorAssinatura, DadosCapturaAssinatura } from './SeletorAssinatura'
import { formatarCpf, validarCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import { ShieldCheck, Loader2 } from 'lucide-react'

export interface ModalAssinaturaEletronicaProps {
  aberto: boolean
  onOpenChange: (aberto: boolean) => void
  tituloDocumento: string
  subtitulo?: string
  nomeInicial?: string
  cpfInicial?: string
  cargoInicial?: string
  formatoInicial?: 'desenho' | 'texto' | 'em_branco'
  assinaturaVisualInicial?: string
  assinaturaTextoInicial?: string
  onConfirmar: (dados: {
    nome: string
    cpf: string
    cargo?: string
    formato: 'desenho' | 'texto' | 'em_branco'
    assinaturaVisual?: string
    assinaturaTexto?: string
  }) => Promise<void> | void
  salvando?: boolean
  permitirEditarIdentificacao?: boolean
}

export const ModalAssinaturaEletronica: React.FC<ModalAssinaturaEletronicaProps> = ({
  aberto,
  onOpenChange,
  tituloDocumento,
  subtitulo,
  nomeInicial = '',
  cpfInicial = '',
  cargoInicial = '',
  formatoInicial = 'desenho',
  assinaturaVisualInicial,
  assinaturaTextoInicial,
  onConfirmar,
  salvando = false,
  permitirEditarIdentificacao = true,
}) => {
  const [nome, setNome] = useState(nomeInicial)
  const [cpf, setCpf] = useState(cpfInicial)
  const [cargo, setCargo] = useState(cargoInicial)
  const [cpfErro, setCpfErro] = useState<string | null>(null)

  const [captura, setCaptura] = useState<DadosCapturaAssinatura>({
    formato: formatoInicial,
    assinaturaVisual: assinaturaVisualInicial,
    assinaturaTexto: assinaturaTextoInicial || nomeInicial,
  })

  // Sincronizar quando o modal abrir
  React.useEffect(() => {
    if (aberto) {
      setNome(nomeInicial)
      setCpf(cpfInicial)
      setCargo(cargoInicial)
      setCpfErro(null)
      setCaptura({
        formato: formatoInicial,
        assinaturaVisual: assinaturaVisualInicial,
        assinaturaTexto: assinaturaTextoInicial || nomeInicial,
      })
    }
  }, [
    aberto,
    nomeInicial,
    cpfInicial,
    cargoInicial,
    formatoInicial,
    assinaturaVisualInicial,
    assinaturaTextoInicial,
  ])

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome.trim()) {
      return
    }

    const rawCpf = cpf.replace(/\D/g, '')
    if (rawCpf.length > 0 && !validarCpf(cpf)) {
      setCpfErro(MSG_CPF_INVALIDO)
      return
    }
    setCpfErro(null)

    await onConfirmar({
      nome: nome.trim(),
      cpf: rawCpf,
      cargo: cargo.trim(),
      formato: captura.formato,
      assinaturaVisual: captura.formato === 'desenho' ? captura.assinaturaVisual : undefined,
      assinaturaTexto:
        captura.formato === 'texto' ? captura.assinaturaTexto || nome.trim() : undefined,
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-800">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Apor Assinatura Eletrônica
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {subtitulo || `Autenticação do documento "${tituloDocumento}" com carimbo SHA-256`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleConfirmar} className="space-y-4 pt-1">
          {/* Identificação do Assinante */}
          {permitirEditarIdentificacao ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-semibold">Nome Completo</Label>
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  disabled={salvando}
                  className="text-xs h-8 bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-semibold">CPF</Label>
                <Input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => {
                    setCpf(formatarCpf(e.target.value))
                    setCpfErro(null)
                  }}
                  disabled={salvando}
                  className={`text-xs h-8 bg-white ${cpfErro ? 'border-red-500' : ''}`}
                />
                {cpfErro && <p className="text-[10px] text-red-600">{cpfErro}</p>}
              </div>

              {cargoInicial !== undefined && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-slate-700">Cargo / Representação</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Síndico, Presidente da Mesa..."
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    disabled={salvando}
                    className="text-xs h-8 bg-white"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded bg-slate-100 border border-slate-200 text-xs flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900">{nome}</p>
                {cpf && (
                  <p className="text-[10px] text-slate-600 font-mono">CPF: {formatarCpf(cpf)}</p>
                )}
              </div>
              {cargo && <span className="text-[11px] text-slate-500">{cargo}</span>}
            </div>
          )}

          {/* Componente Reutilizável de Escolha do Modo de Assinatura */}
          <SeletorAssinatura
            valorInicial={captura}
            nomeSugerido={nome}
            onChange={(dados) => setCaptura(dados)}
            disabled={salvando}
          />

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-800 block">Integridade Criptográfica:</span>
            A confirmação gerará um hash SHA-256 do conteúdo do documento vinculado aos seus dados.
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={salvando || !nome.trim()}
              className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs gap-1.5"
            >
              {salvando ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gravando Assinatura...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" /> Confirmar e Assinar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

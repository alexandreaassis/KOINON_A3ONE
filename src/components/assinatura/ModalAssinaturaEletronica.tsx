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

  const [erroEnvio, setErroEnvio] = useState<string | null>(null)

  // Sincronizar quando o modal abrir
  React.useEffect(() => {
    if (aberto) {
      setNome(nomeInicial)
      setCpf(cpfInicial)
      setCargo(cargoInicial)
      setCpfErro(null)
      setErroEnvio(null)
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
    setErroEnvio(null)

    try {
      await onConfirmar({
        nome: nome.trim(),
        cpf: rawCpf,
        cargo: cargo.trim(),
        formato: captura.formato,
        assinaturaVisual: captura.formato === 'desenho' ? captura.assinaturaVisual : undefined,
        assinaturaTexto:
          captura.formato === 'texto' ? captura.assinaturaTexto || nome.trim() : undefined,
      })
    } catch (err: any) {
      const msg =
        err?.message?.includes('Failed to fetch') || !err?.status || err?.status === 0
          ? 'Falha de comunicação com o servidor (conexão interrompida). O traço desenhado foi preservado. Por favor, tente novamente.'
          : err?.message ||
            'Falha ao registrar assinatura eletrônica. O traço desenhado foi preservado para nova tentativa.'
      setErroEnvio(msg)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#FFFDFA] border-[#E8E1D6] rounded-[12px] shadow-[0_4px_24px_rgba(30,27,24,0.06)] text-[#1E1B18]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[8px] bg-[#E39A2B]/15 border border-[#E39A2B]/30 flex items-center justify-center text-[#1E1B18]">
              <ShieldCheck className="h-5 w-5 text-[#E39A2B]" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[#1E1B18] tracking-[-0.02em]">
                Assinatura Eletrônica
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B6259]">
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
                <Label className="text-xs text-[#1E1B18] font-medium">Nome Completo</Label>
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  disabled={salvando}
                  className="text-xs h-8 bg-[#FFFDFA] border-[#E8E1D6] rounded-[10px]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-[#1E1B18] font-medium">CPF</Label>
                <Input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => {
                    setCpf(formatarCpf(e.target.value))
                    setCpfErro(null)
                  }}
                  disabled={salvando}
                  className={`text-xs h-8 bg-[#FFFDFA] border-[#E8E1D6] rounded-[10px] ${cpfErro ? 'border-[#C75B39]' : ''}`}
                />
                {cpfErro && <p className="text-[10px] text-[#C75B39]">{cpfErro}</p>}
              </div>

              {cargoInicial !== undefined && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-[#6B6259]">Cargo / Representação</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Síndico, Presidente da Mesa..."
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    disabled={salvando}
                    className="text-xs h-8 bg-[#FFFDFA] border-[#E8E1D6] rounded-[10px]"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-[10px] bg-[#F4EFE7] border border-[#E8E1D6] text-xs flex justify-between items-center">
              <div>
                <p className="font-semibold text-[#1E1B18]">{nome}</p>
                {cpf && (
                  <p className="text-[10px] text-[#6B6259] font-mono">CPF: {formatarCpf(cpf)}</p>
                )}
              </div>
              {cargo && <span className="text-[11px] text-[#6B6259]">{cargo}</span>}
            </div>
          )}

          {/* Componente Reutilizável de Escolha do Modo de Assinatura */}
          <SeletorAssinatura
            valorInicial={captura}
            nomeSugerido={nome}
            onChange={(dados) => setCaptura(dados)}
            disabled={salvando}
          />

          {erroEnvio && (
            <div className="p-3 bg-[#C75B39]/10 border border-[#C75B39]/30 rounded-[10px] text-xs text-[#1E1B18] space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-[#C75B39]">
                <span className="inline-block w-2 h-2 rounded-full bg-[#C75B39]" />
                Erro ao gravar assinatura
              </p>
              <p className="text-[11px] leading-relaxed">{erroEnvio}</p>
            </div>
          )}

          <div className="p-2.5 bg-[#F4EFE7] border border-[#E8E1D6] rounded-[10px] text-[11px] text-[#6B6259] leading-relaxed">
            <span className="font-semibold text-[#1E1B18] block">Integridade Criptográfica:</span>
            A confirmação gerará um hash SHA-256 do documento vinculado aos seus dados.
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
              className="text-xs border-[#E8E1D6] text-[#1E1B18] rounded-[10px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={salvando || !nome.trim()}
              className="bg-[#E39A2B] hover:bg-[#d48c20] text-[#1E1B18] text-xs font-semibold gap-1.5 rounded-[10px] border-0"
            >
              {salvando ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gravando Assinatura...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" /> Assinar Documento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

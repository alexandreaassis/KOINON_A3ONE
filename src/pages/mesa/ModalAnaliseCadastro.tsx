import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  FileCheck2,
  Globe,
  UserPlus,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Hash,
  Home,
  KeyRound,
  Fingerprint,
} from 'lucide-react'
import { formatarCpf } from '@/lib/cpf'
import { formatarTelefone } from '@/lib/telefone'
import type { CadastroUnidadeRecord, UnidadeRecord } from '@/lib/api'
import {
  formatarIdentificadorUnidade,
  normalizarBloco,
  temBlocoReal,
} from '@/lib/formatadorUnidade'

export interface ModalAnaliseCadastroProps {
  cad: CadastroUnidadeRecord | null
  unidade?: UnidadeRecord
  rotuloUnidade: string
  aberto: boolean
  processando: boolean
  onFechar: () => void
  onAprovar: (cad: CadastroUnidadeRecord) => void
  onPedirRejeicao: (cad: CadastroUnidadeRecord) => void
}

const rotuloVinculo: Record<string, string> = {
  condomino: 'Condômino (morador)',
  locatario: 'Inquilino (morador)',
  proprietario: 'Proprietário (não morador)',
}

const ModalAnaliseCadastro: React.FC<ModalAnaliseCadastroProps> = ({
  cad,
  unidade,
  rotuloUnidade,
  aberto,
  processando,
  onFechar,
  onAprovar,
  onPedirRejeicao,
}) => {
  if (!cad) return null

  const statusCad = cad.status_aprovacao || 'aprovado'
  const nomeUnidade = unidade
    ? formatarIdentificadorUnidade(unidade.identificador, unidade.tipo_unidade, rotuloUnidade)
    : '—'
  const blocoUnidade =
    unidade && temBlocoReal(unidade.bloco, unidade.tipo_unidade)
      ? normalizarBloco(unidade.bloco, unidade.tipo_unidade)
      : '—'

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <User className="h-5 w-5 text-[#0066FF]" /> Análise Completa do Cadastro
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Confira todos os dados submetidos pelo candidato antes de aprovar ou rejeitar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          {/* Bloco: Identificação pessoal */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-800">{cad.nome}</h4>
              <Badge className="bg-amber-600 text-white text-[10px] uppercase">{statusCad}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold">CPF:</span> {formatarCpf(cad.cpf)}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold">E-mail:</span> {cad.email || '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold">Telefone:</span>{' '}
                {cad.telefone ? formatarTelefone(cad.telefone) : '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold">Unidade:</span> {nomeUnidade}
              </span>
              <span className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold">Bloco:</span> {blocoUnidade}
              </span>
              <span className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold">Vínculo:</span>{' '}
                {rotuloVinculo[cad.vinculo] || cad.vinculo}
              </span>
            </div>
          </div>

          {/* Bloco: Declaração legal assinada */}
          {(cad.declaracao_assinatura || cad.declaracao_vinculo) && (
            <div className="p-3 rounded-lg border border-[#0066FF]/20 bg-blue-50/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#002B5E]">
                  <FileCheck2 className="h-4 w-4 text-[#0066FF]" /> Declaração Legal Assinada
                </h4>
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> Aceite registrado
                </span>
              </div>
              {cad.declaracao_vinculo && (
                <blockquote className="p-2.5 bg-white rounded border border-slate-200 italic leading-relaxed text-slate-700">
                  "{cad.declaracao_vinculo}"
                </blockquote>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-700">
                {cad.declaracao_assinatura && (
                  <span>
                    <span className="font-semibold">Assinado por:</span> {cad.declaracao_assinatura}
                  </span>
                )}
                {cad.declaracao_data && (
                  <span>
                    <span className="font-semibold">Data/Hora:</span>{' '}
                    {new Date(cad.declaracao_data).toLocaleString('pt-BR')}
                  </span>
                )}
                {cad.declaracao_ip && (
                  <span className="flex items-center gap-1 text-slate-600">
                    <Globe className="h-3 w-3 text-slate-400" />
                    <span className="font-semibold">IP:</span>{' '}
                    <code className="bg-white px-1 rounded border border-slate-200 text-[10px] font-mono">
                      {cad.declaracao_ip}
                    </code>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bloco: Indicação de morador/proprietário de fato */}
          {(cad.indicacao_nome || cad.indicacao_telefone) && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 space-y-1.5">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <UserPlus className="h-4 w-4 text-amber-700" /> Indicação de Morador / Proprietário
                de Fato
              </h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-amber-900">
                {cad.indicacao_nome && (
                  <span>
                    <span className="font-semibold">Nome:</span> {cad.indicacao_nome}
                  </span>
                )}
                {cad.indicacao_telefone && (
                  <span>
                    <span className="font-semibold">Telefone:</span>{' '}
                    {formatarTelefone(cad.indicacao_telefone)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bloco: status atual rejeitado */}
          {statusCad === 'rejeitado' && cad.motivo_rejeicao && (
            <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
              <span className="font-semibold">Motivo da rejeição anterior:</span>{' '}
              {cad.motivo_rejeicao}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onFechar} disabled={processando}>
            Fechar
          </Button>
          {statusCad !== 'aprovado' && (
            <Button
              size="sm"
              disabled={processando}
              onClick={() => onAprovar(cad)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovar Cadastro
            </Button>
          )}
          {statusCad !== 'rejeitado' && (
            <Button
              size="sm"
              disabled={processando}
              onClick={() => onPedirRejeicao(cad)}
              className="border-red-300 text-red-700 hover:bg-red-50 font-semibold"
              variant="outline"
            >
              <XCircle className="mr-1 h-3.5 w-3.5" /> Rejeitar com Justificativa
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ModalAnaliseCadastro

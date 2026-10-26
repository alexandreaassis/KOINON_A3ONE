import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DeliberacaoRecord, DeliberacaoStatus } from '@/lib/api'
import {
  Clock,
  Radio,
  Vote,
  CheckCircle,
  FileCheck2,
  Share2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'

interface VotingStatusBarProps {
  deliberacao: DeliberacaoRecord | null
  jaVotou: boolean
  isPresencial?: boolean
}

export const VotingStatusBar: React.FC<VotingStatusBarProps> = ({
  deliberacao,
  jaVotou,
  isPresencial = false,
}) => {
  if (!deliberacao) return null

  const getStatusConfig = (status: DeliberacaoStatus) => {
    switch (status) {
      case 'AGUARDANDO_ABERTURA':
        return {
          badgeBg: 'bg-[#F4EFE7] text-[#1E1B18] border border-[#E8E1D6]',
          icon: Clock,
          label: 'Aguardando Abertura',
          desc: 'A assembleia ainda não foi aberta pela Mesa Diretora.',
          canVote: false,
        }
      case 'ABERTA':
        return {
          badgeBg: 'bg-[#E39A2B]/15 text-[#1E1B18] border border-[#E39A2B]/30',
          icon: Radio,
          label: 'Assembleia Aberta',
          desc: 'Pauta em discussão. Aguarde a mesa iniciar a votação.',
          canVote: false,
        }
      case 'EM_VOTACAO':
        return {
          badgeBg: 'bg-[#E39A2B] text-[#1E1B18] font-semibold border-0',
          icon: Vote,
          label: 'Votação em Andamento',
          desc: 'Urna digital liberada para os condôminos credenciados.',
          canVote: true,
        }
      case 'ENCERRADA':
        return {
          badgeBg: 'bg-[#F4EFE7] text-[#6B6259] border border-[#E8E1D6]',
          icon: CheckCircle,
          label: 'Votação Encerrada',
          desc: 'Urna fechada. Mesa em processo de apuração e conferência.',
          canVote: false,
        }
      case 'APURADA':
        return {
          badgeBg: 'bg-[#1E1B18] text-[#FFFDFA] border border-[#1E1B18]',
          icon: FileCheck2,
          label: 'Apuração Concluída',
          desc: 'Boletim de urna conferido com integridade matemática.',
          canVote: false,
        }
      case 'PUBLICADA':
        return {
          badgeBg: 'bg-[#E39A2B]/20 text-[#1E1B18] border border-[#E39A2B]/40',
          icon: Share2,
          label: 'Resultado Oficial Publicado',
          desc: 'Ata e resultado final disponibilizados a todos os condôminos.',
          canVote: false,
        }
      default:
        return {
          badgeBg: 'bg-[#F4EFE7] text-[#1E1B18] border border-[#E8E1D6]',
          icon: Clock,
          label: status,
          desc: '',
          canVote: false,
        }
    }
  }

  const config = getStatusConfig(deliberacao.status)
  const IconComponent = config.icon

  return (
    <div className="w-full rounded-[12px] border border-[#E8E1D6] bg-[#FFFDFA] p-4 mb-6 shadow-[0_4px_24px_rgba(30,27,24,0.06)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[#1E1B18]">
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className="rounded-[10px] bg-[#F4EFE7] p-2.5 border border-[#E8E1D6] text-[#1E1B18] shrink-0">
          <IconComponent className="h-5 w-5 text-[#E39A2B]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm leading-snug text-[#1E1B18]">
              {deliberacao.titulo}
            </span>
            <span
              className={`text-[11px] uppercase tracking-wider px-2 py-0.5 shrink-0 rounded-[8px] font-semibold ${config.badgeBg}`}
            >
              {config.label}
            </span>
          </div>
          <p className="text-xs text-[#6B6259] mt-0.5">{config.desc}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {isPresencial ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#F4EFE7] text-[#C75B39] text-xs font-semibold border border-[#E8E1D6]">
            <ShieldAlert className="h-4 w-4 text-[#C75B39]" /> Presença física na assembleia
          </div>
        ) : jaVotou ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#E39A2B]/15 text-[#1E1B18] text-xs font-semibold border border-[#E39A2B]/30">
            <CheckCircle className="h-4 w-4 text-[#E39A2B]" /> Voto Registrado
          </div>
        ) : config.canVote ? (
          <Link to="/votacao">
            <Button
              size="sm"
              className="bg-[#E39A2B] text-[#1E1B18] font-semibold hover:bg-[#d48c20] rounded-[10px] border-0"
            >
              <Vote className="mr-1.5 h-4 w-4" /> Cabine de Votação{' '}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  )
}
export default VotingStatusBar

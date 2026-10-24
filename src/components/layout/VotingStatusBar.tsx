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
          bg: 'bg-slate-100 border-slate-300 text-slate-800',
          badgeBg: 'bg-slate-200 text-slate-800',
          icon: Clock,
          label: 'Aguardando Abertura',
          desc: 'A assembleia ainda não foi aberta pela Mesa Diretora.',
          canVote: false,
        }
      case 'ABERTA':
        return {
          bg: 'bg-blue-50 border-blue-300 text-blue-900',
          badgeBg: 'bg-blue-200 text-blue-900',
          icon: Radio,
          label: 'Assembleia Aberta',
          desc: 'Pauta em discussão. Aguarde a mesa iniciar a votação.',
          canVote: false,
        }
      case 'EM_VOTACAO':
        return {
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-950',
          badgeBg: 'bg-emerald-600 text-white animate-pulse',
          icon: Vote,
          label: 'Votação em Andamento',
          desc: 'Urna digital liberada para os condôminos credenciados.',
          canVote: true,
        }
      case 'ENCERRADA':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-950',
          badgeBg: 'bg-amber-200 text-amber-900',
          icon: CheckCircle,
          label: 'Votação Encerrada',
          desc: 'Urna fechada. Mesa em processo de apuração e conferência.',
          canVote: false,
        }
      case 'APURADA':
        return {
          bg: 'bg-indigo-50 border-indigo-300 text-indigo-950',
          badgeBg: 'bg-indigo-200 text-indigo-900',
          icon: FileCheck2,
          label: 'Apuração Concluída',
          desc: 'Boletim de urna conferido com integridade matemática.',
          canVote: false,
        }
      case 'PUBLICADA':
        return {
          bg: 'bg-teal-50 border-teal-300 text-teal-950',
          badgeBg: 'bg-teal-700 text-white',
          icon: Share2,
          label: 'Resultado Oficial Publicado',
          desc: 'Ata e resultado final disponibilizados a todos os condôminos.',
          canVote: false,
        }
      default:
        return {
          bg: 'bg-slate-100 border-slate-300 text-slate-800',
          badgeBg: 'bg-slate-200 text-slate-800',
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
    <div
      className={`w-full rounded-lg border p-3.5 mb-6 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${config.bg}`}
    >
      <div className="flex items-start sm:items-center gap-3">
        <div className="rounded-full bg-white/80 p-2 shadow-xs border border-black/5">
          <IconComponent className="h-5 w-5 text-current" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm leading-none">{deliberacao.titulo}</span>
            <Badge
              className={`text-xs uppercase font-bold tracking-wider px-2 py-0.5 ${config.badgeBg}`}
            >
              {config.label}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">{config.desc}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {isPresencial ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300">
            <ShieldAlert className="h-4 w-4 text-amber-700" /> Presença física na assembleia (canal
            online bloqueado)
          </div>
        ) : jaVotou ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold shadow-xs">
            <CheckCircle className="h-4 w-4" /> Voto Registrado
          </div>
        ) : config.canVote ? (
          <Link to="/votacao">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
            >
              <Vote className="mr-1.5 h-4 w-4" /> Entrar na Cabine de Voto{' '}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  )
}
export default VotingStatusBar

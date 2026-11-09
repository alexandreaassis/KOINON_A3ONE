import React, { useState } from 'react'
import {
  type DeliberacaoRecord,
  type UnidadeRecord,
  type CadastroUnidadeRecord,
  type CredenciamentoRecord,
  type PresencaRecord,
} from '@/lib/api'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { Briefcase, Send, Copy, Check, Sparkles, BarChart2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PainelIaSindico } from './PainelIaSindico'

export interface SecaoAreaSindicoProps {
  deliberacaoAtiva: DeliberacaoRecord | null
  deliberacoes: DeliberacaoRecord[]
  unidades: UnidadeRecord[]
  cadastros: CadastroUnidadeRecord[]
  credenciamentos: CredenciamentoRecord[]
  presencas: PresencaRecord[]
}

export const SecaoAreaSindico: React.FC<SecaoAreaSindicoProps> = ({
  deliberacaoAtiva,
  deliberacoes,
  unidades,
  cadastros,
  credenciamentos,
  presencas,
}) => {
  const navigate = useNavigate()
  const { nomeCondominio, rotuloUnidade } = useCondoConfig()

  const [modalConvocacaoAberto, setModalConvocacaoAberto] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // Métricas de engajamento das unidades
  const totalUnidades = unidades.length || 52
  const idsUnidadesCadastradas = new Set(
    cadastros
      .filter((c) => (c.status_aprovacao || 'aprovado') === 'aprovado')
      .map((c) => c.unidade),
  )
  const totalCadastradas = idsUnidadesCadastradas.size
  const totalSemCadastro = Math.max(0, totalUnidades - totalCadastradas)
  const totalCadPendentes = cadastros.filter(
    (c) => (c.status_aprovacao || 'aprovado') === 'pendente',
  ).length

  const totalCredenciadas = credenciamentos.filter(
    (c) => c.status === 'aprovado' && (!deliberacaoAtiva || c.deliberacao === deliberacaoAtiva.id),
  ).length

  const totalPresentes = presencas.length
  const taxaPresenca = totalUnidades > 0 ? Math.round((totalPresentes / totalUnidades) * 100) : 0

  // Montar texto automático de convocação
  const montarTextoConvocacao = () => {
    const dataStr = deliberacaoAtiva?.data_inicio
      ? new Date(deliberacaoAtiva.data_inicio).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Em definição oficial'

    const titulo = deliberacaoAtiva?.titulo || 'Assembleia Geral Ordinária/Extraordinária'
    const linkAcesso = window.location.origin

    return `🏛️ *CONVOCAÇÃO DE ASSEMBLEIA — ${nomeCondominio.toUpperCase()}*

Prezados(as) condôminos(as) e moradores(as),

Convocamos todos para participar da assembleia eletrônica:
📌 *Pauta:* ${titulo}
🗓️ *Data e Horário de Abertura:* ${dataStr}
💻 *Modalidade:* Híbrida (Votação Eletrônica Segura pelo Koinon + Plenário Presencial)

*Passos importantes para participar:*
1️⃣ Acesse o sistema pelo link oficial: ${linkAcesso}
2️⃣ Confira sua situação e faça seu *Credenciamento* antecipado.
3️⃣ No horário de votação, entre na *Cabine de Votação* e registre seus votos com sigilo garantido por criptografia.

Dúvidas? Acesse o *Manual do Morador* dentro da plataforma ou converse com a nossa IA assistente.

Atenciosamente,
*Administração e Síndico — ${nomeCondominio}*`
  }

  const handleCopiarConvocacao = async () => {
    try {
      const texto = montarTextoConvocacao()
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      toast({
        title: 'Texto copiado com sucesso!',
        description: 'Pronto para colar no WhatsApp, e-mail ou grupo do condomínio.',
      })
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      toast({
        title: 'Falha ao copiar',
        description: 'Copie manualmente o texto da caixa.',
        variant: 'destructive',
      })
    }
  }

  // Últimas assembleias para resumo executivo e contexto
  const ultimasAssembleias = deliberacoes.slice(0, 4)

  // Contexto executivo compacto para enriquecer a primeira mensagem à IA do síndico
  const contextoExecutivo = `Condomínio: ${nomeCondominio}
Unidades totais: ${totalUnidades}
Cadastros aprovados: ${totalCadastradas}
Cadastros pendentes de aprovação: ${totalCadPendentes}
Assembleia ativa: ${deliberacaoAtiva ? `${deliberacaoAtiva.titulo} (status: ${deliberacaoAtiva.status})` : 'Nenhuma no momento'}
Credenciadas na ativa: ${totalCredenciadas}
Presenças registradas: ${totalPresentes} (${taxaPresenca}%)
Últimas assembleias registradas:
${ultimasAssembleias
  .map(
    (d) =>
      `- "${d.titulo}" | Status: ${d.status} | Data: ${
        d.data_inicio ? new Date(d.data_inicio).toLocaleDateString('pt-BR') : 'Sem data'
      }`,
  )
  .join('\n')}`

  return (
    <Card className="border-sky-200/80 shadow-xs bg-gradient-to-b from-sky-50/40 to-white">
      <CardHeader className="pb-3 border-b border-sky-100/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-800">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                Área do Síndico & Governança Condominial
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Acompanhamento executivo de engajamento das unidades, ferramentas de convocação e
                histórico consolidado.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalConvocacaoAberto(true)}
              className="text-xs h-8 font-semibold text-sky-800 border-sky-300 hover:bg-sky-50 gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Convocação Rápida
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/mesa/relatorios')}
              className="text-xs h-8 font-semibold bg-sky-700 hover:bg-sky-800 text-white gap-1.5"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Relatórios de Governança
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Bloco (a): Indicadores de Engajamento das Unidades */}
        <div>
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2.5">
            Painel Executivo de Engajamento ({rotuloUnidade || 'Unidades'})
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Unidades cadastradas vs sem cadastro */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Cadastros Aprovados
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-bold text-slate-900">{totalCadastradas}</span>
                <span className="text-[11px] text-slate-400">/ {totalUnidades} un.</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {totalSemCadastro > 0 ? `${totalSemCadastro} sem cadastro` : '100% cadastradas'}
              </span>
            </div>

            {/* Cadastros Pendentes */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Cadastros Pendentes
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span
                  className={`text-lg font-bold ${totalCadPendentes > 0 ? 'text-amber-600' : 'text-slate-900'}`}
                >
                  {totalCadPendentes}
                </span>
                <span className="text-[11px] text-slate-400">aguardando</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {totalCadPendentes > 0 ? 'Exigem aprovação da mesa' : 'Nenhuma fila pendente'}
              </span>
            </div>

            {/* Credenciadas na assembleia ativa */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Credenciadas (Ativa)
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-bold text-sky-700">{totalCredenciadas}</span>
                <span className="text-[11px] text-slate-400">unidades</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Habilitadas com OTP/validação
              </span>
            </div>

            {/* Presentes e taxa */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Presença Registrada
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-bold text-emerald-700">{totalPresentes}</span>
                <span className="text-[11px] text-slate-400">({taxaPresenca}%)</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Plenário físico + remoto
              </span>
            </div>
          </div>
        </div>

        {/* Bloco (b): Ação rápida de convocação destacada */}
        <div className="p-3.5 rounded-lg border border-sky-200 bg-sky-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-sky-200/80 text-sky-900 shrink-0">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block">
                Convocação da Assembleia em 1 Clique
              </span>
              <span className="text-slate-600 text-[11px]">
                Copie a mensagem oficial com datas, pauta e link para disparar via WhatsApp ou
                e-mail.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleCopiarConvocacao}
            className="text-xs h-8 bg-sky-700 hover:bg-sky-800 text-white font-semibold shrink-0 gap-1.5"
          >
            {copiado ? (
              <Check className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copiado ? 'Copiado!' : 'Copiar Mensagem de Convocação'}
          </Button>
        </div>

        {/* Bloco: Assistente de IA do Síndico & Governança */}
        <PainelIaSindico contextoExecutivo={contextoExecutivo} />

        {/* Bloco (c): Histórico resumido das últimas assembleias com resultado */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Histórico Executivo das Assembleias
            </span>
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate('/mesa/relatorios')}
              className="text-xs text-sky-700 h-auto p-0"
            >
              Ver relatório completo →
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-left">
                  <th className="py-2 px-3">Assembleia</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Data Início</th>
                  <th className="py-2 px-3">Mesa Diretora</th>
                  <th className="py-2 px-3 text-right">Relatório</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ultimasAssembleias.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      <span className="font-semibold text-slate-900 block">{d.titulo}</span>
                      {d.descricao && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                          {d.descricao}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <Badge
                        variant="outline"
                        className={
                          d.status === 'APURADA' || d.status === 'PUBLICADA'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px]'
                            : 'border-amber-300 bg-amber-50 text-amber-800 text-[10px]'
                        }
                      >
                        {d.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px]">
                      {d.data_inicio ? new Date(d.data_inicio).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px]">
                      {d.mesa_presidente_nome || 'Não definida'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/mesa/relatorios')}
                        className="text-xs h-7 px-2 text-sky-700 hover:text-sky-900"
                      >
                        Ver PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>

      {/* Modal de Convocação com preview do texto */}
      <Dialog open={modalConvocacaoAberto} onOpenChange={setModalConvocacaoAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send className="h-4 w-4 text-sky-700" /> Mensagem de Convocação Oficial
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Copie este modelo pré-formatado para disparar aos condôminos através de WhatsApp,
              e-mail institucional ou mural.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            <textarea
              readOnly
              value={montarTextoConvocacao()}
              rows={11}
              className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 resize-none focus:outline-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalConvocacaoAberto(false)}
              className="text-xs"
            >
              Fechar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleCopiarConvocacao}
              className="text-xs bg-sky-700 hover:bg-sky-800 text-white font-semibold gap-1.5"
            >
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? 'Copiado!' : 'Copiar Texto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

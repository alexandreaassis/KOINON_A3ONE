import React from 'react'
import { KeyRound, Save, Loader2, AlertTriangle } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { InstrucoesAcessoVotacao } from '@/lib/selo/honestidade'

interface CardInstrucoesAcessoProps {
  instrucoes: InstrucoesAcessoVotacao | null
  onChange: (instrucoes: InstrucoesAcessoVotacao) => void
  onSalvar: () => void
  salvando: boolean
  faltantes: string[]
}

const CAMPOS: Array<{
  chave: keyof InstrucoesAcessoVotacao
  rotulo: string
  placeholder: string
  multiline?: boolean
}> = [
  {
    chave: 'modalidade',
    rotulo: 'Modalidade da assembleia',
    placeholder: 'Ex: Híbrida — presencial no salão de festas e remota pela plataforma Koinon',
  },
  {
    chave: 'linkAcesso',
    rotulo: 'Link de acesso à assembleia',
    placeholder: 'Ex: https://seucondominio.koinon.app/morador/votacao',
  },
  {
    chave: 'formaAutenticacao',
    rotulo: 'Forma de autenticação do participante',
    placeholder: 'Ex: CPF + código OTP enviado por e-mail no credenciamento',
  },
  {
    chave: 'janelaVotacao',
    rotulo: 'Janela de votação eletrônica',
    placeholder:
      'Ex: aberta ao início de cada item da pauta e encerrada pela mesa na respectiva deliberação',
  },
  {
    chave: 'formaPedirPalavra',
    rotulo: 'Como pedir a palavra (voz e debate)',
    placeholder:
      'Ex: botão "Pedir a palavra" na urna virtual ou inscrição com a mesa presencialmente',
  },
  {
    chave: 'formaColetaVoto',
    rotulo: 'Como o voto é coletado e registrado',
    placeholder:
      'Ex: cédula digital com hash SHA-256 encadeado; o recibo é exibido ao participante ao final',
  },
  {
    chave: 'contatoSuporte',
    rotulo: 'Contato de suporte',
    placeholder: 'Ex: suporte@condominio.com.br • (11) 90000-0000 (WhatsApp)',
  },
  {
    chave: 'avisoResponsabilidade',
    rotulo: 'Aviso sobre falhas de equipamento/conexão',
    placeholder:
      'Ex: a plataforma não se responsabiliza por falhas de conexão ou equipamento do participante; ocorrências devem ser reportadas imediatamente ao suporte.',
    multiline: true,
  },
]

/**
 * Bloco "Instruções de Acesso e Votação Eletrônica" do edital (8 campos obrigatórios).
 * A emissão/disparo é bloqueada enquanto qualquer campo estiver vazio (validarInstrucoesEdital).
 */
export const CardInstrucoesAcesso: React.FC<CardInstrucoesAcessoProps> = ({
  instrucoes,
  onChange,
  onSalvar,
  salvando,
  faltantes,
}) => {
  const valor = instrucoes ?? ({} as InstrucoesAcessoVotacao)
  const preenchidos = CAMPOS.filter((c) => valor[c.chave]?.trim()).length

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#0066FF]" />
            Instruções de Acesso e Votação Eletrônica
          </CardTitle>
          <BadgeObrigatorio faltantes={faltantes.length} preenchidos={preenchidos} />
        </div>
        <CardDescription className="text-xs">
          Bloco obrigatório do edital (art. 1.354-A, §1º, CC). A emissão do edital é bloqueada
          enquanto algum campo estiver vazio.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2.5 text-xs">
        {faltantes.length > 0 && (
          <div className="p-2.5 rounded-md bg-red-50 border border-red-300 text-[11px] text-red-900 leading-relaxed flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong>Emissão bloqueada.</strong> Falta preencher: {faltantes.join('; ')}.
            </div>
          </div>
        )}

        {CAMPOS.map((campo, idx) => (
          <div key={campo.chave} className="space-y-1">
            <Label className="text-[11px] text-slate-700 font-semibold">
              {idx + 1}. {campo.rotulo}
              {valor[campo.chave]?.trim() ? (
                <span className="text-emerald-600 font-normal"> • preenchido</span>
              ) : (
                <span className="text-red-500 font-normal"> • obrigatório</span>
              )}
            </Label>
            {campo.multiline ? (
              <Textarea
                rows={2}
                value={valor[campo.chave] || ''}
                onChange={(e) => onChange({ ...valor, [campo.chave]: e.target.value })}
                placeholder={campo.placeholder}
                className="text-xs resize-none"
              />
            ) : (
              <Input
                type="text"
                value={valor[campo.chave] || ''}
                onChange={(e) => onChange({ ...valor, [campo.chave]: e.target.value })}
                placeholder={campo.placeholder}
                className="text-xs h-8"
              />
            )}
          </div>
        ))}
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          size="sm"
          variant="outline"
          onClick={onSalvar}
          disabled={salvando}
          className="text-xs h-8 border-slate-300 w-full"
        >
          {salvando ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Salvando…
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-1" /> Salvar Instruções (valem para todos os editais)
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

const BadgeObrigatorio: React.FC<{ faltantes: number; preenchidos: number }> = ({
  faltantes,
  preenchidos,
}) =>
  faltantes > 0 ? (
    <BadgeFalso texto={`${preenchidos}/8 preenchidos • ${faltantes} faltando`} tom="vermelho" />
  ) : (
    <BadgeFalso texto="8/8 preenchidos" tom="verde" />
  )

const BadgeFalso: React.FC<{ texto: string; tom: 'vermelho' | 'verde' }> = ({ texto, tom }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
      tom === 'vermelho' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
    }`}
  >
    {texto}
  </span>
)

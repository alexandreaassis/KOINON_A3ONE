import React, { useState, useEffect } from 'react'
import { PainelProcuracao } from './credenciamento/PainelProcuracao'
import { useAuth } from '@/context/AuthContext'
import { useCondoConfig } from '@/context/CondoConfigContext'
import {
  api,
  type CredenciamentoRecord,
  type DeliberacaoRecord,
  type EditalDeliberacaoRecord,
} from '@/lib/api'
import { Link } from 'react-router-dom'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { formatarCpf, validarCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import { formatarIdentificadorUnidade, formatarUnidadeComBloco } from '@/lib/formatadorUnidade'
import { resolverNomeTitular } from '@/lib/titularUnidade'
import {
  UserCheck,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  FileText,
  ShieldCheck,
  Building,
} from 'lucide-react'
import { AvisoSemUnidadeVinculada } from '@/pages/morador/AvisoSemUnidadeVinculada'

export const CredenciamentoPage: React.FC = () => {
  const { user, unidadeSelecionada } = useAuth()
  const { rotuloUnidade } = useCondoConfig()

  const [credExistente, setCredExistente] = useState<CredenciamentoRecord | null>(null)
  const [cpf, setCpf] = useState('')
  const [cpfErro, setCpfErro] = useState<string | null>(null)
  const [titularNome, setTitularNome] = useState('')
  const [tipoVinculo, setTipoVinculo] = useState<string>('proprietario')
  const [arquivos, setArquivos] = useState<FileList | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  // Unidade ativa do morador (selecionada no menu lateral)
  const unidadeAtiva = unidadeSelecionada

  // Estado da Convocação / Edital publicado da deliberação ativa
  const [deliberacaoAtiva, setDeliberacaoAtiva] = useState<DeliberacaoRecord | null>(null)
  const [, setEditalAtivo] = useState<EditalDeliberacaoRecord | null>(null)
  const [convocacaoPublicada, setConvocacaoPublicada] = useState<boolean>(false)
  const [verificandoEdital, setVerificandoEdital] = useState<boolean>(true)

  // Carrega deliberação ativa e valida se a convocação/edital está publicado
  useEffect(() => {
    let ativo = true
    const verificarConvocacao = async () => {
      setVerificandoEdital(true)
      try {
        const delib = await api.getDeliberacaoAtiva()
        if (!ativo) return
        setDeliberacaoAtiva(delib)

        if (delib) {
          const edital = await api.getEditalPorDeliberacao(delib.id)
          if (!ativo) return
          setEditalAtivo(edital)
          // Considera convocação publicada se o edital tiver status "publicado" ou se a deliberação já estiver em andamento/publicada
          const isPublicado =
            edital?.status === 'publicado' ||
            delib.status === 'ABERTA' ||
            delib.status === 'EM_VOTACAO' ||
            delib.status === 'ENCERRADA' ||
            delib.status === 'APURADA' ||
            delib.status === 'PUBLICADA'
          setConvocacaoPublicada(isPublicado)
        } else {
          setEditalAtivo(null)
          setConvocacaoPublicada(false)
        }
      } catch (err) {
        console.error('Erro ao verificar convocação publicada:', err)
        if (ativo) setConvocacaoPublicada(false)
      } finally {
        if (ativo) setVerificandoEdital(false)
      }
    }

    verificarConvocacao()
    return () => {
      ativo = false
    }
  }, [])

  // Carrega credenciamento existente para a unidade ativa no formulário
  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      if (!unidadeAtiva) {
        setCredExistente(null)
        setCarregando(false)
        return
      }
      setCarregando(true)
      try {
        const cred = await api.getCredenciamentoPorUnidade(unidadeAtiva.id)
        if (!ativo) return
        setCredExistente(cred)
        if (cred) {
          setCpf(cred.cpf || '')
          setCpfErro(null)
          setTitularNome(cred.titular_nome || '')
          // tipo_vinculo chega como array do select multivalorado — pega o primeiro
          const vinculo = Array.isArray(cred.tipo_vinculo)
            ? cred.tipo_vinculo[0]
            : cred.tipo_vinculo
          if (vinculo) setTipoVinculo(vinculo)
        } else {
          // Preencher sugestão do titular: cadastro de vínculo (cadastros_unidade)
          // mantido pela mesa; responsavel_nome só como fallback — sem placeholder.
          const nomeTitular = await resolverNomeTitular(unidadeAtiva)
          if (!ativo) return
          setTitularNome(nomeTitular || user?.name || '')
        }
      } catch (err) {
        console.error('Erro ao buscar credenciamento:', err)
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [unidadeAtiva, user])

  // Gestor (admin/mesa) sem unidade vinculada: sem unidade fantasma —
  // não exibe nem submete formulário para unidade inexistente.
  if (!unidadeAtiva) {
    return <AvisoSemUnidadeVinculada modulo="Credenciamento" />
  }

  // Formatar CPF ao digitar
  const handleCpfChange = (val: string) => {
    const formatado = formatarCpf(val)
    setCpf(formatado)
    if (cpfErro) {
      const raw = formatado.replace(/\D/g, '')
      if (raw.length === 11 && validarCpf(formatado)) {
        setCpfErro(null)
      }
    }
  }

  const handleCpfBlur = () => {
    const raw = cpf.replace(/\D/g, '')
    if (!raw) {
      setCpfErro('CPF é obrigatório para o credenciamento.')
    } else if (raw.length !== 11 || !validarCpf(cpf)) {
      setCpfErro(MSG_CPF_INVALIDO)
    } else {
      setCpfErro(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!convocacaoPublicada) {
      toast({
        title: 'Credenciamento Bloqueado',
        description: 'Gere/publicize a convocação antes de credenciar.',
        variant: 'destructive',
      })
      return
    }

    if (!unidadeAtiva) {
      toast({
        title: 'Unidade não selecionada',
        description: 'Por favor selecione a unidade no menu lateral.',
        variant: 'destructive',
      })
      return
    }

    const rawCpf = cpf.replace(/\D/g, '')
    if (!rawCpf) {
      setCpfErro('CPF é obrigatório para o credenciamento.')
      toast({
        title: 'CPF obrigatório',
        description: 'Informe o CPF do titular para realizar o credenciamento.',
        variant: 'destructive',
      })
      return
    }

    if (rawCpf.length !== 11 || !validarCpf(cpf)) {
      setCpfErro(MSG_CPF_INVALIDO)
      toast({
        title: 'CPF inválido',
        description: MSG_CPF_INVALIDO,
        variant: 'destructive',
      })
      return
    }
    setCpfErro(null)

    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append('unidade', unidadeAtiva.id)
      formData.append('cpf', cpf)
      formData.append('titular_nome', titularNome)
      formData.append('tipo_vinculo', tipoVinculo)
      formData.append('status', 'pendente') // aguarda conferência da mesa

      if (arquivos) {
        for (let i = 0; i < arquivos.length; i++) {
          formData.append('documentos', arquivos[i])
        }
      }

      const novo = await api.submeterCredenciamento(formData)
      setCredExistente(novo)
      toast({
        title: 'Documentação enviada',
        description: 'Seu credenciamento foi registrado e será analisado pela Mesa Diretora.',
      })
    } catch (err: any) {
      console.error('Erro ao enviar credenciamento:', err)
      toast({
        title: 'Falha no envio',
        description: err?.message || 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Credenciamento e Vínculo com a Unidade
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Habilitação formal para voto na assembleia do Condomínio Lago Azul (proprietário,
          promitente ou procurador).
        </p>
      </div>

      {/* Alerta de Bloqueio: Convocação Não Publicada */}
      {!verificandoEdital && !convocacaoPublicada && (
        <Alert className="border-amber-300 bg-amber-50/90 text-amber-950 p-4 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="ml-2">
            <AlertTitle className="text-sm font-bold text-amber-900">
              Gere/publicize a convocação antes de credenciar
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-800 mt-1 leading-relaxed">
              O credenciamento de unidades e votantes só pode ser realizado após a publicação formal
              do edital de convocação da assembleia. A convocação precede o credenciamento para
              garantir a legalidade e publicidade do ato condominial.
              <div className="mt-3 flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  className="bg-amber-700 hover:bg-amber-800 text-white font-medium text-xs h-8"
                >
                  <Link to="/mesa/edital">Ir para Edital e Convocação</Link>
                </Button>
                {deliberacaoAtiva && (
                  <span className="text-[11px] text-amber-700">
                    Assembleia ativa: <strong>{deliberacaoAtiva.titulo}</strong> (Status:{' '}
                    {deliberacaoAtiva.status})
                  </span>
                )}
              </div>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Status Atual do Credenciamento */}
      {credExistente && unidadeAtiva && (
        <Card
          className={`border ${
            credExistente.status === 'aprovado'
              ? 'border-emerald-300 bg-emerald-50/50'
              : credExistente.status === 'rejeitado'
                ? 'border-red-300 bg-red-50/50'
                : 'border-blue-300 bg-blue-50/50'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {credExistente.status === 'aprovado' && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                )}
                {credExistente.status === 'rejeitado' && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                {credExistente.status === 'pendente' && <Clock className="h-5 w-5 text-blue-600" />}
                <CardTitle className="text-base font-bold text-slate-900">
                  Status Atual:{' '}
                  <span className="uppercase text-sm">
                    {credExistente.status === 'aprovado'
                      ? 'Aprovado / Apto a Votar'
                      : credExistente.status === 'rejeitado'
                        ? 'Rejeitado pela Mesa'
                        : 'Em Análise pela Mesa'}
                  </span>
                </CardTitle>
              </div>
              <Badge
                className={`shrink-0 text-center leading-normal ${
                  credExistente.status === 'aprovado'
                    ? 'bg-emerald-600 text-white'
                    : credExistente.status === 'rejeitado'
                      ? 'bg-red-600 text-white'
                      : 'bg-blue-600 text-white'
                }`}
              >
                {credExistente.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5 text-slate-700">
            <p>
              <strong>Titular Cadastrado:</strong> {credExistente.titular_nome} •{' '}
              <strong>CPF:</strong> {credExistente.cpf}
            </p>
            <p>
              <strong>Tipo de Vínculo:</strong>{' '}
              {credExistente.tipo_vinculo === 'proprietario'
                ? 'PROPRIETÁRIO (NÃO RESIDENTE)'
                : credExistente.tipo_vinculo === 'condomino'
                  ? 'CONDÔMINO (RESIDENTE)'
                  : credExistente.tipo_vinculo === 'locatario'
                    ? 'LOCATÁRIO (INQUILINO)'
                    : String(credExistente.tipo_vinculo || '').toUpperCase()}{' '}
              • <strong>Unidade:</strong>{' '}
              {formatarIdentificadorUnidade(
                unidadeAtiva?.identificador,
                unidadeAtiva?.tipo_unidade,
                rotuloUnidade,
              )}
            </p>
            {credExistente.motivo_rejeicao && (
              <p className="text-red-700 font-semibold pt-1">
                Motivo da recusa: {credExistente.motivo_rejeicao}
              </p>
            )}
            <p className="text-slate-500 text-[11px] pt-1">
              {credExistente.status === 'aprovado'
                ? 'Sua unidade está credenciada para todas as matérias desta assembleia.'
                : 'Prazo limite de homologação: até o momento da abertura da votação.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Envio / Atualização */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
            <UserCheck className="h-4 w-4 text-cyan-700" /> Formulário de Vínculo Cadastral
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Preencha os dados do titular ou procurador e anexe os documentos comprobatórios (RG/CNH,
            Certidão de Ônus, Contrato ou Procuração).
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Unidade */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Unidade Habitacional</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
                  <Building className="h-4 w-4 text-cyan-700" />
                  <span>{formatarUnidadeComBloco(unidadeAtiva, rotuloUnidade)}</span>
                </div>
              </div>

              {/* Tipo de Vínculo */}
              <div className="space-y-1.5">
                <Label htmlFor="tipoVinculo" className="text-xs font-semibold text-slate-700">
                  Qualificação do Votante
                </Label>
                <Select value={tipoVinculo} onValueChange={setTipoVinculo}>
                  <SelectTrigger id="tipoVinculo" className="h-10 text-xs">
                    <SelectValue placeholder="Selecione o vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprietario">
                      Proprietário (Não Residente na Unidade)
                    </SelectItem>
                    <SelectItem value="condomino">Condômino (Proprietário Residente)</SelectItem>
                    <SelectItem value="locatario">Locatário (Inquilino)</SelectItem>
                    <SelectItem value="promitente">Promitente Comprador</SelectItem>
                    <SelectItem value="usufrutuario">Usufrutuário</SelectItem>
                    <SelectItem value="procurador">Procurador com Poderes Específicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nome Completo do Titular */}
              <div className="space-y-1.5">
                <Label htmlFor="titularNome" className="text-xs font-semibold text-slate-700">
                  Nome Completo do Titular
                </Label>
                <Input
                  id="titularNome"
                  required
                  placeholder="Nome completo conforme documento oficial"
                  value={titularNome}
                  onChange={(e) => setTitularNome(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              {/* CPF do Titular */}
              <div className="space-y-1.5">
                <Label htmlFor="cpf" className="text-xs font-semibold text-slate-700">
                  CPF do Titular (utilizado no 2FA) *
                </Label>
                <Input
                  id="cpf"
                  required
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={cpf}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  onBlur={handleCpfBlur}
                  className={`h-10 text-xs font-mono ${
                    cpfErro ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                {cpfErro ? (
                  <p className="text-[11px] font-medium text-red-600">{cpfErro}</p>
                ) : (
                  <span className="text-[10px] text-slate-400 block">
                    O CPF informado será exigido no momento do login e envio do OTP.
                  </span>
                )}
              </div>
            </div>

            {/* Upload de Documentos */}
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="documentos" className="text-xs font-semibold text-slate-700">
                Documentos Comprobatórios (PDF ou Imagem - máx. 5 MB cada)
              </Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center hover:bg-slate-50 transition-colors">
                <UploadCloud className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
                <div className="text-xs text-slate-600 mb-1">
                  <label
                    htmlFor="documentos"
                    className="font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer underline"
                  >
                    Clique para selecionar os arquivos
                  </label>{' '}
                  ou arraste para esta área
                </div>
                <p className="text-[11px] text-slate-400">
                  Documento de identificação com foto + Comprovante de propriedade ou procuração com
                  poderes específicos.
                </p>
                <input
                  id="documentos"
                  type="file"
                  multiple
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setArquivos(e.target.files)}
                  className="hidden"
                />
              </div>
              {arquivos && arquivos.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-slate-700">Arquivos selecionados:</p>
                  {Array.from(arquivos).map((arq, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 p-1.5 px-2.5 rounded"
                    >
                      <FileText className="h-3.5 w-3.5 text-cyan-700" />
                      <span className="font-medium truncate">{arq.name}</span>
                      <span className="text-[10px] text-slate-400">
                        ({(arq.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Alert className="border-cyan-200 bg-cyan-50/60 text-cyan-950 mt-2">
              <ShieldCheck className="h-4 w-4 text-cyan-700" />
              <AlertTitle className="text-xs font-bold">
                Garantia de Sigilo e Autenticidade
              </AlertTitle>
              <AlertDescription className="text-xs">
                Os documentos são armazenados de forma criptografada e acessados estritamente pela
                Mesa Diretora da assembleia para verificação da legitimidade do voto, nos termos da
                Convenção Condominial e da LGPD.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[11px] text-slate-500">
              {credExistente
                ? 'Ao reenviar, o vínculo anterior será reanalisado.'
                : 'Campos obrigatórios (*)'}
            </span>
            <Button
              type="submit"
              disabled={enviando || (!verificandoEdital && !convocacaoPublicada)}
              className="bg-cyan-700 hover:bg-cyan-800 text-white font-semibold disabled:opacity-50"
              title={
                !convocacaoPublicada ? 'Gere/publicize a convocação antes de credenciar' : undefined
              }
            >
              {enviando
                ? 'Enviando Documentos...'
                : !convocacaoPublicada
                  ? 'Bloqueado (Aguardando Convocação)'
                  : credExistente
                    ? 'Atualizar Credenciamento'
                    : 'Submeter Credenciamento'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Solicitações de credenciamento como PROCURADOR (representando outra unidade) */}
      <PainelProcuracao
        deliberacaoAtiva={deliberacaoAtiva}
        convocacaoPublicada={convocacaoPublicada}
      />
    </div>
  )
}
export default CredenciamentoPage

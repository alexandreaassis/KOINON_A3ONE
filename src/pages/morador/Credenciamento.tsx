import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api, type CredenciamentoRecord } from '@/lib/api'
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

export const CredenciamentoPage: React.FC = () => {
  const { user, unidadeSelecionada } = useAuth()

  const [credExistente, setCredExistente] = useState<CredenciamentoRecord | null>(null)
  const [cpf, setCpf] = useState('')
  const [titularNome, setTitularNome] = useState('')
  const [tipoVinculo, setTipoVinculo] = useState<string>('proprietario')
  const [arquivos, setArquivos] = useState<FileList | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  // Carrega credenciamento existente para a unidade selecionada
  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      if (!unidadeSelecionada) {
        setCarregando(false)
        return
      }
      setCarregando(true)
      try {
        const cred = await api.getCredenciamentoPorUnidade(unidadeSelecionada.id)
        if (!ativo) return
        setCredExistente(cred)
        if (cred) {
          setCpf(cred.cpf)
          setTitularNome(cred.titular_nome)
          setTipoVinculo(cred.tipo_vinculo)
        } else {
          // Preencher sugestão a partir da unidade
          setTitularNome(unidadeSelecionada.responsavel_nome || user?.name || '')
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
  }, [unidadeSelecionada, user])

  // Formatar CPF ao digitar
  const handleCpfChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11)
    let formatado = raw
    if (raw.length > 9) {
      formatado = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`
    } else if (raw.length > 6) {
      formatado = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`
    } else if (raw.length > 3) {
      formatado = `${raw.slice(0, 3)}.${raw.slice(3)}`
    }
    setCpf(formatado)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unidadeSelecionada) {
      toast({
        title: 'Unidade não selecionada',
        description: 'Por favor selecione a unidade ativa no menu lateral.',
        variant: 'destructive',
      })
      return
    }

    if (cpf.replace(/\D/g, '').length !== 11) {
      toast({
        title: 'CPF Inválido',
        description: 'Informe um CPF válido com 11 dígitos.',
        variant: 'destructive',
      })
      return
    }

    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append('unidade', unidadeSelecionada.id)
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
        title: 'Documentação Enviada!',
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

      {/* Status Atual do Credenciamento */}
      {credExistente && (
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
                className={
                  credExistente.status === 'aprovado'
                    ? 'bg-emerald-600 text-white'
                    : credExistente.status === 'rejeitado'
                      ? 'bg-red-600 text-white'
                      : 'bg-blue-600 text-white'
                }
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
              <strong>Tipo de Vínculo:</strong> {credExistente.tipo_vinculo.toUpperCase()} •{' '}
              <strong>Unidade:</strong> Apto {unidadeSelecionada?.identificador}
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
                  <span>
                    Apto {unidadeSelecionada?.identificador} (
                    {unidadeSelecionada?.bloco || 'Lago Azul'})
                  </span>
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
                    <SelectItem value="proprietario">Proprietário Titular</SelectItem>
                    <SelectItem value="promitente">Promitente Comprador</SelectItem>
                    <SelectItem value="usufrutuario">Usufrutuário</SelectItem>
                    <SelectItem value="locatario">Locatário (Conforme Convenção)</SelectItem>
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
                  CPF do Titular (utilizado no 2FA)
                </Label>
                <Input
                  id="cpf"
                  required
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  className="h-10 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  O CPF informado será exigido no momento do login e envio do OTP.
                </span>
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
              <AlertTitle className="text-xs font-bold">Garantia de Sigilo e Fé Pública</AlertTitle>
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
              disabled={enviando}
              className="bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
            >
              {enviando
                ? 'Enviando Documentos...'
                : credExistente
                  ? 'Atualizar Credenciamento'
                  : 'Submeter Credenciamento'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
export default CredenciamentoPage

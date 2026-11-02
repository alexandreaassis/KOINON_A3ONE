import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, type VinculoCadastro } from '@/lib/api'
import { limparCpf, formatarCpf, validarCpf, MSG_CPF_INVALIDO } from '@/lib/cpf'
import { formatarTelefone, limparTelefone } from '@/lib/telefone'
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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { KoinonLogo } from '@/components/brand/KoinonLogo'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { EndossoA3One } from '@/components/brand/EndossoA3One'
import { formatarUnidadeComBloco, temBlocoReal } from '@/lib/formatadorUnidade'
import {
  Building,
  Clock,
  AlertTriangle,
  User,
  CreditCard,
  Calendar,
  Mail,
  Phone,
  ShieldCheck,
  HelpCircle,
  FileCheck2,
  UserPlus,
  LogOut,
  CheckCircle2,
} from 'lucide-react'

interface DadosUnidadePublica {
  identificador: string
  bloco?: string
  tipo_unidade?: string
  tem_bloco: boolean
  tem_condomino?: boolean
  tem_inquilino?: boolean
  tem_proprietario?: boolean
  tem_condomino_aprovado?: boolean
  tem_inquilino_aprovado?: boolean
  tem_proprietario_aprovado?: boolean
  unidade_bloqueada_total?: boolean
  mensagem_bloqueio_geral?: string
  vinculos_permitidos?: string[]
  vinculos_bloqueados?: Record<string, string>
}

const TEXTOS_DECLARACAO: Record<VinculoCadastro, string> = {
  locatario:
    'Declaro, sob as penas da lei, que sou locatário e morador da unidade para a qual estou me cadastrando, na qualidade de inquilino na forma da Lei nº 8.245/91 (Lei do Inquilinato), e que as informações prestadas neste cadastro são verdadeiras. Autorizo o tratamento dos meus dados pessoais exclusivamente para fins de credenciamento e participação na assembleia, nos termos da Lei nº 13.709/2018 (LGPD).',
  condomino:
    'Declaro, sob as penas da lei, que sou proprietário legítimo da unidade para a qual estou me cadastrando, na forma dos arts. 1.228 e 1.331 do Código Civil (Lei nº 10.406/2002), que resido na unidade e que as informações prestadas neste cadastro são verdadeiras. Autorizo o tratamento dos meus dados pessoais exclusivamente para fins de credenciamento e participação na assembleia, nos termos da Lei nº 13.709/2018 (LGPD).',
  proprietario:
    'Declaro, sob as penas da lei, que sou proprietário legítimo da unidade para a qual estou me cadastrando, na forma dos arts. 1.228 e 1.331 do Código Civil (Lei nº 10.406/2002), e que não resido na unidade, cujo cadastro de morador é realizado separadamente. As informações prestadas neste cadastro são verdadeiras. Autorizo o tratamento dos meus dados pessoais exclusivamente para fins de credenciamento e participação na assembleia, nos termos da Lei nº 13.709/2018 (LGPD).',
}

export const CadastroMoradorPublicoPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [carregandoUnidade, setCarregandoUnidade] = useState(true)
  const [erroUnidade, setErroUnidade] = useState<string | null>(null)
  const [unidade, setUnidade] = useState<DadosUnidadePublica | null>(null)
  const [nomeCondominio, setNomeCondominio] = useState('Condomínio Residencial Lago Azul')

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [cpfErro, setCpfErro] = useState<string | null>(null)
  const [dataNascimento, setDataNascimento] = useState('')
  const [dataNascErro, setDataNascErro] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [vinculo, setVinculo] = useState<VinculoCadastro>('condomino')

  // Campos de indicação do morador/proprietário de fato
  const [mostrarIndicacao, setMostrarIndicacao] = useState(false)
  const [indicacaoNome, setIndicacaoNome] = useState('')
  const [indicacaoTelefone, setIndicacaoTelefone] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<{
    mensagem: string
    status: 'pendente' | 'aprovado'
    vinculo_enviado?: string
  } | null>(null)

  // Carregar dados seguros da unidade via token
  useEffect(() => {
    let montado = true
    const resolverToken = async () => {
      if (!token) {
        setErroUnidade('Link de cadastro inválido ou incompleto.')
        setCarregandoUnidade(false)
        return
      }

      setCarregandoUnidade(true)
      setErroUnidade(null)
      try {
        const resp = await api.getUnidadePorTokenPublico(token)
        if (!montado) return
        if (resp?.success && resp.unidade) {
          setUnidade(resp.unidade)
          if (resp.condominio?.nome) {
            setNomeCondominio(resp.condominio.nome)
          }
          // Ajustar seleção de vínculo padrão se o condomino estiver bloqueado mas houver outro vínculo permitido
          const permitidos = resp.unidade.vinculos_permitidos || []
          if (permitidos.length > 0 && !permitidos.includes('condomino')) {
            if (permitidos.includes('proprietario')) {
              setVinculo('proprietario')
            } else if (permitidos.includes('locatario')) {
              setVinculo('locatario')
            }
          }
        } else {
          setErroUnidade('Unidade não localizada ou link desativado.')
        }
      } catch (err: any) {
        if (!montado) return
        console.error('Erro ao resolver token da unidade:', err)
        setErroUnidade(
          err?.data?.message ||
            err?.message ||
            'Não foi possível validar este link de cadastro. Verifique com a administração.',
        )
      } finally {
        if (montado) setCarregandoUnidade(false)
      }
    }

    resolverToken()
    return () => {
      montado = false
    }
  }, [token])

  // Formatar e validar CPF
  const handleCpfChange = (val: string) => {
    const formatado = formatarCpf(val)
    setCpf(formatado)
    const raw = formatado.replace(/\D/g, '')
    if (raw.length === 11) {
      if (!validarCpf(formatado)) {
        setCpfErro(MSG_CPF_INVALIDO)
      } else {
        setCpfErro(null)
      }
    } else {
      setCpfErro(null)
    }
  }

  // Formatar telefone em tempo real e na colagem
  const handleTelefoneChange = (val: string) => {
    const formatado = formatarTelefone(val)
    setTelefone(formatado)
  }

  const handleTelefonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const textoColado = e.clipboardData.getData('text') || ''
    const digitos = limparTelefone(textoColado)
    const formatado = formatarTelefone(digitos)
    setTelefone(formatado)
  }

  // Formatar telefone da indicação
  const handleIndicacaoTelefoneChange = (val: string) => {
    const formatado = formatarTelefone(val)
    setIndicacaoTelefone(formatado)
  }

  const handleIndicacaoTelefonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const textoColado = e.clipboardData.getData('text') || ''
    const digitos = limparTelefone(textoColado)
    const formatado = formatarTelefone(digitos)
    setIndicacaoTelefone(formatado)
  }

  // Validação data de nascimento
  const validarDataNasc = (dataStr: string): boolean => {
    if (!dataStr || !/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
      setDataNascErro('Informe uma data válida (AAAA-MM-DD).')
      return false
    }
    const partes = dataStr.split('-').map(Number)
    const dataObj = new Date(partes[0], partes[1] - 1, partes[2])
    const hoje = new Date()
    hoje.setHours(23, 59, 59, 999)

    if (
      isNaN(dataObj.getTime()) ||
      dataObj.getFullYear() !== partes[0] ||
      dataObj.getMonth() !== partes[1] - 1 ||
      dataObj.getDate() !== partes[2]
    ) {
      setDataNascErro('Data de nascimento inválida.')
      return false
    }

    if (dataObj > hoje) {
      setDataNascErro('A data de nascimento não pode estar no futuro.')
      return false
    }

    if (partes[0] < 1900) {
      setDataNascErro('Ano incompatível (anterior a 1900).')
      return false
    }

    setDataNascErro(null)
    return true
  }

  // Verificar se formulário está completo para habilitar o botão de assinatura
  const formularioValido = (() => {
    if (!nome.trim() || nome.trim().length < 3) return false
    if (!validarCpf(cpf)) return false
    if (!dataNascimento || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) return false
    if (!email.trim() || !email.includes('@')) return false
    const telDigitos = limparTelefone(telefone)
    if (!telDigitos || telDigitos.length < 10) return false
    if (!vinculo) return false
    // Se o vínculo selecionado estiver na lista de bloqueados, não permite submeter
    if (unidade?.vinculos_bloqueados && unidade.vinculos_bloqueados[vinculo]) {
      return false
    }
    return true
  })()

  // Submissão do cadastro assinando eletronicamente
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErroEnvio(null)

    if (!token) {
      setErroEnvio('Token de unidade ausente.')
      return
    }

    if (!nome.trim() || nome.trim().length < 3) {
      setErroEnvio('Informe seu nome completo.')
      return
    }

    if (!validarCpf(cpf)) {
      setCpfErro(MSG_CPF_INVALIDO)
      setErroEnvio(MSG_CPF_INVALIDO)
      return
    }

    if (!validarDataNasc(dataNascimento)) {
      setErroEnvio('Verifique a data de nascimento informada.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setErroEnvio('Informe um e-mail válido para recebimento das convocações.')
      return
    }

    const telDigitos = limparTelefone(telefone)
    if (!telDigitos || telDigitos.length < 10) {
      setErroEnvio('Informe um telefone de contato válido com DDD.')
      return
    }

    // Se preencheu indicação parcial, avisar
    if (mostrarIndicacao && indicacaoNome.trim() && !indicacaoTelefone.trim()) {
      setErroEnvio('Informe o telefone da pessoa indicada.')
      return
    }

    setEnviando(true)
    const textoDeclaracaoSelecionada = TEXTOS_DECLARACAO[vinculo]
    const dataHoraAceite = new Date().toISOString()

    try {
      const resp = await api.submeterCadastroMoradorPublico({
        token,
        nome: nome.trim(),
        cpf: limparCpf(cpf),
        data_nascimento: dataNascimento,
        email: email.trim().toLowerCase(),
        telefone: telefone.trim(),
        vinculo,
        declaracao_vinculo: textoDeclaracaoSelecionada,
        declaracao_assinatura: nome.trim(),
        declaracao_data: dataHoraAceite,
        indicacao_nome: mostrarIndicacao && indicacaoNome.trim() ? indicacaoNome.trim() : undefined,
        indicacao_telefone:
          mostrarIndicacao && indicacaoTelefone.trim() ? indicacaoTelefone.trim() : undefined,
      })

      if (resp?.success) {
        setSucesso({
          mensagem:
            resp.message ||
            'Cadastro enviado com sucesso! Seus dados e a assinatura eletrônica da declaração foram registrados e estão pendentes de homologação da mesa diretora.',
          status: resp.status || 'pendente',
          vinculo_enviado: vinculo,
        })
      } else {
        setErroEnvio(resp?.message || 'Falha ao registrar cadastro.')
      }
    } catch (err: any) {
      console.error('Erro ao submeter cadastro:', err)
      setErroEnvio(
        err?.data?.message ||
          err?.message ||
          'Não foi possível registrar seu cadastro no momento. Tente novamente mais tarde.',
      )
    } finally {
      setEnviando(false)
    }
  }

  // Ação: Sair sem cadastrar (descarta o preenchimento e sai da página)
  const handleSairSemCadastrar = () => {
    setNome('')
    setCpf('')
    setCpfErro(null)
    setDataNascimento('')
    setDataNascErro(null)
    setEmail('')
    setTelefone('')
    setIndicacaoNome('')
    setIndicacaoTelefone('')
    setMostrarIndicacao(false)
    setErroEnvio(null)
    navigate('/login')
  }

  // Recarregar os dados da unidade via token para atualizar matriz de ocupação
  const recarregarUnidade = async () => {
    if (!token) return
    try {
      const resp = await api.getUnidadePorTokenPublico(token)
      if (resp?.success && resp.unidade) {
        setUnidade(resp.unidade)
      }
    } catch {
      /* intentionally ignored */
    }
  }

  // Ação para realizar o segundo cadastro na mesma unidade (ex: inquilino cadastrado -> cadastrar proprietário)
  const prepararSegundoCadastro = (novoVinculoSugerido: VinculoCadastro) => {
    setNome('')
    setCpf('')
    setCpfErro(null)
    setDataNascimento('')
    setDataNascErro(null)
    setEmail('')
    setTelefone('')
    setIndicacaoNome('')
    setIndicacaoTelefone('')
    setMostrarIndicacao(false)
    setVinculo(novoVinculoSugerido)
    setErroEnvio(null)
    setSucesso(null)
    recarregarUnidade()
  }

  // Rótulo da Unidade (ex: "Apto 1203" ou "Apto 1203 (Bloco B)" se houver bloco real)
  const rotuloUnidadeCompleto = (() => {
    if (!unidade) return ''
    return formatarUnidadeComBloco(unidade, 'Apto')
  })()

  const possuiBloco = (() => {
    if (!unidade) return false
    return temBlocoReal(unidade.bloco, unidade.tipo_unidade)
  })()

  // Rótulo do vínculo do outro para o botão de indicação
  const rotuloOutraPessoa =
    vinculo === 'locatario'
      ? 'proprietário'
      : vinculo === 'proprietario'
        ? 'inquilino (morador)'
        : 'morador / proprietário de fato'

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F7FC] text-[#002B5E] font-['Poppins',sans-serif]">
      {/* Cabeçalho Público Koinon */}
      <header className="border-b border-[#5A6B82]/20 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <KoinonLogo size={46} variant="color" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5A6B82] hidden sm:inline">
              Cadastro Oficial da Unidade
            </span>
            <div className="h-2 w-2 rounded-full bg-[#0066FF]" />
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl flex flex-col items-center gap-4">
          <Card className="w-full border border-[#5A6B82]/20 bg-white shadow-[0_4px_24px_rgba(0,43,94,0.06)] rounded-[14px]">
            <CardHeader className="text-center pb-3 pt-6">
              <div className="mx-auto mb-3 flex items-center justify-center">
                <KoinonSymbol size={68} variant="color" />
              </div>
              <div className="inline-block self-center text-[11px] font-semibold tracking-wider text-[#002B5E] bg-[#0066FF]/10 border border-[#0066FF]/25 px-2.5 py-0.5 rounded-[8px] mb-2">
                Plataforma Virtual Koinon
              </div>
              <CardTitle className="text-2xl font-semibold tracking-[-0.02em] text-[#002B5E]">
                {nomeCondominio}
              </CardTitle>
              <CardDescription className="text-xs text-[#5A6B82] max-w-md mx-auto">
                Atualização cadastral oficial para habilitação em assembleias, deliberações e
                comunicações formais.
              </CardDescription>

              {/* Box de Identificação da Unidade e Orientação em Tópicos */}
              {unidade && !carregandoUnidade && (
                <div className="mt-4 space-y-2">
                  <div className="p-3 rounded-[10px] bg-[#002B5E]/5 border border-[#002B5E]/15 flex items-center justify-center gap-2 text-xs font-semibold text-[#002B5E]">
                    <Building className="h-4 w-4 text-[#0066FF] shrink-0" />
                    <span>{rotuloUnidadeCompleto}</span>
                    {!possuiBloco && (
                      <span className="text-[10px] font-normal text-[#5A6B82] bg-white px-2 py-0.5 rounded border border-[#5A6B82]/20">
                        Torre única (—)
                      </span>
                    )}
                  </div>

                  {/* Orientação oficial em tópicos aprovados */}
                  <div className="p-3 rounded-[10px] bg-[#0066FF]/5 border border-[#0066FF]/20 text-left text-[11px] text-[#002B5E] space-y-1.5">
                    <p className="font-semibold text-[#002B5E] flex items-center gap-1.5 text-xs">
                      <HelpCircle className="h-3.5 w-3.5 text-[#0066FF]" />
                      Quem deve se cadastrar nesta unidade?
                    </p>
                    <ul className="text-[#5A6B82] leading-relaxed space-y-1 pl-1">
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#0066FF] font-bold">•</span>
                        <span>
                          <strong>Condômino residente:</strong> proprietário que mora no imóvel
                          (cadastro único suficiente).
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#0066FF] font-bold">•</span>
                        <span>
                          <strong>Imóvel alugado:</strong> este mesmo link permite cadastrar o{' '}
                          <strong>Inquilino</strong> (morador).
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#0066FF] font-bold">•</span>
                        <span>
                          <strong>Proprietário (não morador)</strong>, totalizando até 2 pessoas por
                          unidade.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              {/* Estado: Carregando */}
              {carregandoUnidade && (
                <div className="py-12 text-center text-xs text-[#5A6B82] space-y-2">
                  <div className="h-6 w-6 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Validando link oficial da unidade...</p>
                </div>
              )}

              {/* Estado: Erro na Unidade / Link Inválido */}
              {!carregandoUnidade && erroUnidade && (
                <Alert
                  variant="destructive"
                  className="border border-red-200 bg-red-50 text-red-900 rounded-[10px]"
                >
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-xs font-semibold text-red-700">
                    Link de cadastro não localizado
                  </AlertTitle>
                  <AlertDescription className="text-xs text-[#002B5E] mt-1">
                    {erroUnidade}
                    <p className="mt-2 text-[11px] text-[#5A6B82]">
                      Solicite um novo link à administração ou mesa diretora do condomínio.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Estado: Sucesso no Envio (Pendente ou Aprovado) */}
              {sucesso && (
                <div className="py-6 px-4 text-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
                    <Clock className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-[#002B5E]">
                      Cadastro Enviado com Sucesso!
                    </h3>
                    <p className="text-xs text-[#5A6B82] max-w-md mx-auto leading-relaxed">
                      {sucesso.mensagem}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-[10px] bg-[#F3F7FC] border border-[#5A6B82]/20 text-left text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-[#002B5E]">
                      <ShieldCheck className="h-4 w-4 text-[#0066FF]" />
                      <span>Declaração e Assinatura Eletrônica Registradas</span>
                    </div>
                    <ul className="text-[11px] text-[#5A6B82] space-y-1 list-disc pl-4">
                      <li>
                        A declaração legal correspondente ao vínculo foi formalmente assinada e
                        anexada ao seu cadastro com registro de data/hora e IP.
                      </li>
                      <li>A mesa diretora conferirá os dados cadastrados para a unidade.</li>
                      <li>
                        Após a homologação, a confirmação oficial será encaminhada por e-mail.
                      </li>
                      <li>
                        Os cadastros aprovados ficam habilitados para as deliberações e votações da
                        assembleia.
                      </li>
                    </ul>
                  </div>

                  {/* Seção de segundo cadastro na mesma unidade quando aplicável */}
                  {sucesso.vinculo_enviado === 'locatario' && (
                    <div className="p-3 rounded-[10px] bg-amber-50 border border-amber-200 text-left text-xs space-y-2">
                      <span className="font-bold text-amber-900 block flex items-center gap-1.5">
                        <User className="h-4 w-4 text-amber-700" />
                        Cadastrar também o Proprietário desta unidade?
                      </span>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Como foi cadastrado um <strong>Inquilino</strong>, a unidade ainda necessita
                        do cadastro do <strong>Proprietário (não morador)</strong>. Você pode
                        cadastrá-lo agora mesmo usando este mesmo link.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => prepararSegundoCadastro('proprietario')}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-8"
                      >
                        Cadastrar Proprietário da Unidade Agora
                      </Button>
                    </div>
                  )}

                  {sucesso.vinculo_enviado === 'proprietario' && (
                    <div className="p-3 rounded-[10px] bg-cyan-50 border border-cyan-200 text-left text-xs space-y-2">
                      <span className="font-bold text-cyan-900 block flex items-center gap-1.5">
                        <User className="h-4 w-4 text-cyan-700" />
                        A unidade é alugada e possui Inquilino morador?
                      </span>
                      <p className="text-[11px] text-cyan-800 leading-relaxed">
                        Se a unidade estiver locada, você também pode registrar o{' '}
                        <strong>Inquilino (morador)</strong> por este mesmo link.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => prepararSegundoCadastro('locatario')}
                        className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-xs h-8"
                      >
                        Cadastrar Inquilino Morador
                      </Button>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => prepararSegundoCadastro('condomino')}
                      className="text-xs h-9 border-[#5A6B82]/30 text-[#002B5E] hover:bg-[#F3F7FC] rounded-[10px]"
                    >
                      Novo Envio para esta Unidade
                    </Button>
                    <Link to="/login">
                      <Button
                        variant="default"
                        className="text-xs h-9 bg-[#002B5E] text-white hover:bg-[#001D40] rounded-[10px]"
                      >
                        Ir para a página de entrada
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Estado: Unidade Bloqueada Totalmente para novos cadastros */}
              {!carregandoUnidade &&
                !erroUnidade &&
                !sucesso &&
                unidade &&
                unidade.unidade_bloqueada_total && (
                  <div className="py-6 px-3 text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-[#002B5E]">
                        Unidade com Cadastro Completo
                      </h3>
                      <p className="text-xs text-[#5A6B82] max-w-md mx-auto leading-relaxed font-medium">
                        {unidade.mensagem_bloqueio_geral ||
                          'Esta unidade já possui o limite de cadastros atingido.'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-[10px] bg-[#F3F7FC] border border-[#5A6B82]/20 text-left text-xs space-y-2">
                      <p className="text-[11px] text-[#5A6B82] leading-relaxed">
                        • Se você precisa atualizar ou substituir um morador/inquilino anterior, a
                        alteração é realizada pela mesa diretora da assembleia condominial.
                      </p>
                      <p className="text-[11px] text-[#5A6B82] leading-relaxed">
                        • Caso necessite de orientações adicionais ou suporte, procure a
                        administração ou a mesa diretora do condomínio.
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-2">
                      <Link to="/login">
                        <Button
                          variant="default"
                          className="text-xs h-9 bg-[#002B5E] text-white hover:bg-[#001D40] rounded-[10px]"
                        >
                          Ir para a página de entrada
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

              {/* Estado: Formulário Ativo (quando a unidade aceita pelo menos um vínculo) */}
              {!carregandoUnidade &&
                !erroUnidade &&
                !sucesso &&
                unidade &&
                !unidade.unidade_bloqueada_total && (
                  <>
                    {erroEnvio && (
                      <Alert
                        variant="destructive"
                        className="border border-red-200 bg-red-50 text-red-900 rounded-[10px]"
                      >
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                        <div>
                          <AlertTitle className="text-xs font-semibold text-red-700">
                            Não foi possível enviar o cadastro
                          </AlertTitle>
                          <AlertDescription className="text-xs text-[#002B5E] mt-0.5">
                            {erroEnvio}
                          </AlertDescription>
                        </div>
                      </Alert>
                    )}

                    {/* Alerta contextual se houver algum vínculo bloqueado previamente */}
                    {unidade.vinculos_bloqueados && unidade.vinculos_bloqueados[vinculo] && (
                      <Alert className="border border-amber-200 bg-amber-50 text-amber-900 rounded-[10px]">
                        <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                        <div>
                          <AlertTitle className="text-xs font-semibold text-amber-800">
                            Vínculo não disponível para esta unidade
                          </AlertTitle>
                          <AlertDescription className="text-xs text-amber-900 mt-0.5">
                            {unidade.vinculos_bloqueados[vinculo]}
                          </AlertDescription>
                        </div>
                      </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                      {/* Nome Completo */}
                      <div className="space-y-1.5">
                        <Label htmlFor="cad-nome" className="text-xs font-medium text-[#002B5E]">
                          Nome Completo *
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                          <Input
                            id="cad-nome"
                            required
                            placeholder="Informe seu nome completo"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="pl-10 h-10 border-[#5A6B82]/30 bg-white text-[#002B5E] placeholder:text-[#5A6B82] rounded-[10px] focus-visible:ring-[#0066FF] focus-visible:border-[#0066FF]"
                          />
                        </div>
                      </div>

                      {/* CPF e Data de Nascimento */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="cad-cpf" className="text-xs font-medium text-[#002B5E]">
                            CPF *
                          </Label>
                          <div className="relative">
                            <CreditCard className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                            <Input
                              id="cad-cpf"
                              required
                              placeholder="000.000.000-00"
                              maxLength={14}
                              value={cpf}
                              onChange={(e) => handleCpfChange(e.target.value)}
                              className={`pl-10 h-10 font-mono border-[#5A6B82]/30 bg-white text-[#002B5E] placeholder:text-[#5A6B82] rounded-[10px] focus-visible:ring-[#0066FF] focus-visible:border-[#0066FF] ${
                                cpfErro ? 'border-red-500 focus-visible:ring-red-500' : ''
                              }`}
                            />
                          </div>
                          {cpfErro && <p className="text-[10px] text-red-600">{cpfErro}</p>}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="cad-nasc" className="text-xs font-medium text-[#002B5E]">
                            Data de Nascimento *
                          </Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                            <Input
                              id="cad-nasc"
                              type="date"
                              required
                              max={new Date().toISOString().slice(0, 10)}
                              value={dataNascimento}
                              onChange={(e) => {
                                setDataNascimento(e.target.value)
                                validarDataNasc(e.target.value)
                              }}
                              className={`pl-10 h-10 border-[#5A6B82]/30 bg-white text-[#002B5E] placeholder:text-[#5A6B82] rounded-[10px] focus-visible:ring-[#0066FF] focus-visible:border-[#0066FF] ${
                                dataNascErro ? 'border-red-500 focus-visible:ring-red-500' : ''
                              }`}
                            />
                          </div>
                          {dataNascErro && (
                            <p className="text-[10px] text-red-600">{dataNascErro}</p>
                          )}
                        </div>
                      </div>

                      {/* Vínculo com a Unidade */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="cad-vinculo"
                            className="text-xs font-medium text-[#002B5E]"
                          >
                            Seu Vínculo com esta Unidade *
                          </Label>
                          <span className="text-[11px] text-[#5A6B82]">
                            Defina se você mora na unidade
                          </span>
                        </div>
                        <Select
                          value={vinculo}
                          onValueChange={(val) => setVinculo(val as VinculoCadastro)}
                        >
                          <SelectTrigger
                            id="cad-vinculo"
                            className="h-10 border-[#5A6B82]/30 bg-white text-[#002B5E] rounded-[10px] text-xs focus-visible:ring-[#0066FF]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem
                              value="condomino"
                              disabled={
                                !!(
                                  unidade.vinculos_bloqueados &&
                                  unidade.vinculos_bloqueados['condomino']
                                )
                              }
                            >
                              Condômino (residente) — Proprietário que mora no imóvel
                              {unidade.vinculos_bloqueados &&
                                unidade.vinculos_bloqueados['condomino'] &&
                                ' (Indisponível)'}
                            </SelectItem>
                            <SelectItem
                              value="locatario"
                              disabled={
                                !!(
                                  unidade.vinculos_bloqueados &&
                                  unidade.vinculos_bloqueados['locatario']
                                )
                              }
                            >
                              Locatário (Inquilino) — Morador da unidade
                              {unidade.vinculos_bloqueados &&
                                unidade.vinculos_bloqueados['locatario'] &&
                                ' (Indisponível)'}
                            </SelectItem>
                            <SelectItem
                              value="proprietario"
                              disabled={
                                !!(
                                  unidade.vinculos_bloqueados &&
                                  unidade.vinculos_bloqueados['proprietario']
                                )
                              }
                            >
                              Proprietário (não morador) — Não reside na unidade
                              {unidade.vinculos_bloqueados &&
                                unidade.vinculos_bloqueados['proprietario'] &&
                                ' (Indisponível)'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-[#5A6B82]">
                          {vinculo === 'proprietario'
                            ? 'Proprietário legítimo titular que não reside nesta unidade.'
                            : vinculo === 'locatario'
                              ? 'Morador na qualidade de inquilino (Lei do Inquilinato nº 8.245/91).'
                              : 'Proprietário legítimo residente na unidade (Código Civil arts. 1.228 e 1.331).'}
                        </p>

                        {/* DECLARAÇÃO DINÂMICA POR VÍNCULO (textos exatos aprovados) */}
                        <div className="mt-2.5 p-3.5 rounded-[10px] bg-[#002B5E]/5 border border-[#002B5E]/15 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#002B5E]">
                            <FileCheck2 className="h-4 w-4 text-[#0066FF] shrink-0" />
                            <span>
                              Declaração de Vínculo Legal —{' '}
                              {vinculo === 'locatario'
                                ? 'Locatário (Inquilino)'
                                : vinculo === 'condomino'
                                  ? 'Condômino (residente)'
                                  : 'Proprietário (não morador)'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#002B5E]/90 leading-relaxed italic bg-white/70 p-2.5 rounded-[8px] border border-[#5A6B82]/15">
                            "{TEXTOS_DECLARACAO[vinculo]}"
                          </p>
                          <p className="text-[10px] text-[#5A6B82]">
                            A assinatura eletrônica desta declaração vincula o declarante sob as
                            penas da lei e autoriza o tratamento para credenciamento e assembleia
                            (LGPD).
                          </p>
                        </div>
                      </div>

                      {/* Contatos */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="cad-email" className="text-xs font-medium text-[#002B5E]">
                            E-mail Oficial *
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                            <Input
                              id="cad-email"
                              type="email"
                              required
                              placeholder="seuemail@exemplo.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="pl-10 h-10 border-[#5A6B82]/30 bg-white text-[#002B5E] placeholder:text-[#5A6B82] rounded-[10px] focus-visible:ring-[#0066FF] focus-visible:border-[#0066FF]"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="cad-tel" className="text-xs font-medium text-[#002B5E]">
                            Telefone / WhatsApp *
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-[#5A6B82]" />
                            <Input
                              id="cad-tel"
                              type="tel"
                              required
                              placeholder="(XX) XXXXX-XXXX"
                              maxLength={15}
                              value={telefone}
                              onChange={(e) => handleTelefoneChange(e.target.value)}
                              onPaste={handleTelefonePaste}
                              className="pl-10 h-10 font-mono border-[#5A6B82]/30 bg-white text-[#002B5E] placeholder:text-[#5A6B82] rounded-[10px] focus-visible:ring-[#0066FF] focus-visible:border-[#0066FF]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seção opcional de indicação do morador/proprietário de fato */}
                      <div className="space-y-2 pt-1 border-t border-[#5A6B82]/15">
                        <div className="flex items-center justify-between">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setMostrarIndicacao((prev) => !prev)}
                            className="text-xs text-[#0066FF] hover:text-[#0052CC] hover:bg-[#0066FF]/10 font-semibold h-8 px-2 flex items-center gap-1.5"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            {mostrarIndicacao
                              ? 'Ocultar indicação de morador/proprietário de fato'
                              : 'Indicar o morador/proprietário de fato'}
                          </Button>
                          <span className="text-[10px] text-[#5A6B82]">
                            {vinculo === 'locatario'
                              ? 'O inquilino indica o proprietário'
                              : vinculo === 'proprietario'
                                ? 'O proprietário indica o inquilino'
                                : 'Opcional'}
                          </span>
                        </div>

                        {mostrarIndicacao && (
                          <div className="p-3.5 rounded-[10px] bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in-50">
                            <div>
                              <span className="text-xs font-semibold text-[#002B5E] block">
                                Dados da outra pessoa vinculada à unidade ({rotuloOutraPessoa})
                              </span>
                              <p className="text-[11px] text-[#5A6B82] mt-0.5">
                                Estes dados serão encaminhados junto do cadastro pendente para a
                                mesa diretora entrar em contato e providenciar o registro
                                complementar.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label
                                  htmlFor="cad-ind-nome"
                                  className="text-[11px] font-medium text-[#002B5E]"
                                >
                                  Nome Completo da pessoa indicada
                                </Label>
                                <div className="relative">
                                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#5A6B82]" />
                                  <Input
                                    id="cad-ind-nome"
                                    placeholder="Nome completo do morador/proprietário"
                                    value={indicacaoNome}
                                    onChange={(e) => setIndicacaoNome(e.target.value)}
                                    className="pl-8 h-9 text-xs border-[#5A6B82]/30 bg-white text-[#002B5E] rounded-[8px]"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label
                                  htmlFor="cad-ind-tel"
                                  className="text-[11px] font-medium text-[#002B5E]"
                                >
                                  Telefone com DDD
                                </Label>
                                <div className="relative">
                                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#5A6B82]" />
                                  <Input
                                    id="cad-ind-tel"
                                    type="tel"
                                    placeholder="(XX) XXXXX-XXXX"
                                    maxLength={15}
                                    value={indicacaoTelefone}
                                    onChange={(e) => handleIndicacaoTelefoneChange(e.target.value)}
                                    onPaste={handleIndicacaoTelefonePaste}
                                    className="pl-8 h-9 text-xs font-mono border-[#5A6B82]/30 bg-white text-[#002B5E] rounded-[8px]"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Nota de Segurança e Homologação */}
                      <div className="p-3 rounded-[10px] bg-[#0066FF]/5 border border-[#0066FF]/20 flex items-start gap-2 text-[11px] text-[#002B5E]">
                        <Clock className="h-4 w-4 text-[#0066FF] shrink-0 mt-0.5" />
                        <div>
                          <strong>Aprovação da Mesa Diretora:</strong> Após o envio e a assinatura
                          eletrônica da declaração, seu cadastro ficará com status <em>Pendente</em>{' '}
                          até a conferência e homologação pela mesa diretora da assembleia
                          condominial.
                        </div>
                      </div>

                      {/* BOTÕES DE AÇÃO: Assinar eletronicamente + Sair sem cadastrar */}
                      <div className="pt-2 space-y-2">
                        <Button
                          type="submit"
                          disabled={enviando || !formularioValido}
                          className={`w-full h-11 text-white font-semibold rounded-[10px] shadow-none border-0 text-xs focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 flex items-center justify-center gap-2 ${
                            formularioValido && !enviando
                              ? 'bg-[#0066FF] hover:bg-[#0052CC] cursor-pointer'
                              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {enviando
                            ? 'Gravando Assinatura...'
                            : 'Assinar declaração eletronicamente'}
                        </Button>

                        {!formularioValido && (
                          <p className="text-[10px] text-center text-[#5A6B82]">
                            Preencha todos os campos obrigatórios acima para habilitar a assinatura
                            eletrônica da declaração.
                          </p>
                        )}

                        <div className="flex items-center justify-center pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSairSemCadastrar}
                            className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 h-8 px-3 rounded-[8px] flex items-center gap-1.5"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            Sair sem cadastrar
                          </Button>
                        </div>
                      </div>
                    </form>
                  </>
                )}
            </CardContent>

            <CardFooter className="flex flex-col items-center justify-center border-t border-[#5A6B82]/15 py-3 text-center">
              <p className="text-[11px] text-[#5A6B82]">
                Plataforma Virtual Koinon • Proteção de Dados • Homologação pela Mesa Diretora
              </p>
            </CardFooter>
          </Card>

          {/* Selo Koinon: uma solução A3ONE centralizado abaixo do card */}
          <EndossoA3One variant="color" layout="stacked" className="py-2" />
        </div>
      </main>

      {/* Rodapé Institucional Koinon */}
      <footer className="border-t border-white/10 bg-[#002B5E] py-5 px-6 text-white text-xs">
        <div className="mx-auto flex max-w-4xl flex-col sm:flex-row items-center justify-between gap-3">
          <KoinonLogo size={36} variant="negative" />
          <EndossoA3One variant="on-navy" layout="inline" />
        </div>
      </footer>
    </div>
  )
}

export default CadastroMoradorPublicoPage

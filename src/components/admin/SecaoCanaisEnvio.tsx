import React, { useState, useEffect } from 'react'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import { api, type CanaisEnvioData, type SmtpEncryption } from '@/lib/api'
import {
  formatarTelefone,
  limparTelefone,
  converterParaWhatsappInternacional,
} from '@/lib/telefone'
import {
  Mail,
  Send,
  MessageSquare,
  MessageCircle,
  ExternalLink,
  Server,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldCheck,
  RefreshCw,
  Save,
} from 'lucide-react'

interface SecaoCanaisEnvioProps {
  nomeCondominioPadrao?: string
}

export const SecaoCanaisEnvio: React.FC<SecaoCanaisEnvioProps> = ({
  nomeCondominioPadrao = 'Condomínio Residencial Lago Azul',
}) => {
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)

  // Campos de envio
  const [emailOficial, setEmailOficial] = useState('')
  const [nomeRemetente, setNomeRemetente] = useState('')
  const [whatsappOficial, setWhatsappOficial] = useState('')

  // Credenciais SMTP
  const [smtpAtivo, setSmtpAtivo] = useState(false)
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState<number>(587)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpEncryption, setSmtpEncryption] = useState<SmtpEncryption>('starttls')

  // Senha confidencial protegida
  const [smtpPass, setSmtpPass] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [temSenhaSalva, setTemSenhaSalva] = useState(false)
  const [removerSenhaSalva, setRemoverSenhaSalva] = useState(false)

  // E-mail de teste
  const [emailTesteDestino, setEmailTesteDestino] = useState('')
  const [ultimoResultadoTeste, setUltimoResultadoTeste] = useState<{
    sucesso: boolean
    mensagem: string
    canal?: string
    remetente?: string
    dataHora?: string
  } | null>(null)

  // Teste de WhatsApp
  const [whatsappTesteDestino, setWhatsappTesteDestino] = useState('')
  const [testandoWhatsapp, setTestandoWhatsapp] = useState(false)
  const [avisoValidacaoWhatsapp, setAvisoValidacaoWhatsapp] = useState<string | null>(null)
  const [ultimoResultadoWhatsapp, setUltimoResultadoWhatsapp] = useState<{
    sucesso: boolean
    mensagem: string
    numeroFormatado?: string
    numeroInternacional?: string
    urlWaMe?: string
    dataHora?: string
  } | null>(null)

  // Carregar dados iniciais do backend seguro
  const carregarCanais = async () => {
    setCarregando(true)
    try {
      const dados: CanaisEnvioData = await api.getCanaisEnvio()
      setEmailOficial(dados.email_oficial || '')
      setNomeRemetente(dados.nome_remetente || '')
      setWhatsappOficial(dados.whatsapp_oficial ? formatarTelefone(dados.whatsapp_oficial) : '')
      setSmtpHost(dados.smtp_host || '')
      setSmtpPort(dados.smtp_port || 587)
      setSmtpUser(dados.smtp_user || '')
      setSmtpEncryption(dados.smtp_encryption || 'starttls')
      setSmtpAtivo(Boolean(dados.smtp_ativo))
      setTemSenhaSalva(Boolean(dados.tem_senha_smtp))
      setSmtpPass('')
      setRemoverSenhaSalva(false)
    } catch (err) {
      console.error('Erro ao carregar canais de envio:', err)
      toast({
        title: 'Aviso',
        description: 'Não foi possível carregar as credenciais de envio existentes.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarCanais()
  }, [])

  // Máscara e colagem do WhatsApp com suporte a símbolos
  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarTelefone(e.target.value)
    setWhatsappOficial(formatado)
  }

  const handleWhatsappPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const texto = e.clipboardData.getData('text')
    const limpo = limparTelefone(texto)
    setWhatsappOficial(formatarTelefone(limpo))
  }

  // Máscara e colagem do campo Testar WhatsApp com tolerância a símbolos/letras/espaços
  const handleWhatsappTesteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarTelefone(e.target.value)
    setWhatsappTesteDestino(formatado)
    if (avisoValidacaoWhatsapp) {
      setAvisoValidacaoWhatsapp(null)
    }
  }

  const handleWhatsappTestePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const texto = e.clipboardData.getData('text')
    const limpo = limparTelefone(texto)
    setWhatsappTesteDestino(formatarTelefone(limpo))
    if (avisoValidacaoWhatsapp) {
      setAvisoValidacaoWhatsapp(null)
    }
  }

  // Abrir no WhatsApp: validação, conversão 55, chamada da API para auditoria no Histórico e window.open(wa.me)
  const handleAbrirWhatsAppTeste = async () => {
    const conversao = converterParaWhatsappInternacional(whatsappTesteDestino)

    if (!conversao.valido) {
      const msg = `Número incompleto. Informe o DDD e o número com pelo menos 10 dígitos (faltam ${conversao.faltamDigitos} dígito${conversao.faltamDigitos > 1 ? 's' : ''}).`
      setAvisoValidacaoWhatsapp(msg)
      toast({
        title: 'Número incompleto',
        description: msg,
        variant: 'destructive',
      })
      return
    }

    setAvisoValidacaoWhatsapp(null)
    setTestandoWhatsapp(true)

    try {
      const resp = await api.testarCanalEnvioWhatsapp(conversao.digitosNacionais)
      const urlWaMe = resp.data?.url_wame || `https://wa.me/${conversao.numeroInternacional}`

      setUltimoResultadoWhatsapp({
        sucesso: true,
        mensagem:
          resp.message ||
          `Conversa aberta para ${resp.data?.numero_formatado || conversao.formatado}.`,
        numeroFormatado: resp.data?.numero_formatado || conversao.formatado,
        numeroInternacional: resp.data?.numero_internacional || conversao.numeroInternacional,
        urlWaMe,
        dataHora: resp.data?.data_hora || new Date().toLocaleTimeString('pt-BR'),
      })

      toast({
        title: 'Abrindo no WhatsApp',
        description: `Teste registrado no Histórico de Alterações para ${resp.data?.numero_formatado || conversao.formatado}.`,
      })

      // Abrir o wa.me em nova aba
      window.open(urlWaMe, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      console.error('Falha ao preparar teste de WhatsApp:', err)
      const msg = err?.message || 'Falha ao registrar e abrir o teste no WhatsApp.'
      setUltimoResultadoWhatsapp({
        sucesso: false,
        mensagem: msg,
        dataHora: new Date().toLocaleTimeString('pt-BR'),
      })

      toast({
        title: 'Aviso no teste de WhatsApp',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setTestandoWhatsapp(false)
    }
  }

  // Salvar alterações
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const resp = await api.salvarCanaisEnvio({
        email_oficial: emailOficial.trim(),
        nome_remetente: nomeRemetente.trim(),
        whatsapp_oficial: whatsappOficial.trim(),
        smtp_host: smtpHost.trim(),
        smtp_port: Number(smtpPort) || 587,
        smtp_user: smtpUser.trim(),
        smtp_encryption: smtpEncryption,
        smtp_ativo: smtpAtivo,
        smtp_pass: smtpPass,
        limpar_senha_smtp: removerSenhaSalva,
      })

      if (resp.data) {
        setTemSenhaSalva(Boolean(resp.data.tem_senha_smtp))
        setSmtpPass('')
        setRemoverSenhaSalva(false)
      }

      toast({
        title: 'Canais de envio salvos',
        description: 'E-mail oficial, WhatsApp e credenciais SMTP foram atualizados com sucesso.',
      })
    } catch (err: any) {
      console.error('Erro ao salvar canais de envio:', err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao salvar os canais de envio.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Enviar e-mail de teste
  const handleEnviarEmailTeste = async () => {
    setTestando(true)
    try {
      const resp = await api.testarCanalEnvioEmail(emailTesteDestino.trim() || undefined)
      setUltimoResultadoTeste({
        sucesso: true,
        mensagem: resp.message,
        canal: resp.canal,
        remetente: resp.remetente,
        dataHora: new Date().toLocaleTimeString('pt-BR'),
      })

      toast({
        title: 'E-mail de teste enviado!',
        description: `${resp.message} Canal: ${resp.canal || 'Padrão'}.`,
      })
    } catch (err: any) {
      console.error('Falha no teste de e-mail:', err)
      const msg = err?.message || 'Falha ao disparar o e-mail de teste.'
      setUltimoResultadoTeste({
        sucesso: false,
        mensagem: msg,
        dataHora: new Date().toLocaleTimeString('pt-BR'),
      })

      toast({
        title: 'Falha no teste de e-mail',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setTestando(false)
    }
  }

  const remetenteExibicao = nomeRemetente.trim() || `${nomeCondominioPadrao} — Assembleia`
  const emailExibicao = emailOficial.trim() || 'nao-responda@lagoazul.condo'

  return (
    <Card className="border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)] rounded-[14px] bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#F3F7FC] bg-[#F3F7FC]/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-[#002B5E] flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#0066FF]" /> Canais de envio do condomínio
            </CardTitle>
            <CardDescription className="text-xs text-[#5A6B82] mt-0.5">
              Personalize o remetente oficial para que convocações de editais, avisos e mensagens
              saiam no nome e contato do condomínio ({nomeCondominioPadrao}), com suporte a SMTP
              próprio e fallback automático para a plataforma.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                smtpAtivo && smtpHost
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-semibold'
                  : 'border-[#5A6B82]/30 bg-[#F3F7FC] text-[#002B5E] text-[11px] font-semibold'
              }
            >
              {smtpAtivo && smtpHost ? 'SMTP Próprio Ativo' : 'Fallback Plataforma Ativo'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSalvar}>
        <CardContent className="space-y-6 pt-5">
          {/* BLOCO 1: E-MAIL E NOME DE EXIBIÇÃO OFICIAL */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#002B5E] uppercase tracking-wider flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#002B5E] text-white text-[10px]">
                  1
                </span>
                Identidade do Remetente Institucional
              </span>
              <span className="text-[11px] text-[#5A6B82]">
                Aparece no cabeçalho <em>From</em> e <em>Reply-To</em>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* E-mail oficial */}
              <div className="space-y-1.5">
                <Label htmlFor="email_oficial" className="text-xs font-semibold text-slate-700">
                  E-mail oficial do condomínio
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#5A6B82]" />
                  <Input
                    id="email_oficial"
                    type="email"
                    value={emailOficial}
                    onChange={(e) => setEmailOficial(e.target.value)}
                    placeholder="ex: assembleia@lagoazul.com.br"
                    className="h-10 pl-9 text-sm border-slate-300 bg-white"
                  />
                </div>
                <span className="text-[11px] text-slate-500">
                  Endereço utilizado como remetente oficial e resposta das mensagens.
                </span>
              </div>

              {/* Nome de exibição */}
              <div className="space-y-1.5">
                <Label htmlFor="nome_remetente" className="text-xs font-semibold text-slate-700">
                  Nome de exibição do remetente
                </Label>
                <Input
                  id="nome_remetente"
                  value={nomeRemetente}
                  onChange={(e) => setNomeRemetente(e.target.value)}
                  placeholder={`Ex: ${nomeCondominioPadrao} — Assembleia`}
                  className="h-10 text-sm border-slate-300 bg-white"
                />
                <span className="text-[11px] text-slate-500">
                  Nome legível que o condômino vê ao receber a notificação.
                </span>
              </div>
            </div>

            {/* Prévia do Remetente */}
            <div className="p-3 rounded-lg bg-white border border-[#0066FF]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#5A6B82]">Como o condômino visualizará:</span>
                <span className="font-semibold text-[#002B5E] bg-[#F3F7FC] px-2 py-0.5 rounded border border-[#5A6B82]/20">
                  {remetenteExibicao} &lt;{emailExibicao}&gt;
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] text-[#0066FF] border-[#0066FF]/30 self-start sm:self-auto"
              >
                Identidade Koinon
              </Badge>
            </div>
          </div>

          {/* BLOCO 2: WHATSAPP OFICIAL DO CONDOMÍNIO */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#002B5E] uppercase tracking-wider flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#002B5E] text-white text-[10px]">
                  2
                </span>
                WhatsApp Oficial do Condomínio
              </span>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                Contato oficial de referência
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp_oficial" className="text-xs font-semibold text-slate-700">
                  Número de WhatsApp com DDD
                </Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600" />
                  <Input
                    id="whatsapp_oficial"
                    type="tel"
                    value={whatsappOficial}
                    onChange={handleWhatsappChange}
                    onPaste={handleWhatsappPaste}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    className="h-10 pl-9 text-sm border-slate-300 bg-white font-mono tracking-wide"
                  />
                </div>
                <span className="text-[11px] text-slate-500">
                  Máscara automática (XX) XXXXX-XXXX com suporte a colagem direta com símbolos.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-emerald-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Disparo Seguro via Navegador
                </p>
                <p className="text-[11px] leading-relaxed text-emerald-900">
                  Os envios de links pelo WhatsApp continuam usando a sessão local do navegador
                  (wa.me), sem dependência de APIs externas pagas, garantindo entrega direta,
                  privacidade e custo zero.
                </p>
              </div>
            </div>
          </div>

          {/* BLOCO 3: CREDENCIAIS SMTP PRÓPRIAS (COM SENHA BLINDADA) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
              <div>
                <span className="text-xs font-bold text-[#002B5E] uppercase tracking-wider flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#002B5E] text-white text-[10px]">
                    3
                  </span>
                  Servidor SMTP Próprio do Condomínio
                </span>
                <p className="text-[11px] text-[#5A6B82] mt-0.5">
                  Permite que todas as mensagens saiam autenticadas pela infraestrutura do
                  condomínio (Google Workspace, Microsoft 365, Locaweb, Hostgator, cPanel, etc.).
                </p>
              </div>

              {/* Botão de Ativação do SMTP Próprio */}
              <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                <Label
                  htmlFor="smtp_ativo_switch"
                  className="text-xs font-semibold text-[#002B5E] cursor-pointer"
                >
                  {smtpAtivo ? 'Usar SMTP Próprio' : 'Usar Padrão da Plataforma'}
                </Label>
                <Switch
                  id="smtp_ativo_switch"
                  checked={smtpAtivo}
                  onCheckedChange={setSmtpAtivo}
                  className="data-[state=checked]:bg-[#0066FF]"
                />
              </div>
            </div>

            {/* Aviso de Fallback Automático */}
            <Alert
              className={
                smtpAtivo
                  ? 'border-[#0066FF]/30 bg-[#0066FF]/5 text-[#002B5E]'
                  : 'border-slate-200 bg-white text-slate-700'
              }
            >
              <Info className="h-4 w-4 text-[#0066FF]" />
              <AlertTitle className="text-xs font-bold">
                {smtpAtivo
                  ? 'SMTP Próprio Habilitado com Fallback de Contingência'
                  : 'Modo Padrão da Plataforma Ativo'}
              </AlertTitle>
              <AlertDescription className="text-xs mt-0.5 leading-relaxed">
                {smtpAtivo
                  ? 'As notificações tentarão o envio pelo servidor SMTP configurado abaixo. Caso esteja desativado ou incompleto, o sistema realiza fallback automático para a rota padrão da plataforma sem interromper as assembleias.'
                  : 'Os e-mails transacionais (convocações, tokens e atas) estão sendo enviados pela rota oficial padrão da plataforma Koinon com o remetente institucional do condomínio.'}
              </AlertDescription>
            </Alert>

            {/* Campos de Conexão SMTP */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Host */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="smtp_host" className="text-xs font-semibold text-slate-700">
                  Host do Servidor SMTP
                </Label>
                <div className="relative">
                  <Server className="absolute left-3 top-2.5 h-4 w-4 text-[#5A6B82]" />
                  <Input
                    id="smtp_host"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="ex: smtp.gmail.com, mail.lagoazul.com.br"
                    className="h-10 pl-9 text-sm border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Porta */}
              <div className="space-y-1.5">
                <Label htmlFor="smtp_port" className="text-xs font-semibold text-slate-700">
                  Porta
                </Label>
                <Input
                  id="smtp_port"
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  placeholder="587"
                  className="h-10 text-sm border-slate-300 bg-white"
                />
                <span className="text-[10px] text-slate-500">Padrão: 587 (TLS) ou 465 (SSL)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Usuário SMTP */}
              <div className="space-y-1.5">
                <Label htmlFor="smtp_user" className="text-xs font-semibold text-slate-700">
                  Usuário SMTP / Login
                </Label>
                <Input
                  id="smtp_user"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="ex: notificacoes@lagoazul.com.br"
                  className="h-10 text-sm border-slate-300 bg-white"
                />
              </div>

              {/* Chave de Encriptação */}
              <div className="space-y-1.5">
                <Label htmlFor="smtp_encryption" className="text-xs font-semibold text-slate-700">
                  Criptografia de Segurança
                </Label>
                <Select
                  value={smtpEncryption}
                  onValueChange={(val: SmtpEncryption) => setSmtpEncryption(val)}
                >
                  <SelectTrigger
                    id="smtp_encryption"
                    className="h-10 text-sm bg-white border-slate-300"
                  >
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starttls">STARTTLS (recomendado — porta 587)</SelectItem>
                    <SelectItem value="ssl">SSL (porta 465)</SelectItem>
                    <SelectItem value="none">Nenhuma (Conexão simples)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Senha SMTP Protegida (NUNCA exposta pela API) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="smtp_pass" className="text-xs font-semibold text-slate-700">
                    Senha SMTP
                  </Label>
                  {temSenhaSalva && !removerSenhaSalva && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300"
                    >
                      Senha salva e blindada
                    </Badge>
                  )}
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#5A6B82]" />
                  <Input
                    id="smtp_pass"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={smtpPass}
                    onChange={(e) => {
                      setSmtpPass(e.target.value)
                      if (removerSenhaSalva) setRemoverSenhaSalva(false)
                    }}
                    placeholder={
                      temSenhaSalva && !removerSenhaSalva
                        ? '•••••••• (senha salva — deixe vazio para manter)'
                        : 'Digite a senha do SMTP'
                    }
                    className="h-10 pl-9 pr-10 text-sm border-slate-300 bg-white font-mono"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    tabIndex={-1}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    title={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {temSenhaSalva && (
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] text-slate-500">
                      Gravada em cofre server-side (configuracoes_backend).
                    </span>
                    {!removerSenhaSalva ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRemoverSenhaSalva(true)
                          setSmtpPass('')
                        }}
                        className="h-5 px-1.5 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Limpar senha salva
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoverSenhaSalva(false)}
                        className="h-5 px-1.5 text-[10px] text-[#0066FF] hover:underline"
                      >
                        Manter senha anterior
                      </Button>
                    )}
                  </div>
                )}
                {removerSenhaSalva && (
                  <span className="text-[10px] text-amber-700 font-medium">
                    A senha atual será excluída do servidor ao salvar.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* BLOCO 4: TESTE DO REMETENTE E CONFERÊNCIA ANTES DA ASSEMBLEIA */}
          <div className="p-4 rounded-xl border border-[#0066FF]/25 bg-gradient-to-br from-[#F3F7FC] to-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0066FF] text-white text-[10px] font-bold">
                  ✓
                </span>
                <span className="text-xs font-bold text-[#002B5E] uppercase tracking-wider">
                  Enviar E-mail de Teste
                </span>
              </div>
              <span className="text-[11px] text-[#5A6B82]">
                Homologação do remetente e entrega antes da assembleia
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Dispara uma mensagem de verificação na identidade oficial Koinon (cabeçalho Marinho,
              ponto Azul e endosso A3ONE) informando o remetente usado e o canal ativo (SMTP próprio
              ou padrão da plataforma).
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#5A6B82]" />
                <Input
                  type="email"
                  value={emailTesteDestino}
                  onChange={(e) => setEmailTesteDestino(e.target.value)}
                  placeholder="Destinatário para o teste (deixe vazio para usar o seu e-mail)"
                  className="h-10 pl-9 text-xs border-slate-300 bg-white"
                />
              </div>

              <Button
                type="button"
                onClick={handleEnviarEmailTeste}
                disabled={testando || salvando || carregando}
                className="h-10 px-4 text-xs font-semibold bg-[#002B5E] hover:bg-[#00224A] text-white rounded-[10px] shadow-xs shrink-0"
              >
                {testando ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Testando Envio...
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5 text-[#0066FF]" /> Enviar e-mail de teste
                  </>
                )}
              </Button>
            </div>

            {/* Resultado do Teste */}
            {ultimoResultadoTeste && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  ultimoResultadoTeste.sucesso
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-red-50/80 border-red-200 text-red-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {ultimoResultadoTeste.sucesso ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <span>
                    {ultimoResultadoTeste.sucesso
                      ? 'Disparo concluído com sucesso'
                      : 'Falha no disparo do teste'}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-auto font-normal">
                    {ultimoResultadoTeste.dataHora}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed pl-6">{ultimoResultadoTeste.mensagem}</p>
                {ultimoResultadoTeste.canal && (
                  <p className="text-[10px] text-slate-600 pl-6">
                    <strong>Canal:</strong> {ultimoResultadoTeste.canal} •{' '}
                    <strong>Remetente:</strong> {ultimoResultadoTeste.remetente}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* BLOCO 5: TESTE DE WHATSAPP COM A MESMA UX DO TESTE DE E-MAIL */}
          <div className="p-4 rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                  <MessageCircle className="h-3 w-3" />
                </span>
                <span className="text-xs font-bold text-[#002B5E] uppercase tracking-wider">
                  Testar WhatsApp
                </span>
              </div>
              <span className="text-[11px] text-emerald-800 font-medium">
                Abertura direta via wa.me com mensagem pronta e auditoria
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Digite um número com DDD para abrir a conversa no WhatsApp Web do seu navegador com
              uma mensagem de teste já preenchida identificando o condomínio (
              <strong>{nomeCondominioPadrao}</strong>) e o WhatsApp oficial de referência. A
              mensagem sai pela sessão do seu navegador, sem custo de API e sem exigir que o
              destinatário esteja salvo na sua agenda de contatos.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="relative flex-1">
                <MessageSquare className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600" />
                <Input
                  type="tel"
                  value={whatsappTesteDestino}
                  onChange={handleWhatsappTesteChange}
                  onPaste={handleWhatsappTestePaste}
                  placeholder="Número de destino do teste: (XX) XXXXX-XXXX"
                  maxLength={15}
                  className="h-10 pl-9 text-xs border-slate-300 bg-white font-mono tracking-wide"
                />
              </div>

              <Button
                type="button"
                onClick={handleAbrirWhatsAppTeste}
                disabled={testandoWhatsapp || salvando || carregando}
                className="h-10 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-[10px] shadow-xs shrink-0"
              >
                {testandoWhatsapp ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Registrando Teste...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Abrir no WhatsApp
                  </>
                )}
              </Button>
            </div>

            {/* Aviso de Validação (número incompleto) */}
            {avisoValidacaoWhatsapp && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{avisoValidacaoWhatsapp}</span>
              </div>
            )}

            {/* Resultado e Confirmação de Rastreio no Histórico */}
            {ultimoResultadoWhatsapp && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  ultimoResultadoWhatsapp.sucesso
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-red-50/80 border-red-200 text-red-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {ultimoResultadoWhatsapp.sucesso ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <span>
                    {ultimoResultadoWhatsapp.sucesso
                      ? 'Teste registrado no Histórico de Alterações'
                      : 'Falha no teste de WhatsApp'}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-auto font-normal">
                    {ultimoResultadoWhatsapp.dataHora}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed pl-6">
                  {ultimoResultadoWhatsapp.mensagem}
                </p>
                {ultimoResultadoWhatsapp.numeroInternacional && (
                  <div className="pl-6 pt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                    <span>
                      <strong>Formato internacional:</strong> +
                      {ultimoResultadoWhatsapp.numeroInternacional}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Rótulo auditado:</strong> {ultimoResultadoWhatsapp.numeroFormatado}
                    </span>
                    {ultimoResultadoWhatsapp.urlWaMe && (
                      <a
                        href={ultimoResultadoWhatsapp.urlWaMe}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-emerald-800 hover:underline font-semibold inline-flex items-center gap-1 ml-auto"
                      >
                        Reabrir link wa.me <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 py-3 bg-slate-50/40">
          <div className="flex items-center gap-2 text-[11px] text-[#5A6B82]">
            <KeyRound className="h-3.5 w-3.5 text-[#0066FF]" />
            A senha SMTP nunca é exposta na tela ou nas requisições da interface.
          </div>

          <Button
            type="submit"
            disabled={salvando || carregando}
            className="bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-xs h-9 px-4 rounded-[10px] shadow-xs"
          >
            {salvando ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Salvar Canais de Envio
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

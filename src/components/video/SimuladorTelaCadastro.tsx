import React, { useState, useEffect } from 'react'
import { CenaApresentacaoVideo } from '@/lib/video/cenasRoteiro'
import { SetaIndicadora } from './SetaIndicadora'
import { KoinonLogo } from '@/components/brand/KoinonLogo'
import { KoinonSymbol } from '@/components/brand/KoinonSymbol'
import { EndossoA3One } from '@/components/brand/EndossoA3One'
import {
  Building,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldCheck,
  User,
  CreditCard,
  Calendar,
  Mail,
  Phone,
  FileCheck2,
  UserPlus,
  Send,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'

export interface SimuladorTelaCadastroProps {
  cena: CenaApresentacaoVideo
  modoApresentacao?: boolean
}

export const SimuladorTelaCadastro: React.FC<SimuladorTelaCadastroProps> = ({ cena }) => {
  // Simulação de animação de digitação de texto
  const [caracteresDigitados, setCaracteresDigitados] = useState({
    nome: '',
    cpf: '',
    dataNascimento: '',
    email: '',
    telefone: '',
  })

  useEffect(() => {
    if (cena.tipoVisual === 'preenchimento_dados') {
      const nomeCompleto = 'José Exemplo da Silva'
      const cpfCompleto = '123.456.789-00'
      const dataNascCompleta = '1982-05-14'
      const emailCompleto = 'jose.exemplo@email.com'
      const telCompleto = '(11) 98765-4321'

      let step = 0
      const timer = setInterval(() => {
        step++
        setCaracteresDigitados({
          nome: nomeCompleto.slice(0, Math.min(step, nomeCompleto.length)),
          cpf: step > 6 ? cpfCompleto.slice(0, Math.min(step - 6, cpfCompleto.length)) : '',
          dataNascimento:
            step > 12
              ? dataNascCompleta.slice(0, Math.min(step - 12, dataNascCompleta.length))
              : '',
          email: step > 16 ? emailCompleto.slice(0, Math.min(step - 16, emailCompleto.length)) : '',
          telefone: step > 22 ? telCompleto.slice(0, Math.min(step - 22, telCompleto.length)) : '',
        })

        if (step > 40) {
          clearInterval(timer)
        }
      }, 70)

      return () => clearInterval(timer)
    } else {
      // Estado estável preenchido para outras cenas que precisem do formulário
      setCaracteresDigitados({
        nome: 'José Exemplo da Silva',
        cpf: '123.456.789-00',
        dataNascimento: '1982-05-14',
        email: 'jose.exemplo@email.com',
        telefone: '(11) 98765-4321',
      })
    }
  }, [cena.id, cena.tipoVisual])

  // CENA 1: ABERTURA INSTITUCIONAL (Logomarca Koinon girando + endosso A3ONE surgindo)
  if (cena.tipoVisual === 'abertura') {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[460px] p-8 text-center bg-white rounded-[16px] border border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)] overflow-hidden">
        {/* Glow de fundo suave azul/marinho */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#8EC0FF]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#0066FF]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Seta animada apontando para a logo */}
        <div className="absolute top-6 right-10">
          <SetaIndicadora direcao="esquerda" texto="Identidade Koinon" />
        </div>

        {/* Símbolo com rotação suave e elegante de abertura */}
        <div className="relative mb-6">
          <div className="transition-transform duration-1000 ease-out hover:scale-105 animate-[spin_12s_linear_infinite]">
            <KoinonSymbol size={110} variant="color" />
          </div>
        </div>

        <div className="space-y-3 max-w-lg z-10">
          <div className="inline-block text-[11px] font-semibold tracking-wider text-[#002B5E] bg-[#0066FF]/10 border border-[#0066FF]/25 px-3 py-1 rounded-[8px]">
            Plataforma Virtual Koinon
          </div>

          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-[#002B5E]">
            Cadastro de Moradores
          </h2>

          <p className="text-sm text-[#5A6B82] leading-relaxed">
            Credenciamento seguro, identificação da unidade e quórum para deliberações em
            assembleias condominiais com total validade jurídica.
          </p>

          <div className="pt-6">
            <div className="inline-flex flex-col items-center gap-2 p-3 bg-[#F3F7FC] rounded-[12px] border border-[#5A6B82]/20">
              <span className="text-[11px] text-[#5A6B82] font-medium tracking-wide">
                Tecnologia para Condomínios
              </span>
              <EndossoA3One variant="color" layout="stacked" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CENA 2: CHEGADA DO LINK (WhatsApp ou E-mail)
  if (cena.tipoVisual === 'link_mensagem') {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[460px] p-6 bg-white rounded-[16px] border border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)]">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between border-b border-[#5A6B82]/20 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#0066FF] text-white flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#002B5E]">
                  Administração do Condomínio
                </h4>
                <p className="text-[10px] text-[#5A6B82]">Convite oficial para cadastro</p>
              </div>
            </div>
            <span className="text-[10px] text-[#5A6B82] bg-[#F3F7FC] px-2 py-0.5 rounded">
              WhatsApp / E-mail
            </span>
          </div>

          {/* Bolha de mensagem simulando WhatsApp */}
          <div className="relative p-4 rounded-[12px] bg-[#F3F7FC] border border-[#0066FF]/25 text-xs text-[#002B5E] space-y-2.5">
            <p className="leading-relaxed">
              Olá, condômino do <strong>Apto 1203</strong>! Segue o seu link oficial e exclusivo
              para atualização cadastral na plataforma Koinon:
            </p>

            {/* Seta animada apontando para o link */}
            <div className="absolute -top-7 right-4">
              <SetaIndicadora direcao="baixo" texto="Clique no Link" />
            </div>

            <div className="p-3 bg-white rounded-[10px] border border-[#0066FF] shadow-xs flex items-center justify-between gap-2 hover:bg-[#0066FF]/5 transition-colors">
              <div className="flex items-center gap-2 truncate">
                <ExternalLink className="h-4 w-4 text-[#0066FF] shrink-0" />
                <span className="font-mono text-[11px] text-[#0066FF] truncate font-semibold">
                  https://koinon.a3one.com.br/cadastro/tk_apto1203
                </span>
              </div>
              <span className="text-[10px] font-semibold bg-[#0066FF] text-white px-2 py-1 rounded shrink-0">
                ABRIR
              </span>
            </div>

            <p className="text-[10px] text-[#5A6B82]">
              • Não requer download de aplicativo. Abre diretamente no celular ou computador.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // CENA 3: IDENTIFICAÇÃO DA UNIDADE (Apto 1203 e Torre Única "—")
  if (cena.tipoVisual === 'identificacao_unidade') {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[460px] p-6 bg-white rounded-[16px] border border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)]">
        <div className="w-full max-w-lg space-y-4 text-center">
          <KoinonSymbol size={54} variant="color" className="mx-auto" />
          <h3 className="text-xl font-semibold text-[#002B5E]">Condomínio Residencial Lago Azul</h3>
          <p className="text-xs text-[#5A6B82]">
            Atualização cadastral oficial para habilitação em assembleias
          </p>

          {/* Destaque do Box da Unidade */}
          <div className="relative mt-6">
            <div className="absolute -top-9 left-1/2 -translate-x-1/2">
              <SetaIndicadora direcao="baixo" texto="Confira sua unidade aqui" />
            </div>

            <div className="p-4 rounded-[12px] bg-[#002B5E]/5 border-2 border-[#0066FF] shadow-md flex items-center justify-center gap-3 text-sm font-semibold text-[#002B5E]">
              <Building className="h-5 w-5 text-[#0066FF] shrink-0" />
              <span className="text-base text-[#002B5E]">Apto 1203</span>
              <span className="text-xs font-normal text-[#5A6B82] bg-white px-2.5 py-1 rounded border border-[#5A6B82]/20">
                Torre única (—)
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#5A6B82] max-w-sm mx-auto pt-2">
            Em condomínios de torre única, o bloco é omitido com um traço (—), conforme prevê o
            regulamento do sistema.
          </p>
        </div>
      </div>
    )
  }

  // CENA 4: QUEM DEVE SE CADASTRAR NESTA UNIDADE? (3 TÓPICOS)
  if (cena.tipoVisual === 'quem_deve_cadastrar') {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[460px] p-6 bg-white rounded-[16px] border border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)]">
        <div className="w-full max-w-lg space-y-4">
          <div className="text-center space-y-1">
            <span className="text-xs font-semibold text-[#0066FF]">Apto 1203 • Torre única</span>
            <h3 className="text-lg font-semibold text-[#002B5E]">Regras de Ocupação da Unidade</h3>
          </div>

          {/* Seta animada apontando para o quadro */}
          <div className="relative">
            <div className="absolute -top-7 right-4">
              <SetaIndicadora direcao="baixo" texto="3 Situações Possíveis" />
            </div>

            <div className="p-4 rounded-[12px] bg-[#0066FF]/5 border-2 border-[#0066FF]/40 text-left text-xs text-[#002B5E] space-y-3">
              <p className="font-semibold text-[#002B5E] flex items-center gap-1.5 text-sm">
                <HelpCircle className="h-4 w-4 text-[#0066FF]" />
                Quem deve se cadastrar nesta unidade?
              </p>

              <div className="space-y-2 text-[#5A6B82] leading-relaxed">
                <div className="p-2.5 rounded-[8px] bg-white border border-[#0066FF]/20 flex items-start gap-2">
                  <span className="text-[#0066FF] font-bold text-base leading-none">•</span>
                  <div>
                    <strong className="text-[#002B5E]">Condômino residente:</strong> proprietário
                    que mora no imóvel. Apenas um cadastro único é suficiente.
                  </div>
                </div>

                <div className="p-2.5 rounded-[8px] bg-white border border-[#0066FF]/20 flex items-start gap-2">
                  <span className="text-[#0066FF] font-bold text-base leading-none">•</span>
                  <div>
                    <strong className="text-[#002B5E]">Imóvel alugado:</strong> este mesmo link
                    permite cadastrar o <strong>Inquilino</strong> (morador da unidade).
                  </div>
                </div>

                <div className="p-2.5 rounded-[8px] bg-white border border-[#0066FF]/20 flex items-start gap-2">
                  <span className="text-[#0066FF] font-bold text-base leading-none">•</span>
                  <div>
                    <strong className="text-[#002B5E]">Proprietário não morador:</strong>{' '}
                    totalizando no máximo até <strong>2 pessoas</strong> por unidade.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CENA 5: PREENCHIMENTO DOS DADOS (Nome, CPF, Data de Nascimento e Telefone)
  if (cena.tipoVisual === 'preenchimento_dados') {
    return (
      <div className="relative flex flex-col justify-center min-h-[460px] p-6 bg-white rounded-[16px] border border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)]">
        <div className="w-full max-w-lg mx-auto space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-[#5A6B82]/20 pb-2">
            <span className="font-semibold text-[#002B5E]">Dados Pessoais do Morador</span>
            <span className="text-[10px] text-[#0066FF] bg-[#0066FF]/10 px-2 py-0.5 rounded font-mono">
              Simulação Dinâmica
            </span>
          </div>

          {/* Campo Nome */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#002B5E]">Nome Completo *</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5A6B82]" />
              <input
                readOnly
                value={caracteresDigitados.nome}
                placeholder="Informe seu nome completo"
                className="w-full pl-9 h-9 border border-[#5A6B82]/30 rounded-[8px] text-xs text-[#002B5E] bg-[#F3F7FC]"
              />
            </div>
          </div>

          {/* Grid CPF e Data de Nascimento com seta no nascimento */}
          <div className="grid grid-cols-2 gap-2.5 relative">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#002B5E]">CPF *</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5A6B82]" />
                <input
                  readOnly
                  value={caracteresDigitados.cpf}
                  placeholder="000.000.000-00"
                  className="w-full pl-9 h-9 border border-[#5A6B82]/30 rounded-[8px] text-xs font-mono text-[#002B5E] bg-[#F3F7FC]"
                />
              </div>
            </div>

            <div className="space-y-1 relative">
              <div className="absolute -top-7 right-0">
                <SetaIndicadora direcao="baixo" texto="Data de Nascimento" />
              </div>
              <label className="text-[11px] font-medium text-[#002B5E] flex items-center justify-between">
                <span>Data de Nascimento *</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#0066FF]" />
                <input
                  readOnly
                  value={caracteresDigitados.dataNascimento}
                  placeholder="AAAA-MM-DD"
                  className="w-full pl-9 h-9 border-2 border-[#0066FF] rounded-[8px] text-xs font-mono text-[#002B5E] bg-white shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Grid E-mail e Telefone com máscara */}
          <div className="grid grid-cols-2 gap-2.5 relative">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#002B5E]">E-mail Oficial *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5A6B82]" />
                <input
                  readOnly
                  value={caracteresDigitados.email}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-9 h-9 border border-[#5A6B82]/30 rounded-[8px] text-xs text-[#002B5E] bg-[#F3F7FC]"
                />
              </div>
            </div>

            <div className="space-y-1 relative">
              <div className="absolute -bottom-7 right-0">
                <SetaIndicadora direcao="cima" texto="Máscara (XX) XXXXX-XXXX" />
              </div>
              <label className="text-[11px] font-medium text-[#002B5E]">
                Telefone / WhatsApp *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#0066FF]" />
                <input
                  readOnly
                  value={caracteresDigitados.telefone}
                  placeholder="(XX) XXXXX-XXXX"
                  className="w-full pl-9 h-9 border-2 border-[#0066FF] rounded-[8px] text-xs font-mono text-[#002B5E] bg-white shadow-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CENA 6: ESCOLHA DO VÍNCULO E DECLARAÇÃO LEGAL
  if (cena.tipoVisual === 'escolha_vinculo_declaracao') {
    return (
      <div className="relative flex flex-col justify-center min-h-[460px] p-6 bg-white rounded-[16px] border border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)]">
        <div className="w-full max-w-lg mx-auto space-y-3.5 text-xs">
          <div className="space-y-1 relative">
            <div className="absolute -top-7 right-0">
              <SetaIndicadora direcao="baixo" texto="Escolha do Vínculo" />
            </div>
            <label className="text-xs font-semibold text-[#002B5E]">
              Seu Vínculo com esta Unidade *
            </label>
            <div className="p-2.5 rounded-[10px] border-2 border-[#0066FF] bg-[#F3F7FC] flex items-center justify-between text-[#002B5E] font-medium">
              <span>Condômino (residente) — Proprietário que mora no imóvel</span>
              <span className="text-[10px] bg-[#0066FF] text-white px-2 py-0.5 rounded font-semibold">
                Selecionado
              </span>
            </div>
          </div>

          {/* Caixa da Declaração Legal Dinâmica */}
          <div className="relative mt-2 p-4 rounded-[12px] bg-[#002B5E]/5 border-2 border-[#002B5E]/30 space-y-2">
            <div className="absolute -top-7 left-4">
              <SetaIndicadora direcao="baixo" texto="Declaração Legal (CC/Lei 8.245 e LGPD)" />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#002B5E]">
              <FileCheck2 className="h-4 w-4 text-[#0066FF]" />
              <span>Declaração de Vínculo Legal — Condômino (residente)</span>
            </div>

            <p className="text-[11px] text-[#002B5E]/90 leading-relaxed italic bg-white p-3 rounded-[8px] border border-[#5A6B82]/20 shadow-xs">
              "Declaro, sob as penas da lei, que sou proprietário legítimo da unidade para a qual
              estou me cadastrando, na forma dos{' '}
              <strong className="text-[#0066FF]">arts. 1.228 e 1.331 do Código Civil</strong>, que
              resido na unidade e que as informações prestadas neste cadastro são verdadeiras.
              Autorizo o tratamento dos meus dados pessoais nos termos da{' '}
              <strong className="text-[#0066FF]">LGPD (Lei nº 13.709/2018)</strong>."
            </p>

            <p className="text-[10px] text-[#5A6B82]">
              • Para Locatários, o texto fundamenta na Lei nº 8.245/91 (Lei do Inquilinato).
            </p>
          </div>
        </div>
      </div>
    )
  }

  // CENA 7: ASSINATURA ELETRÔNICA (Botão com Gravação de Nome, Data/Hora e IP)
  if (cena.tipoVisual === 'assinatura_eletronica') {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[460px] p-6 bg-white rounded-[16px] border border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)]">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="p-3.5 rounded-[12px] bg-[#F3F7FC] border border-[#5A6B82]/20 text-left space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-[#002B5E]">
              <ShieldCheck className="h-4 w-4 text-[#0066FF]" />
              <span>Auditoria e Validade Jurídica</span>
            </div>
            <p className="text-[11px] text-[#5A6B82]">
              A assinatura eletrônica é gravada com carimbo temporal e rastro do dispositivo:
            </p>
            <div className="bg-white p-2.5 rounded border border-[#5A6B82]/20 font-mono text-[10px] space-y-0.5 text-[#002B5E]">
              <div>
                <strong>Assinante:</strong> José Exemplo da Silva
              </div>
              <div>
                <strong>Data/Hora:</strong> {new Date().toLocaleDateString('pt-BR')}{' '}
                {new Date().toLocaleTimeString('pt-BR')} (UTC-3)
              </div>
              <div>
                <strong>IP Registrado:</strong> 187.56.204.12
              </div>
            </div>
          </div>

          {/* Botão de Assinatura com Seta Animada */}
          <div className="relative pt-2">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2">
              <SetaIndicadora direcao="baixo" texto="Clique para assinar" />
            </div>

            <button
              type="button"
              className="w-full h-12 bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold rounded-[12px] shadow-lg shadow-[#0066FF]/30 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>Assinar declaração eletronicamente</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // CENA 8: INDICAÇÃO DO MORADOR/PROPRIETÁRIO DE FATO
  if (cena.tipoVisual === 'indicacao_de_fato') {
    return (
      <div className="relative flex flex-col justify-center min-h-[460px] p-6 bg-white rounded-[16px] border border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)]">
        <div className="w-full max-w-lg mx-auto space-y-3.5 text-xs">
          <div className="flex items-center justify-between border-b border-[#5A6B82]/20 pb-2">
            <button
              type="button"
              className="text-xs text-[#0066FF] font-semibold flex items-center gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Indicar o morador / proprietário de fato</span>
            </button>
            <span className="text-[10px] text-[#5A6B82]">Inquilino indica Proprietário</span>
          </div>

          <div className="relative p-4 rounded-[12px] bg-slate-50 border-2 border-[#0066FF]/40 space-y-3">
            <div className="absolute -top-7 right-4">
              <SetaIndicadora direcao="baixo" texto="Cadastro complementar" />
            </div>

            <div>
              <span className="text-xs font-semibold text-[#002B5E] block">
                Dados da outra pessoa vinculada à unidade (Proprietário)
              </span>
              <p className="text-[11px] text-[#5A6B82] mt-0.5">
                A mesa diretora entrará em contato para providenciar o registro da outra pessoa.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#002B5E]">Nome Completo</label>
                <input
                  readOnly
                  value="Maria Proprietária Exemplo"
                  className="w-full px-2.5 h-8 border border-[#5A6B82]/30 bg-white rounded-[6px] text-xs text-[#002B5E]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#002B5E]">Telefone com DDD</label>
                <input
                  readOnly
                  value="(11) 91234-5678"
                  className="w-full px-2.5 h-8 border border-[#5A6B82]/30 bg-white rounded-[6px] text-xs font-mono text-[#002B5E]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CENA 9: ENVIO E MENSAGEM DE SUCESSO
  if (cena.tipoVisual === 'envio_sucesso') {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[460px] p-6 bg-white rounded-[16px] border border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)] text-center">
        <div className="w-full max-w-md space-y-4">
          <div className="relative">
            <div className="absolute -top-7 right-10">
              <SetaIndicadora direcao="baixo" texto="Cadastro Gravado" />
            </div>
            <div className="h-16 w-16 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-[#002B5E]">Cadastro Enviado com Sucesso!</h3>
            <p className="text-xs text-[#5A6B82] max-w-sm mx-auto leading-relaxed">
              Seus dados e a assinatura eletrônica da declaração foram registrados e estão pendentes
              de homologação da mesa diretora.
            </p>
          </div>

          <div className="p-3.5 rounded-[12px] bg-[#F3F7FC] border border-[#5A6B82]/20 text-left text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#002B5E]">
              <ShieldCheck className="h-4 w-4 text-[#0066FF]" />
              <span>Protocolo Seguro de Recebimento</span>
            </div>
            <p className="text-[11px] text-[#5A6B82]">
              A declaração assinada está anexada com sucesso ao dossiê oficial da unidade.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // CENA 10: PENDÊNCIA ATÉ APROVAÇÃO DA MESA DIRETORA
  if (cena.tipoVisual === 'pendencia_mesa') {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[460px] p-6 bg-white rounded-[16px] border border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)] text-center">
        <div className="w-full max-w-md space-y-4">
          <div className="relative">
            <div className="absolute -top-7 left-10">
              <SetaIndicadora direcao="baixo" texto="Status: Pendente" />
            </div>
            <div className="h-16 w-16 rounded-full bg-amber-50 border-2 border-amber-500 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="h-10 w-10" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
              Status: Pendente de Homologação
            </span>
            <h3 className="text-lg font-bold text-[#002B5E] pt-1">
              Conferência pela Mesa Diretora
            </h3>
            <p className="text-xs text-[#5A6B82] max-w-sm mx-auto leading-relaxed">
              A mesa da assembleia confere a documentação da unidade para liberar o acesso ao voto e
              deliberação.
            </p>
          </div>

          <div className="p-3.5 rounded-[12px] bg-[#0066FF]/5 border border-[#0066FF]/20 text-left text-xs space-y-1.5 text-[#002B5E]">
            <p className="text-[11px]">
              <strong>Notificação Oficial:</strong> Assim que a mesa homologar, a confirmação será
              enviada automaticamente para o seu e-mail cadastrado.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // CENA 11: ENCERRAMENTO INSTITUCIONAL
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[460px] p-8 text-center bg-white rounded-[16px] border border-[#5A6B82]/20 shadow-[0_4px_24px_rgba(0,43,94,0.06)]">
      <div className="space-y-4 max-w-md">
        <div className="mx-auto mb-2">
          <KoinonLogo size={56} variant="color" />
        </div>

        <h3 className="text-2xl font-bold text-[#002B5E]">Participe da Assembleia!</h3>

        <p className="text-xs text-[#5A6B82] leading-relaxed">
          O futuro do nosso condomínio é decidido com a presença de cada morador. Faça seu cadastro
          pelo link da unidade e exerça seu direito de voz e voto.
        </p>

        <div className="pt-4 flex flex-col items-center gap-2">
          <EndossoA3One variant="color" layout="stacked" />
          <span className="text-[11px] text-[#5A6B82] font-medium pt-1">
            Democracia • Transparência • Validade Jurídica
          </span>
        </div>
      </div>
    </div>
  )
}

/// <reference path="../pb_data/types.d.ts" />
/**
 * Hook: sindico_ai
 * Rota: POST /backend/v1/sindico/chat
 *
 * Proxy de chat com o agente nativo "koinon-sindico" (definido na
 * migration 0034 via $ai.agents.define(app, ...)), especialista em apoio
 * executivo ao síndico: redação de convocações (WhatsApp/e-mail), análise de
 * indicadores de engajamento, resumo histórico das assembleias e esclarecimento
 * de quóruns e governança.
 *
 * Requer usuário autenticado (membros da mesa / admin / síndico).
 *
 * Contrato espelhado dos hooks existentes ({ pergunta, conversa_id, contexto? } →
 * { success, resposta, conversa_id }):
 *   const result = $ai.agent('koinon-sindico').chat({ user_id, conversation_id, message })
 */
routerAdd(
  'POST',
  '/backend/v1/sindico/chat',
  (e) => {
    const info = $requestInfo
    const auth = info?.auth

    if (!auth || !auth.id) {
      return e.json(401, {
        success: false,
        message: 'Faça login para conversar com a IA do Síndico.',
      })
    }

    let body = {}
    try {
      body = e.readBody() || {}
    } catch (err) {
      body = {}
    }

    const pergunta = String(body.pergunta || '').trim()
    if (!pergunta) {
      return e.json(400, {
        success: false,
        message: 'Digite sua dúvida ou solicitação para a IA responder.',
      })
    }
    if (pergunta.length > 3000) {
      return e.json(400, {
        success: false,
        message: 'Sua mensagem está muito longa. Resuma em até 3000 caracteres.',
      })
    }

    // Contexto opcional enviado pelo frontend (ex.: dados resumidos da assembleia ativa e engajamento)
    const contexto = typeof body.contexto === 'string' ? body.contexto.trim() : ''
    let mensagemCompleta = pergunta
    if (contexto && !body.conversa_id) {
      mensagemCompleta = `[Contexto Executivo Atual do Condomínio]\n${contexto}\n\n[Solicitação do Síndico]\n${pergunta}`
    }

    // A plataforma é dona dos ids de conversa: na 1ª mensagem vai null e o
    // runtime cria + devolve o id; nos turnos seguintes pinça o mesmo id.
    const conversaId = body.conversa_id ? String(body.conversa_id) : null

    try {
      const resposta = $ai.agent('koinon-sindico').chat({
        user_id: auth.id,
        conversation_id: conversaId,
        message: mensagemCompleta,
      })

      return e.json(200, {
        success: true,
        resposta: resposta?.content || '',
        conversa_id: resposta?.conversation_id || '',
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        console.warn('sindico_ai: IA sem gateway configurado', err)
        return e.json(503, {
          success: false,
          message:
            'A IA do Síndico está indisponível neste momento. Tente novamente em instantes ou contate o suporte A3ONE.',
        })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        console.warn('sindico_ai: erro do agente', err)
        return e.json(status, {
          success: false,
          message:
            status >= 500
              ? 'A IA do Síndico está indisponível neste momento. Tente novamente em instantes ou contate o suporte A3ONE.'
              : err.message,
        })
      }
      console.warn('sindico_ai: falha no chat do agente', err)
      return e.json(500, {
        success: false,
        message:
          'A IA do Síndico está indisponível neste momento. Tente novamente em instantes ou contate o suporte A3ONE.',
      })
    }
  },
  /* middlewares */ null,
)

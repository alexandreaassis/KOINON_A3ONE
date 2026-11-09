/// <reference path="../pb_data/types.d.ts" />
/**
 * Hook: manual_mesa_ai
 * Rota: POST /backend/v1/manual-mesa/chat
 *
 * Proxy de chat com o agente nativo "koinon-manual-mesa" (definido na
 * migration 0032 via $ai.agents.define(app, ...)), especialista no Módulo da
 * Mesa Diretora do Koinon. Requer usuário autenticado (qualquer papel).
 * Espelha o contrato de manual_morador_ai ({ pergunta, conversa_id } →
 * { success, resposta, conversa_id }) para reuso do mesmo painel de chat.
 *
 * API oficial (guia skip-cloud/ai-agents):
 *   const result = $ai.agent(slug).chat({ user_id, conversation_id, message })
 * — método síncrono, sem builder; conversation_id null na 1ª mensagem e o
 * runtime devolve result.conversation_id para pinçar os turnos seguintes.
 */
routerAdd('POST', '/backend/v1/manual-mesa/chat', (e) => {
  const authRecord = e.auth
  if (!authRecord || !authRecord.id) {
    return e.json(401, {
      success: false,
      message: 'Faça login para conversar com a IA do Koinon.',
    })
  }

  let body = {}
  try {
    body = (e.requestInfo && e.requestInfo().body) || {}
  } catch (err) {
    body = {}
  }

  const pergunta = String(body.pergunta || '').trim()
  if (!pergunta) {
    return e.json(400, { success: false, message: 'Digite sua dúvida para a IA responder.' })
  }
  if (pergunta.length > 2000) {
    return e.json(400, {
      success: false,
      message: 'Sua mensagem está muito longa. Resuma em até 2000 caracteres.',
    })
  }

  // A plataforma é dona dos ids de conversa: na 1ª mensagem vai null e o
  // runtime cria + devolve o id; nos turnos seguintes pinça o mesmo id.
  const conversaId = body.conversa_id ? String(body.conversa_id) : null

  try {
    const resposta = $ai.agent('koinon-manual-mesa').chat({
      user_id: authRecord.id,
      conversation_id: conversaId,
      message: pergunta,
    })

    return e.json(200, {
      success: true,
      resposta: resposta?.content || '',
      conversa_id: resposta?.conversation_id || '',
    })
  } catch (err) {
    console.warn('manual_mesa_ai: falha no chat do agente:', err)

    // Proteção contra ReferenceError se classes de erro SkipAi* não estiverem no escopo global
    try {
      if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
        return e.json(503, {
          success: false,
          message:
            'A IA do Koinon está indisponível neste momento. Tente novamente em instantes ou fale com o suporte A3ONE.',
        })
      }
    } catch (_) {}

    try {
      if (typeof SkipAiAgentsError !== 'undefined' && err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          success: false,
          message:
            status >= 500
              ? 'A IA do Koinon está indisponível neste momento. Tente novamente em instantes ou fale com o suporte A3ONE.'
              : err.message,
        })
      }
    } catch (_) {}

    const status = (err && err.status) || 500
    return e.json(status >= 500 ? 500 : status, {
      success: false,
      message:
        'A IA do Koinon está indisponível neste momento. Tente novamente em instantes ou fale com o suporte A3ONE.',
    })
  }
})

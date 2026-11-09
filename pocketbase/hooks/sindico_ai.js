/// <reference path="../pb_data/types.d.ts" />
/**
 * Hook: sindico_ai
 * Rota: POST /backend/v1/sindico/chat
 *
 * Proxy de chat com o agente nativo "koinon-sindico" (definido na
 * migration 0034 via $ai.agents.define(app, ...)), especialista em apoio
 * executivo ao síndico.
 */
routerAdd('POST', '/backend/v1/sindico/chat', (e) => {
  const authRecord = e.auth
  if (!authRecord || !authRecord.id) {
    return e.json(401, {
      success: false,
      message: 'Faça login para conversar com a IA do Síndico.',
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

  const contexto = typeof body.contexto === 'string' ? body.contexto.trim() : ''
  let mensagemCompleta = pergunta
  if (contexto && !body.conversa_id) {
    mensagemCompleta = `[Contexto Executivo Atual do Condomínio]\n${contexto}\n\n[Solicitação do Síndico]\n${pergunta}`
  }

  const conversaId = body.conversa_id ? String(body.conversa_id) : null

  try {
    const resposta = $ai.agent('koinon-sindico').chat({
      user_id: authRecord.id,
      conversation_id: conversaId,
      message: mensagemCompleta,
    })

    return e.json(200, {
      success: true,
      resposta: resposta?.content || '',
      conversa_id: resposta?.conversation_id || '',
    })
  } catch (err) {
    console.warn('sindico_ai: falha no chat do agente:', err)

    try {
      if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
        return e.json(503, {
          success: false,
          message:
            'A IA do Síndico está indisponível neste momento. Tente novamente em instantes ou contate o suporte A3ONE.',
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
              ? 'A IA do Síndico está indisponível neste momento. Tente novamente em instantes ou contate o suporte A3ONE.'
              : err.message,
        })
      }
    } catch (_) {}

    const status = (err && err.status) || 500
    return e.json(status >= 500 ? 500 : status, {
      success: false,
      message:
        'A IA do Síndico está indisponível neste momento. Tente novamente em instantes ou contate o suporte A3ONE.',
    })
  }
})

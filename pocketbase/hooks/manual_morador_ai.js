/// <reference path="../pb_data/types.d.ts" />
/**
 * Hook: manual_morador_ai
 * Rota: POST /backend/v1/manual-morador/chat
 *
 * Proxy de chat com o agente nativo "koinon-manual-morador" (definido na
 * migration 0031 via $ai.agents.define(app, ...)), especialista no Módulo do
 * Morador do Koinon. Requer usuário autenticado (qualquer papel).
 */
routerAdd('POST', '/backend/v1/manual-morador/chat', (e) => {
  const info = $requestInfo
  const auth = info?.auth

  if (!auth || !auth.id) {
    return e.json(401, {
      success: false,
      message: 'Faça login para conversar com a IA do Koinon.',
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
    return e.json(400, { success: false, message: 'Digite sua dúvida para a IA responder.' })
  }
  if (pergunta.length > 2000) {
    return e.json(400, {
      success: false,
      message: 'Sua mensagem está muito longa. Resuma em até 2000 caracteres.',
    })
  }

  const conversaId = body.conversa_id ? String(body.conversa_id) : null

  try {
    const resposta = $ai.agent('koinon-manual-morador').chat({
      user_id: auth.id,
      conversation_id: conversaId,
      message: pergunta,
    })

    return e.json(200, {
      success: true,
      resposta: resposta?.content || '',
      conversa_id: resposta?.conversation_id || '',
    })
  } catch (err) {
    if (err instanceof SkipAiConfigError) {
      console.warn('manual_morador_ai: IA sem gateway configurado', err)
      return e.json(503, {
        success: false,
        message:
          'A IA do Koinon está indisponível neste momento. Tente novamente em instantes ou fale com a mesa diretora.',
      })
    }
    if (err instanceof SkipAiAgentsError) {
      const status = err.status || 500
      console.warn('manual_morador_ai: erro do agente', err)
      return e.json(status, {
        success: false,
        message:
          status >= 500
            ? 'A IA do Koinon está indisponível neste momento. Tente novamente em instantes ou fale com a mesa diretora.'
            : err.message,
      })
    }
    console.warn('manual_morador_ai: falha no chat do agente', err)
    return e.json(500, {
      success: false,
      message:
        'A IA do Koinon está indisponível neste momento. Tente novamente em instantes ou fale com a mesa diretora.',
    })
  }
})

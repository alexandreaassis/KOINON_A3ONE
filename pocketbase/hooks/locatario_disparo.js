/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para disparo de acesso ao locatário pela Mesa Diretora quando o proprietário declara
 * que não participará de deliberação sobre despesas de manutenção.
 *
 * Rota:
 * POST /backend/v1/mesa/locatario/disparar-acesso
 *
 * Corpo da requisição:
 * {
 *   deliberacaoId: string,
 *   unidadeId: string,
 *   locatarioEmail?: string,
 *   locatarioTelefone?: string,
 *   locatarioNome?: string,
 *   motivo?: string
 * }
 */

routerAdd('POST', '/backend/v1/mesa/locatario/disparar-acesso', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(403, { success: false, message: 'Usuário não autenticado.' })
  }

  const role = authRecord.getString('role')
  if (role !== 'admin' && role !== 'mesa') {
    return e.json(403, {
      success: false,
      message:
        'Apenas a Mesa Diretora ou Administradores podem disparar o acesso de participação ao locatário.',
    })
  }

  const body = e.requestInfo().body || {}
  const deliberacaoId = body.deliberacaoId
  const unidadeId = body.unidadeId

  if (!deliberacaoId || !unidadeId) {
    return e.json(400, {
      success: false,
      message: 'deliberacaoId e unidadeId são obrigatórios.',
    })
  }

  // Obter Deliberação
  let deliberacao
  try {
    deliberacao = e.app.findRecordById('deliberacoes', deliberacaoId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Deliberação não encontrada.' })
  }

  // Obter Unidade
  let unidade
  try {
    unidade = e.app.findRecordById('unidades', unidadeId)
  } catch (_) {
    return e.json(404, { success: false, message: 'Unidade não encontrada.' })
  }

  // Obter nome do Condomínio
  let nomeCondo = 'Condomínio Residencial Lago Azul'
  try {
    const configs = e.app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
    if (configs && configs.length > 0) {
      nomeCondo = configs[0].getString('nome_condominio') || nomeCondo
    }
  } catch (_) {}

  const identU = unidade.getString('identificador')
  const blocoU = (unidade.getString('bloco') || '').trim()
  const unidTexto = blocoU ? `Unidade ${identU} (${blocoU})` : `Unidade ${identU}`
  const tituloDelib = deliberacao.getString('titulo') || 'Assembleia Geral'

  // Buscar cadastro do locatário (ou usar dados informados no payload)
  let emailLocatario = (body.locatarioEmail || '').trim()
  let telefoneLocatario = (body.locatarioTelefone || '').trim()
  let nomeLocatario = (body.locatarioNome || '').trim()

  if (!emailLocatario || !nomeLocatario) {
    try {
      const cadastros = e.app.findRecordsByFilter(
        'cadastros_unidade',
        'unidade = {:u} && vinculo = "locatario" && ativo = true',
        '-created',
        1,
        0,
        { u: unidadeId },
      )
      if (cadastros && cadastros.length > 0) {
        const c = cadastros[0]
        if (!emailLocatario) emailLocatario = c.getString('email') || ''
        if (!telefoneLocatario) telefoneLocatario = c.getString('telefone') || ''
        if (!nomeLocatario) nomeLocatario = c.getString('nome') || ''
      }
    } catch (_) {}
  }

  // Atualizar a deliberação gravando a unidade na lista de proprietários que declararam não participar
  try {
    let unidadesNaoParticipa = []
    try {
      const bruto = deliberacao.get('proprietario_nao_participa_unidades')
      if (Array.isArray(bruto)) {
        unidadesNaoParticipa = bruto
      } else if (typeof bruto === 'string' && bruto.trim().length > 0) {
        unidadesNaoParticipa = JSON.parse(bruto)
      }
    } catch (_) {
      unidadesNaoParticipa = []
    }

    if (!unidadesNaoParticipa.includes(unidadeId)) {
      unidadesNaoParticipa.push(unidadeId)
      deliberacao.set('proprietario_nao_participa_unidades', JSON.stringify(unidadesNaoParticipa))
      e.app.save(deliberacao)
    }
  } catch (errDelib) {
    console.log('Aviso ao registrar proprietario_nao_participa_unidades:', errDelib)
  }

  // Registrar auditoria
  try {
    const auditCol = e.app.findCollectionByNameOrId('auditoria_events')
    const audit = new Record(auditCol)
    audit.set('evento', 'credenciamento_aprovado')
    audit.set(
      'fator',
      `Mesa liberou participação do locatário ${nomeLocatario || 'da unidade'} (${unidTexto}) na deliberação "${tituloDelib}" após manifestação de ausência do proprietário.`,
    )
    audit.set('deliberacao', deliberacaoId)
    e.app.save(audit)
  } catch (_) {}

  // Disparar Notificação por E-mail (se houver e-mail válido)
  let emailEnviado = false
  if (emailLocatario && emailLocatario.includes('@')) {
    try {
      const notifCol = e.app.findCollectionByNameOrId('notificacoes')
      const notif = new Record(notifCol)
      notif.set('destinatario', emailLocatario)
      notif.set('canal', 'email')
      notif.set('tipo', 'convite_assembleia')
      notif.set('titulo', `Acesso à Assembleia: Votação de Despesas — ${unidTexto}`)
      notif.set(
        'corpo',
        `Prezado(a) ${nomeLocatario || 'Morador(a)'},\n\n` +
          `Informamos que, tendo o proprietário da ${unidTexto} manifestado que não participará da deliberação "${tituloDelib}", ` +
          `a Mesa Diretora do ${nomeCondo} habilitou seu acesso de voto nesta pauta regimental de despesas de manutenção.\n\n` +
          `Você já pode acessar a Plataforma Virtual Koinon no módulo do Morador e registrar sua cédula de votação.\n\n` +
          `Atenciosamente,\n` +
          `Mesa Diretora — ${nomeCondo}`,
      )
      notif.set('status', 'pendente')
      e.app.save(notif)
      emailEnviado = true
    } catch (errNotif) {
      console.log('Erro ao enfileirar email para locatario:', errNotif)
    }
  }

  // Construir link do WhatsApp (wa.me) para retorno à mesa
  let whatsappUrl = ''
  const telLimpo = (telefoneLocatario || '').replace(/\D/g, '')
  if (telLimpo.length >= 10) {
    const numeroComDdi = telLimpo.startsWith('55') ? telLimpo : `55${telLimpo}`
    const msgZap =
      `Olá, ${nomeLocatario || 'Morador(a)'}! Informamos que a Mesa Diretora do ${nomeCondo} liberou o seu acesso de voto ` +
      `para a ${unidTexto} na assembleia "${tituloDelib}" (pauta de despesas de manutenção). ` +
      `Acesse a plataforma Koinon para votar.`
    whatsappUrl = `https://wa.me/${numeroComDdi}?text=${encodeURIComponent(msgZap)}`
  }

  return e.json(200, {
    success: true,
    message:
      `Acesso do locatário liberado para a ${unidTexto}.` +
      (emailEnviado ? ` Notificação oficial por e-mail enfileirada para ${emailLocatario}.` : ''),
    emailEnviado,
    destinatarioEmail: emailLocatario,
    destinatarioNome: nomeLocatario,
    destinatarioTelefone: telefoneLocatario,
    whatsappUrl: whatsappUrl || null,
  })
})

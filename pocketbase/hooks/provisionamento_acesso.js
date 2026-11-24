/**
 * Hook provisionamento_acesso.js
 *
 * Provisionamento automático de acesso a partir dos cadastros de unidade:
 * - `cadastros_unidade` é a fonte da verdade.
 * - Ao APROVAR um cadastro (status_aprovacao -> 'aprovado' com ativo=true,
 *   tanto pelo endpoint admin/cadastros/aprovar quanto por update direto),
 *   cria a conta de login `users` vinculada (role 'morador'), com senha
 *   temporária forte, flag deve_trocar_senha = true e e-mail com a senha.
 * - A senha temporária NUNCA é logada nem retornada ao front-end: vai apenas
 *   no corpo do e-mail (collection `notificacoes`, canal existente do projeto).
 * - Ao DESATIVAR/REJEITAR/EXCLUIR um cadastro, desativa a conta vinculada.
 * - Troca obrigatória: update em users sem password/passwordConfirm não limpa
 *   a flag deve_trocar_senha.
 *
 * Convenção JSVM do projeto: TODAS as funções auxiliares ficam INLINE dentro
 * de cada callback (pool de JSVM não compartilha top-level entre callbacks).
 */

// ---------------------------------------------------------------------------
// 1. APROVAÇÃO: provisiona conta quando o cadastro vira 'aprovado' + ativo
// ---------------------------------------------------------------------------
onRecordUpdate((e) => {
  e.next()
  try {
    const cad = e.record
    const antes = cad.original()
    const statusAntes = antes.getString('status_aprovacao')
    const statusDepois = cad.getString('status_aprovacao')
    const ativoDepois = cad.getBool('ativo')

    if (statusDepois !== 'aprovado' || !ativoDepois) return
    if (statusAntes === 'aprovado' && cad.getString('user_vinculado')) return

    const email = (cad.getString('email') || '').trim().toLowerCase()
    if (!email || email.indexOf('@') === -1) {
      console.log('Provisionamento ignorado: cadastro sem e-mail válido.')
      return
    }

    // Idempotente: conta já vinculada a este cadastro? Nada a fazer.
    const vinculadoAtual = cad.getString('user_vinculado') || ''
    if (vinculadoAtual) {
      try {
        const jaExiste = e.app.findRecordById('users', vinculadoAtual)
        if (jaExiste) return
      } catch (_) {
        // vínculo apontando para conta apagada: reprovisiona abaixo
      }
    }

    function gerarSenhaTemporaria() {
      return $security.randomString(18) + 'Aa1!' + $security.randomString(2)
    }

    function rotuloUnidade(app, unidadeId) {
      try {
        const u = app.findRecordById('unidades', unidadeId)
        const iden = u.getString('identificador') || ''
        const bloco = (u.getString('bloco') || '').trim()
        const tipo = u.getString('tipo_unidade') || 'Unidade'
        return bloco ? `${tipo} ${iden} (${bloco})` : `${tipo} ${iden}`
      } catch (_) {
        return ''
      }
    }

    function unidadesDoCadastro(app, registro) {
      const ids = []
      try {
        const v = registro.get('unidades')
        if (Array.isArray(v)) {
          for (let i = 0; i < v.length; i++) {
            const id = String(v[i] || '').trim()
            if (id && id !== 'none' && ids.indexOf(id) === -1) ids.push(id)
          }
        }
      } catch (_) {}
      const legado = registro.getString('unidade') || ''
      if (legado && legado !== 'none' && ids.indexOf(legado) === -1) ids.push(legado)
      return ids
    }

    function nomeCondominio(app) {
      try {
        const configs = app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
        if (configs && configs.length > 0) {
          return configs[0].getString('nome_condominio') || 'Condomínio Residencial Lago Azul'
        }
      } catch (_) {}
      return 'Condomínio Residencial Lago Azul'
    }

    function enfileirarEmailSenha(app, destino, nomeMorador, rotulo, senhaTemporaria) {
      try {
        const notifCol = app.findCollectionByNameOrId('notificacoes')
        const notif = new Record(notifCol)
        notif.set('destinatario', destino)
        notif.set('canal', 'email')
        notif.set('tipo', 'acesso_provisionado')
        notif.set(
          'titulo',
          'Acesso liberado à Plataforma Virtual Koinon' + (rotulo ? ' — ' + rotulo : ''),
        )
        notif.set(
          'corpo',
          `Prezado(a) ${nomeMorador},\n\n` +
            `Seu cadastro foi aprovado pela mesa diretora e seu acesso à Plataforma Virtual Koinon foi liberado.\n\n` +
            `Seus dados de acesso:\n` +
            `• E-mail (usuário): ${destino}\n` +
            `• Senha temporária: ${senhaTemporaria}\n\n` +
            `IMPORTANTE: esta senha temporária é válida por 48 horas e o sistema exigirá a troca de senha ` +
            `no seu primeiro acesso. Não compartilhe estes dados.\n\n` +
            `Acesse a plataforma, informe seu e-mail e a senha temporária e cadastre uma nova senha de sua preferência.\n\n` +
            `Atenciosamente,\nMesa Diretora — ${nomeCondominio(app)}`,
        )
        notif.set('status', 'pendente')
        app.save(notif)
      } catch (err) {
        console.log('Aviso ao enfileirar e-mail de senha temporária:', err)
      }
    }

    // Conta já existente com este e-mail? Reativa e vincula (sem expor senha).
    let existente = null
    try {
      existente = e.app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {}

    let userId = ''
    const senhaTemporaria = gerarSenhaTemporaria()

    if (existente) {
      existente.set('ativo', true)
      try {
        e.app.save(existente)
        userId = existente.id
      } catch (errReat) {
        console.log('Aviso ao reativar conta existente do cadastro:', errReat)
      }
    } else {
      const usersCol = e.app.findCollectionByNameOrId('_pb_users_auth_')
      const novoUser = new Record(usersCol)
      novoUser.setEmail(email)
      novoUser.setPassword(senhaTemporaria)
      novoUser.setVerified(true)
      novoUser.set('name', cad.getString('nome') || '')
      novoUser.set('role', 'morador')
      novoUser.set('ativo', true)
      novoUser.set('deve_trocar_senha', true)
      const cpfLimpo = (cad.getString('cpf') || '').replace(/\D/g, '')
      if (cpfLimpo && cpfLimpo.length === 11) novoUser.set('cpf', cpfLimpo)
      const unidadesIds = unidadesDoCadastro(e.app, cad)
      if (unidadesIds.length > 0) {
        novoUser.set('unidades', unidadesIds)
        novoUser.set('unidade', unidadesIds[0])
      }
      try {
        e.app.save(novoUser)
        userId = novoUser.id
      } catch (errSave) {
        console.log('Erro ao provisionar conta do cadastro aprovado:', errSave)
        return
      }
    }

    if (!userId) return

    try {
      cad.set('user_vinculado', userId)
      e.app.save(cad)
    } catch (errVinc) {
      console.log('Aviso ao vincular user_vinculado no cadastro:', errVinc)
    }

    // E-mail de convite apenas para conta NOVA (conta existente já tem senha)
    if (!existente) {
      enfileirarEmailSenha(
        e.app,
        email,
        cad.getString('nome') || 'morador(a)',
        rotuloUnidade(e.app, cad.getString('unidade') || ''),
        senhaTemporaria,
      )
    }
  } catch (err) {
    console.log('Erro no provisionamento pós-aprovação:', err)
  }
}, 'cadastros_unidade')

// ---------------------------------------------------------------------------
// 2. REVOGAÇÃO: desativar/rejeitar/excluir cadastro desativa a conta vinculada
// ---------------------------------------------------------------------------
onRecordUpdate((e) => {
  e.next()
  try {
    const cad = e.record
    const antes = cad.original()

    const statusDepois = cad.getString('status_aprovacao')
    const ficouInativo =
      cad.getBool('ativo') === false || statusDepois === 'rejeitado' || statusDepois === 'excluido'
    const estavaAtivo =
      antes.getBool('ativo') && antes.getString('status_aprovacao') !== 'rejeitado'

    if (!ficouInativo || !estavaAtivo) return

    const userId = cad.getString('user_vinculado') || ''
    if (!userId) return

    try {
      const user = e.app.findRecordById('users', userId)
      if (user.getBool('ativo') !== false) {
        user.set('ativo', false)
        e.app.save(user)
      }
    } catch (errRev) {
      console.log('Aviso ao revogar conta vinculada do cadastro:', errRev)
    }
  } catch (err) {
    console.log('Erro no hook de revogação de acesso:', err)
  }
}, 'cadastros_unidade')

// Exclusão física do cadastro também revoga a conta vinculada
onRecordDelete((e) => {
  e.next()
  try {
    const cad = e.record
    const userId = cad.getString('user_vinculado') || ''
    if (!userId) return
    try {
      const user = e.app.findRecordById('users', userId)
      if (user.getBool('ativo') !== false) {
        user.set('ativo', false)
        e.app.save(user)
      }
    } catch (_) {}
  } catch (err) {
    console.log('Erro no hook de revogação por exclusão de cadastro:', err)
  }
}, 'cadastros_unidade')

// ---------------------------------------------------------------------------
// 3. Troca obrigatória de senha: não permite limpar deve_trocar_senha sem troca
// ---------------------------------------------------------------------------
onRecordUpdate((e) => {
  e.next()
  try {
    const user = e.record
    if (!user.getBool('deve_trocar_senha')) return

    const body = e.requestInfo().body || {}
    const temPassword = Boolean(body.password || body.passwordConfirm)
    if (!temPassword) {
      // Sem troca de senha no corpo: mantém a flag obrigatória
      user.set('deve_trocar_senha', true)
    }
  } catch (err) {
    console.log('Erro no hook de troca obrigatória de senha:', err)
  }
}, 'users')

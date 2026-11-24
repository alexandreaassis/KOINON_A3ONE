/**
 * Hook trocar_senha_obrigatoria.js
 *
 * Rota: POST /backend/v1/usuario/trocar-senha
 *
 * Troca obrigatória de senha no primeiro acesso de conta provisionada
 * (users.deve_trocar_senha = true):
 * - Requer sessão autenticada (token do authStore no header Authorization).
 * - Valida a senha atual autenticando com e-mail + senha no PocketBase.
 * - Exige senha nova forte (mín. 10 caracteres com letra, número e símbolo)
 *   e confirmação idêntica.
 * - Seta password + passwordConfirm e limpa deve_trocar_senha = false na
 *   MESMA gravação (o hook provisionamento_acesso só mantém a flag quando a
 *   gravação NÃO traz password/passwordConfirm).
 * - A senha (atual ou nova) nunca é logada nem retornada na resposta.
 *
 * Convenção JSVM do projeto: TODAS as funções auxiliares ficam INLINE dentro
 * do callback (pool de JSVM não compartilha top-level entre callbacks).
 */
routerAdd(
  'POST',
  '/backend/v1/usuario/trocar-senha',
  (e) => {
    // ---- auxiliares inline (convenção JSVM) ----
    function senhaForte(s) {
      if (!s || s.length < 10) return false
      return /[a-zA-Z]/.test(s) && /\d/.test(s) && /[^a-zA-Z0-9]/.test(s)
    }

    function resposta(status, obj) {
      e.json(status, obj)
    }

    const info = e.requestInfo()
    const body = (info && info.body) || {}
    const auth = e.auth

    if (!auth || !auth.id) {
      resposta(401, { success: false, message: 'Sessão expirada. Faça login novamente.' })
      return
    }

    const senhaAtual = String(body.senha_atual || '')
    const novaSenha = String(body.nova_senha || '')
    const confirmacao = String(body.confirmacao_senha || '')

    if (!senhaAtual) {
      resposta(400, { success: false, message: 'Informe a senha atual (temporária).' })
      return
    }
    if (!senhaForte(novaSenha)) {
      resposta(400, {
        success: false,
        message: 'A nova senha deve ter ao menos 10 caracteres, com letras, números e um símbolo.',
      })
      return
    }
    if (novaSenha !== confirmacao) {
      resposta(400, { success: false, message: 'A confirmação não corresponde à nova senha.' })
      return
    }

    // Carrega o registro fresco (e.auth pode estar defasado quanto ao flag)
    let user = null
    try {
      user = e.app.findRecordById('users', auth.id)
    } catch (_) {
      resposta(401, { success: false, message: 'Sessão expirada. Faça login novamente.' })
      return
    }
    if (!user || user.getBool('ativo') === false) {
      resposta(403, { success: false, message: 'Usuário inativo — contate a administração.' })
      return
    }

    // Valida a senha atual autenticando com as credenciais informadas
    try {
      e.app.findAuthRecordByEmail('_pb_users_auth_', user.getString('email'), (found) => {
        found.validatePassword(senhaAtual)
        return found
      })
    } catch (errValid) {
      resposta(400, { success: false, message: 'Senha atual incorreta.' })
      return
    }

    // Gravação única: password + passwordConfirm + flag limpa
    user.setPassword(novaSenha)
    user.set('deve_trocar_senha', false)
    try {
      e.app.save(user)
    } catch (errSave) {
      console.log('Erro ao gravar nova senha do usuário:', errSave)
      resposta(500, {
        success: false,
        message: 'Não foi possível trocar a senha agora. Tente novamente.',
      })
      return
    }

    resposta(200, {
      success: true,
      message: 'Senha alterada com sucesso.',
      deve_trocar_senha: false,
    })
  },
  $apis.requireAuth(),
)

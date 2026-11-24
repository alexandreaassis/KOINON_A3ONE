/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 0049 — Provisionamento automático de acesso
 *
 * (a) Novos campos:
 *     - users.deve_trocar_senha (bool, default false)
 *     - cadastros_unidade.user_vinculado (relation → users, single)
 *
 * (b) Backfill idempotente: para cada cadastros_unidade com
 *     status_aprovacao = 'aprovado' sem conta vinculada, cria users
 *     (role morador, senha temporária forte aleatória, deve_trocar_senha = true)
 *     e enfileira e-mail de convite com a senha temporária (canal `notificacoes`).
 *     E-mail é o canal obrigatório; senha nunca é logada nem retornada ao front.
 *
 * No-op seguro em base vazia.
 */
migrate(
  (app) => {
    // ---------------- (a) Campos ----------------
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!users.fields.getByName('deve_trocar_senha')) {
        users.fields.add(
          new BoolField({
            name: 'deve_trocar_senha',
          }),
        )
        app.save(users)
      }
    } catch (err) {
      console.log('Migration 0049: erro ao garantir users.deve_trocar_senha:', err)
    }

    try {
      const cads = app.findCollectionByNameOrId('cadastros_unidade')
      if (!cads.fields.getByName('user_vinculado')) {
        cads.fields.add(
          new RelationField({
            name: 'user_vinculado',
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          }),
        )
        app.save(cads)
      }
    } catch (err) {
      console.log('Migration 0049: erro ao garantir cadastros_unidade.user_vinculado:', err)
    }

    // ---------------- (b) Backfill idempotente ----------------
    const senhasProvisionadas = []

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

    try {
      const aprovadosSemConta = app.findRecordsByFilter(
        'cadastros_unidade',
        'status_aprovacao = "aprovado"',
        '-created',
        1000,
        0,
      )

      for (const cad of aprovadosSemConta) {
        // Idempotência: já tem conta vinculada
        let vinculado = ''
        try {
          vinculado = cad.getString('user_vinculado') || ''
        } catch (_) {}
        if (vinculado) continue

        const email = (cad.getString('email') || '').trim().toLowerCase()
        if (!email || !email.includes('@')) continue

        // Já existe conta com esse e-mail? Então apenas vincula (idempotente)
        let existente = null
        try {
          existente = app.findAuthRecordByEmail('_pb_users_auth_', email)
        } catch (_) {}

        const unidadesIds = []
        try {
          const v = cad.get('unidades')
          if (Array.isArray(v)) {
            for (let i = 0; i < v.length; i++) {
              const idU = String(v[i] || '').trim()
              if (idU && idU !== 'none' && unidadesIds.indexOf(idU) === -1) unidadesIds.push(idU)
            }
          }
        } catch (_) {}
        const unidadeLegado = cad.getString('unidade') || ''
        if (
          unidadeLegado &&
          unidadeLegado !== 'none' &&
          unidadesIds.indexOf(unidadeLegado) === -1
        ) {
          unidadesIds.push(unidadeLegado)
        }

        let userId = ''
        let senhaTemporaria = ''

        if (existente) {
          userId = existente.id
          // Reativa se estava inativa e a fonte da verdade (cadastro) está aprovada/ativa
          if (cad.getBool('ativo') && existente.getBool('ativo') === false) {
            existente.set('ativo', true)
            try {
              app.save(existente)
            } catch (_) {}
          }
        } else {
          senhaTemporaria = $security.randomString(18) + 'Aa1!' + $security.randomString(2)
          const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
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
          if (unidadesIds.length > 0) {
            novoUser.set('unidades', unidadesIds)
            novoUser.set('unidade', unidadesIds[0])
          }
          try {
            app.save(novoUser)
            userId = novoUser.id
          } catch (errSave) {
            console.log('Migration 0049: falha ao criar conta para cadastro', cad.id, errSave)
            continue
          }
        }

        try {
          cad.set('user_vinculado', userId)
          app.save(cad)
        } catch (errVinc) {
          console.log('Migration 0049: falha ao vincular user_vinculado:', errVinc)
        }

        // Enfileira e-mail de convite apenas para contas NOVAS (com senha temporária)
        if (senhaTemporaria) {
          senhasProvisionadas.push({
            email,
            nome: cad.getString('nome') || '',
            rotulo: rotuloUnidade(app, unidadesIds[0] || ''),
            senha: senhaTemporaria,
          })
        }
      }
    } catch (errBackfill) {
      console.log('Migration 0049: erro no backfill de aprovados sem conta:', errBackfill)
    }

    // Enfileira os e-mails de convite (um por conta criada; senha só no corpo do e-mail)
    try {
      const notifCol = app.findCollectionByNameOrId('notificacoes')
      let nomeCondo = 'Condomínio Residencial Lago Azul'
      try {
        const configs = app.findRecordsByFilter('configuracoes', '', '-created', 1, 0)
        if (configs && configs.length > 0) {
          nomeCondo = configs[0].getString('nome_condominio') || nomeCondo
        }
      } catch (_) {}

      for (let i = 0; i < senhasProvisionadas.length; i++) {
        const p = senhasProvisionadas[i]
        const notif = new Record(notifCol)
        notif.set('destinatario', p.email)
        notif.set('canal', 'email')
        notif.set('tipo', 'acesso_provisionado')
        notif.set(
          'titulo',
          `Acesso liberado à Plataforma Virtual Koinon${p.rotulo ? ' — ' + p.rotulo : ''}`,
        )
        notif.set(
          'corpo',
          `Prezado(a) ${p.nome},\n\n` +
            `Seu cadastro no ${nomeCondo} foi aprovado e seu acesso à Plataforma Virtual Koinon foi liberado.\n\n` +
            `Seus dados de acesso:\n` +
            `• E-mail (usuário): ${p.email}\n` +
            `• Senha temporária: ${p.senha}\n\n` +
            `IMPORTANTE: esta senha temporária é válida por 48 horas e o sistema exigirá a troca de senha no seu primeiro acesso. Não compartilhe estes dados.\n\n` +
            `Atenciosamente,\nMesa Diretora — ${nomeCondo}`,
        )
        notif.set('status', 'pendente')
        app.save(notif)
      }
      if (senhasProvisionadas.length > 0) {
        console.log(
          'Migration 0049: backfill concluído —',
          senhasProvisionadas.length,
          'conta(s) criada(s) e convite(s) enfileirado(s).',
        )
      }
    } catch (errNotif) {
      console.log('Migration 0049: erro ao enfileirar convites do backfill:', errNotif)
    }
  },
  (app) => {
    // Down: remove campos criados (dados de contas permanecem)
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (users.fields.getByName('deve_trocar_senha')) {
        users.fields.removeByName('deve_trocar_senha')
        app.save(users)
      }
    } catch (_) {}
    try {
      const cads = app.findCollectionByNameOrId('cadastros_unidade')
      if (cads.fields.getByName('user_vinculado')) {
        cads.fields.removeByName('user_vinculado')
        app.save(cads)
      }
    } catch (_) {}
  },
)

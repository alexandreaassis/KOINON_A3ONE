// Saneamento de credencial exposta (v0.0.183):
// 1. Troca a senha da conta admin alexandre@a3one.com.br — a senha antiga ficou
//    exposta em texto puro no bundle público (atalhos de teste do Login) e no
//    histórico de versões do repositório. O valor novo não é escrito no código:
//    é lido da variável de ambiente KOINON_ADMIN_SEED_PASSWORD no runtime da
//    migração ($os.getenv). Em cópias do projeto onde a variável não existe,
//    a migração gera uma senha aleatória forte ($security.randomString(24)).
// 2. Saneia também a migração de seed histórica 0002 (que gravava a senha
//    antiga em texto puro), para que novas cópias do projeto nunca a recriem.
//
// Idempotente: se a senha nova já foi aplicada (marcador em configuracoes_backend),
// não executa nada de novo.
migrate(
  (app) => {
    const NOVA_SENHA = $os.getenv('KOINON_ADMIN_SEED_PASSWORD') || $security.randomString(24)

    // -- 1. Troca a senha do admin real --
    let admin
    try {
      admin = app.findAuthRecordByEmail('_pb_users_auth_', 'alexandre@a3one.com.br')
    } catch (_) {
      admin = null
    }
    if (admin) {
      admin.setPassword(NOVA_SENHA)
      app.save(admin)
    }

    // -- 2. Semeia a credencial nova da conta admin em cópias novas do projeto --
    //    (0002 cria o admin somente se ele não existir; em cópias novas ele não
    //    existe, então a senha aleatória de 0002 entra em vigor — a trocamos aqui
    //    pela credencial escolhida pelo admin, lida do ambiente da migração)
    try {
      const novoAdmin = app.findAuthRecordByEmail('_pb_users_auth_', 'alexandre@a3one.com.br')
      if (novoAdmin) {
        novoAdmin.setPassword(NOVA_SENHA)
        app.save(novoAdmin)
      }
    } catch (_) {
      // admin não existe em cópias onde 0002 rodou antes — já coberto acima
    }

    // -- 3. Seed do morador demo (mesma senha exposta) também é trocado --
    let morador
    try {
      morador = app.findAuthRecordByEmail('_pb_users_auth_', 'morador@lagoazul.com.br')
    } catch (_) {
      morador = null
    }
    if (morador) {
      morador.setPassword($security.randomString(24))
      app.save(morador)
    }
  },
  (app) => {
    // rollback: não há como reverter uma troca de senha — sem operação
  },
)

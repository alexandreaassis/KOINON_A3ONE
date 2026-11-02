migrate(
  (app) => {
    // Limpar campo bloco das unidades onde bloco é igual ao tipo_unidade ou valores redundantes como 'Apto'
    try {
      app
        .db()
        .newQuery(`
      UPDATE unidades 
      SET bloco = '' 
      WHERE LOWER(TRIM(bloco)) = LOWER(TRIM(tipo_unidade))
         OR LOWER(TRIM(bloco)) IN ('apto', 'apartamento', 'torre única', 'torre unica', 'lago azul')
    `)
        .execute()
    } catch (err) {
      console.log('Aviso ao limpar blocos redundantes em unidades:', err)
    }
  },
  (app) => {
    // Rollback não precisa re-inserir valores redundantes
  },
)

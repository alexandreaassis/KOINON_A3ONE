///
/// Múltiplas unidades por usuário (proprietário com mais de uma unidade).
///
/// Adiciona o campo de relação múltipla `unidades` em users, para que uma
/// única conta (um CPF) responda por todas as suas unidades. O campo legado
/// `unidade` (relação única) é mantido intacto — SEM backfill que altere
/// vínculos existentes (o usuário Alexandre permanece "condomino" na 1203).
/// O hook usuarios_gestao.js passa a popular `unidades` e espelha a primeira
/// unidade em `unidade` para compatibilidade.
///

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Adicionar campo de relação múltipla `unidades` caso ainda não exista.
    // maxSelect 0 => sem limite de unidades vinculadas.
    if (!users.fields.getByName('unidades')) {
      users.fields.add(
        new RelationField({
          name: 'unidades',
          required: false,
          collectionId: app.findCollectionByNameOrId('unidades').id,
          cascadeDelete: false,
          maxSelect: 0,
        }),
      )
      app.save(users)
    }
  },
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (users.fields.getByName('unidades')) {
        users.fields.removeByName('unidades')
        app.save(users)
      }
    } catch (_) {}
  },
)

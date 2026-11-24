# Guia: onde ficam os segredos do Koinon

Nenhum segredo (chave de API, token, senha) pode ser versionado no Git.
Segredos em texto puro no histórico fizeram o GitHub bloquear o push deste
repositório (secret scanning — Groq API Key). Regra definitiva:

| Segredo        | Onde vive no runtime                              | Como atualizar                                                                                  |
| -------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Groq (Whisper) | `configuracoes_backend` → registro `GROQ_API_KEY` | Painel Skip Cloud → collection `configuracoes_backend`, ou POST `/backend/v1/admin/groq/config` |
| ZapSign        | `configuracoes_backend` (cifrado AES-256)         | Painel Admin Koinon → Configurações → Assinatura Eletrônica Externa (ZapSign)                   |
| SMTP / e-mail  | `configuracoes_backend`                           | Painel Admin Koinon → Configurações → Canais de Envio                                           |

Notas:

- O hook de transcrição `/backend/v1/atas/transcrever-audio` lê a chave Groq
  primeiro de `$os.getenv('GROQ_API_KEY')` e, se ausente, da collection
  `configuracoes_backend`. Deixe o `.env` do projeto **sem** a variável.
- A collection `configuracoes_backend` tem TODAS as API rules nulas: só é lida
  por hooks server-side (superuser). O endpoint `/admin/groq/config` exige
  sessão de usuário com `role = 'admin'` e nunca devolve o valor.
- A migration `0017_create_configuracoes_backend.js` apenas cria a collection
  e o registro com valor vazio — a chave em si nunca mais é versionada.

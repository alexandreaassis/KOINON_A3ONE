import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// v0.0.166 — Timeout do cliente de 360s (6 min): o envio do edital à ZapSign
// carrega o PDF em base64 no body do POST; com payload grande (PNG sem com-
// pressão inflava o PDF em bytes) o upload podia ultrapassar o timeout default
// do fetch e morrer como HTTP 0 (requisição não chega ao servidor). Clientes
// do SDK herdam este timeout (pb.send das rotas /backend/v1/*).
pb.beforeSend = function (url, options) {
  return { ...options, signal: AbortSignal.timeout(360_000) }
}

export default pb

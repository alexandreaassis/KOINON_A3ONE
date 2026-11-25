import { api, type CadastroUnidadeRecord, type UnidadeRecord } from '@/lib/api'

/**
 * Fonte do nome do titular da unidade:
 *
 * 1. cadastros_unidade — registro de vínculo mais relevante da unidade
 *    (aprovado/ativo primeiro, depois pendente; mais recente como desempate),
 *    mantido pela mesa em /mesa/credenciamentos.
 * 2. unidades.responsavel_nome — apenas fallback (está com placeholders
 *    "Condômino Apto NNNN" e não há tela que o mantenha).
 *
 * Placeholders conhecidos (ex.: "Condômino Apto 1203") nunca são exibidos:
 * são filtrados e caem para o próximo passo da cadeia.
 */

/** Placeholder legado gravado em unidades.responsavel_nome — nunca exibir. */
const PADRAO_PLACEHOLDER = /cond[ôo]mino\s+apto\s*\d+/i

export const ehPlaceholderTitular = (nome?: string | null): boolean => {
  if (!nome || !nome.trim()) return true
  return PADRAO_PLACEHOLDER.test(nome.trim())
}

const pesoRegistro = (r: CadastroUnidadeRecord): number => {
  if (r.status_aprovacao === 'aprovado' && r.ativo !== false) return 3
  if (r.status_aprovacao === 'aprovado') return 2
  if (r.status_aprovacao !== 'rejeitado' && r.ativo !== false) return 1
  return 0
}

/** Mais relevante primeiro (aprovado+ativo > aprovado > pendente); empate: mais recente. */
export const ordenarCadastrosPorRelevancia = (
  registros: CadastroUnidadeRecord[],
): CadastroUnidadeRecord[] =>
  [...registros].sort((a, b) => {
    const p = pesoRegistro(b) - pesoRegistro(a)
    if (p !== 0) return p
    const ta = new Date(a.created || 0).getTime()
    const tb = new Date(b.created || 0).getTime()
    return tb - ta
  })

const primeiroNomeValido = (
  registros: CadastroUnidadeRecord[],
  fallback: string | null,
): string | null => {
  const ordenado = ordenarCadastrosPorRelevancia(registros)
  for (const r of ordenado) {
    if (!ehPlaceholderTitular(r.nome)) return r.nome.trim()
  }
  return fallback
}

const fallbackResponsavel = (unidade?: Pick<UnidadeRecord, 'responsavel_nome'> | null) => {
  const nome = unidade?.responsavel_nome?.trim()
  if (!nome || ehPlaceholderTitular(nome)) return null
  return nome
}

/**
 * Resolve o nome do titular de UMA unidade: cadastros_unidade (mais relevante,
 * mais recente em caso de histórico) com fallback para unidades.responsavel_nome.
 * Retorna null quando não há nome confiável.
 */
export const resolverNomeTitular = async (
  unidade: Pick<UnidadeRecord, 'id' | 'responsavel_nome'> | null | undefined,
): Promise<string | null> => {
  if (!unidade?.id) return null
  try {
    const registros = await api.getCadastrosUnidades({ unidadeId: unidade.id })
    return primeiroNomeValido(registros, fallbackResponsavel(unidade))
  } catch {
    // Regra de leitura ou rede falhou: segue com o fallback sem propagar erro.
    return fallbackResponsavel(unidade)
  }
}

/**
 * Resolve o nome do titular em LOTE (uma única busca de cadastros_unidade),
 * devolvendo o mapa unidadeId → nome. Unidades sem nome confiável não entram
 * no mapa — quem consome decide o que exibir.
 */
export const resolverNomesTitularesEmLote = async (
  unidades: Pick<UnidadeRecord, 'id' | 'responsavel_nome'>[],
): Promise<Record<string, string>> => {
  const mapa: Record<string, string> = {}
  if (unidades.length === 0) return mapa
  const unidadesPorId = new Map(unidades.map((u) => [u.id, u]))
  try {
    const registros = await api.getCadastrosUnidades()
    for (const r of registros) {
      const unidade = unidadesPorId.get(r.unidade)
      if (!unidade) continue
      if (!(r.unidade in mapa)) {
        mapa[r.unidade] = '' // marcador provisório; preenchido abaixo
      }
    }
    // Ordena uma vez e preenche só o primeiro nome válido de cada unidade.
    const ordenados = ordenarCadastrosPorRelevancia(registros)
    for (const r of ordenados) {
      if (!unidadesPorId.has(r.unidade)) continue
      if (mapa[r.unidade]) continue
      if (!ehPlaceholderTitular(r.nome)) mapa[r.unidade] = r.nome.trim()
    }
    // Fallback responsavel_nome para unidades sem cadastro com nome válido.
    for (const id of Object.keys(mapa)) {
      if (!mapa[id]) {
        const fb = fallbackResponsavel(unidadesPorId.get(id))
        if (fb) mapa[id] = fb
        else delete mapa[id]
      }
    }
  } catch {
    // Sem acesso a cadastros_unidade: só fallback por unidade.
    for (const u of unidades) {
      const fb = fallbackResponsavel(u)
      if (fb) mapa[u.id] = fb
    }
  }
  return mapa
}

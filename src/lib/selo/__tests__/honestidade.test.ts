/**
 * Testes unitários da função de decisão de honestidade do selo de assinatura.
 * Executados via `npx tsx src/lib/selo/__tests__/honestidade.test.ts` (sem Vitest no template).
 */
import { decidirSelo, validarInstrucoesEdital, type RequisitosAssinatura } from '../honestidade'

let falhas = 0
function verificar(nome: string, condicao: boolean, detalhe?: any) {
  if (condicao) {
    console.log(`  ✓ ${nome}`)
  } else {
    falhas++
    console.error(`  ✗ ${nome}`, detalhe !== undefined ? detalhe : '')
  }
}

console.log('decidirSelo / validarInstrucoesEdital')

// 1. Padrão sem qualquer requisito: simples
{
  const d = decidirSelo({})
  verificar('sem requisitos → nível simples', d.nivel === 'simples', d)
  verificar('sem requisitos → cita art. 10 §2º', d.textoLegal.includes('art. 10, §2º'), d)
  verificar('sem requisitos → não cita §1º', !d.textoLegal.includes('§1º'), d)
  verificar(
    'sem requisitos → não menciona conformidade',
    !d.textoLegal.toLowerCase().includes('conformidade'),
  )
  verificar('sem requisitos → não menciona ICP', !d.textoLegal.includes('ICP'))
  verificar(
    'sem requisitos → não menciona certificado digital',
    !d.textoLegal.includes('certificado'),
  )
  verificar('sem requisitos → não menciona data certificada', !d.textoLegal.includes('certificada'))
  verificar(
    'sem requisitos → cita Lei 14.063/2020 como referência',
    d.textoLegal.includes('14.063/2020'),
  )
  verificar('sem requisitos → exigeAtencao', d.exigeAtencao === true)
}

// 2. 2FA sozinho: ainda simples
verificar('2FA sozinho → simples', decidirSelo({ doisFatoresAtivo: true }).nivel === 'simples')

// 3. Cadastro verificado sozinho: simples
verificar(
  'cadastro verificado sozinho → simples',
  decidirSelo({ cadastroVerificado: true }).nivel === 'simples',
)

// 4. Reautenticação sozinha: simples
verificar(
  'reautenticação sozinha → simples',
  decidirSelo({ reautenticacaoNoAto: true }).nivel === 'simples',
)

// 5. Todos os requisitos → avançada
{
  const r: RequisitosAssinatura = {
    cadastroVerificado: true,
    reautenticacaoNoAto: true,
    doisFatoresAtivo: true,
  }
  const d = decidirSelo(r)
  verificar('3 requisitos → avançada', d.nivel === 'avancada', d)
  verificar('avançada → cita Lei 14.063/2020', d.textoLegal.includes('14.063/2020'))
  verificar('avançada → cita MP 2.200-2/2001', d.textoLegal.includes('MP 2.200-2/2001'))
  verificar('avançada → não cita §1º', !d.textoLegal.includes('§1º'))
  verificar('avançada → não declara ICP-Brasil', !d.textoLegal.includes('ICP-Brasil'))
  verificar('avançada → sem aviso de atenção', d.exigeAtencao === false)
}

// 6. Desativar o 2FA em uma assinatura avançada → cai para simples (critério do usuário)
{
  const comTudo: RequisitosAssinatura = {
    cadastroVerificado: true,
    reautenticacaoNoAto: true,
    doisFatoresAtivo: true,
  }
  verificar('com 2FA → avançada', decidirSelo(comTudo).nivel === 'avancada')

  const sem2fa: RequisitosAssinatura = { ...comTudo, doisFatoresAtivo: false }
  verificar('desativado 2FA → simples', decidirSelo(sem2fa).nivel === 'simples')
}

// 7. Faltando reautenticação no ato → simples (apesar de 2FA + cadastro)
verificar(
  'sem reautenticação no ato → simples',
  decidirSelo({ cadastroVerificado: true, doisFatoresAtivo: true }).nivel === 'simples',
)

// 8. Faltando cadastro verificado → simples
verificar(
  'sem cadastro verificado → simples',
  decidirSelo({ reautenticacaoNoAto: true, doisFatoresAtivo: true }).nivel === 'simples',
)

// 9. Nunca declarar "data certificada" sem carimbo de ACT
verificar(
  'sem ACT → nunca declara data certificada',
  !decidirSelo({ carimboTempoAct: false }).textoLegal.includes('certificada'),
)
verificar(
  'sem ACT → nunca declara data certificada (null)',
  !decidirSelo(null).textoLegal.includes('certificada'),
)

// 10. ICP-Brasil: só com certificado real
verificar(
  'flag ICP sem certificado → não menciona ICP-Brasil',
  !decidirSelo({ certificadoIcpBrasil: false }).textoLegal.includes('ICP-Brasil'),
)

// 11. null/undefined → simples
verificar('null → simples', decidirSelo(null).nivel === 'simples')
verificar('undefined → simples', decidirSelo(undefined).nivel === 'simples')

// 12. validação do bloco de instruções do edital
{
  verificar('sem instruções → 8 faltantes', validarInstrucoesEdital(null).length === 8)
  verificar(
    'com instruções completas → vazio',
    validarInstrucoesEdital({
      modalidade: 'híbrida',
      linkAcesso: 'https://app',
      formaAutenticacao: 'CPF + OTP',
      janelaVotacao: '19h às 22h',
      formaPedirPalavra: 'botão da plataforma',
      formaColetaVoto: 'urna eletrônica com hash',
      contatoSuporte: 'suporte@koinon.app',
      avisoResponsabilidade: 'Administração não responde por falhas do participante',
    }).length === 0,
  )
  verificar(
    'faltando contato de suporte → 1 faltante',
    validarInstrucoesEdital({
      modalidade: 'híbrida',
      linkAcesso: 'https://app',
      formaAutenticacao: 'CPF + OTP',
      janelaVotacao: '19h às 22h',
      formaPedirPalavra: 'botão da plataforma',
      formaColetaVoto: 'urna eletrônica com hash',
      contatoSuporte: '',
      avisoResponsabilidade: 'Administração não responde por falhas do participante',
    }).length === 1,
  )
}

if (falhas > 0) {
  console.error(`\n${falhas} verificação(ões) falharam.`)
  process.exit(1)
} else {
  console.log('\nTodos os testes de honestidade do selo passaram.')
}

/**
 * Gerador de PDF da Lista de Presença em BYTES (Uint8Array) via jsPDF.
 * Exclusivo para o anexo enviado à ZapSign — a via de impressão/manual
 * (window.print com CSS @page) não é afetada.
 *
 * Margens oficiais Koinon (v0.0.142): 8,5mm topo / 15mm laterais / 15mm rodapé.
 * Área útil de captura: 180mm de largura.
 */
import { jsPDF } from 'jspdf'

export interface SignatarioListaPresenca {
  nome: string
  cpf?: string
  cargo?: string
  email?: string
}

export interface LinhaPresencaPdf {
  identificadorUnidade: string
  nomeParticipante: string
  forma: string
  nomeProcurador?: string
  dataHora: string
  modoAssinatura?: string
}

export interface DadosListaPresencaPdf {
  nomeCondominio: string
  logoDataUrl?: string | null
  tituloDeliberacao: string
  textoAbertura?: string
  dataAssembleia?: string | null
  localAssembleia?: string | null
  linhas: LinhaPresencaPdf[]
  presidente?: SignatarioListaPresenca | null
  secretario?: SignatarioListaPresenca | null
  viaZapsign: true
}

const MARGEM_TOPO = 8.5
const MARGEM_LATERAL = 15
const MARGEM_RODAPE = 15
const LARGURA_UTIL = 210 - MARGEM_LATERAL * 2 // 180mm (A4)

const corTexto: [number, number, number] = [30, 41, 59]
const corDestaque: [number, number, number] = [0, 102, 255]
const corLinha: [number, number, number] = [203, 213, 225]
const corZebra: [number, number, number] = [241, 245, 249]

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

const rotuloForma = (forma: string): string => {
  if (forma === 'presencial') return 'Presencial'
  if (forma === 'remoto') return 'Remoto'
  if (forma === 'procuracao') return 'Procuração'
  return forma
}

export const gerarPdfListaPresencaBytes = async (
  dados: DadosListaPresencaPdf,
): Promise<Uint8Array> => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageH = doc.internal.pageSize.getHeight()

  let y = MARGEM_TOPO

  // Cabeçalho: logo/título
  if (dados.logoDataUrl) {
    try {
      doc.addImage(dados.logoDataUrl, 'PNG', MARGEM_LATERAL, y, 24, 24)
    } catch {
      /* logo inválida: seguir sem imagem */
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...corTexto)
  doc.text(
    dados.nomeCondominio || 'Condomínio',
    MARGEM_LATERAL + (dados.logoDataUrl ? 28 : 0),
    y + 8,
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('Lista de Presença de Assembleia', MARGEM_LATERAL + (dados.logoDataUrl ? 28 : 0), y + 13)

  y += 30

  // Título da deliberação
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...corDestaque)
  const tituloLinhas = doc.splitTextToSize(dados.tituloDeliberacao, LARGURA_UTIL)
  doc.text(tituloLinhas, MARGEM_LATERAL, y)
  y += tituloLinhas.length * 5 + 3

  // Dados da assembleia
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...corTexto)
  const infoAssembleia: string[] = []
  if (dados.dataAssembleia) infoAssembleia.push(`Data: ${dados.dataAssembleia}`)
  if (dados.localAssembleia) infoAssembleia.push(`Local: ${dados.localAssembleia}`)
  if (infoAssembleia.length) {
    doc.text(infoAssembleia.join('  •  '), MARGEM_LATERAL, y)
    y += 5
  }

  if (dados.textoAbertura) {
    const aberturaLinhas = doc.splitTextToSize(dados.textoAbertura, LARGURA_UTIL)
    doc.text(aberturaLinhas, MARGEM_LATERAL, y)
    y += aberturaLinhas.length * 4.5 + 2
  }

  y += 3

  // Tabela de presenças
  // v0.0.193: rebalanceamento espelhando a tela /mesa/presenca — Nome estreito
  // (maior titular em uma linha), Procurador(a) dedicado com largura calibrada
  // pela MEDIDA DE TEXTO real (doc.getTextWidth) do maior nome de procurador
  // (ex.: "Edilaine Pereira Lima Zanoni" em UMA linha), em vez do antigo
  // "Procurador: ..." dentro da coluna Registro. Margens oficiais e 180mm intactas.
  // v0.0.237: colunas fixas enxugadas (Unidade 18, Forma 18, Registro 30) para
  // a coluna Procurador(a) acomodar "Nome — CPF: 000.000.000-00" em UMA linha
  // sem cortar o CPF; 180mm oficiais preservados.
  const colUnidade = 18
  const colForma = 18
  const colData = 30
  // Procurador(a): largura calibrada pela medida de texto real do maior conteúdo
  // da coluna ("Nome — CPF: 000.000.000-00" em UMA linha, v0.0.237); 0 quando
  // nenhuma presença for por procuração (a área volta para a coluna Nome).
  const larguraProcurador = ((): number => {
    const maior = dados.linhas.reduce(
      (m, l) => ((l.nomeProcurador || '').length > m.length ? l.nomeProcurador || '' : m),
      '',
    )
    if (!maior) return 0
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const larguraTexto = doc.getTextWidth(maior)
    return Math.min(85, Math.max(0, Math.ceil((larguraTexto + 5) * 10) / 10))
  })()
  const colProcurador = larguraProcurador
  const colNome = LARGURA_UTIL - colUnidade - colForma - colData - colProcurador

  const desenharCabecalho = (py: number): number => {
    doc.setFillColor(...corDestaque)
    doc.rect(MARGEM_LATERAL, py, LARGURA_UTIL, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(255, 255, 255)
    doc.text('Unidade', MARGEM_LATERAL + 2, py + 5.5)
    doc.text('Participante', MARGEM_LATERAL + colUnidade + 2, py + 5.5)
    doc.text('Forma', MARGEM_LATERAL + colUnidade + colNome + 2, py + 5.5)
    if (colProcurador > 0) {
      doc.text('Procurador(a)', MARGEM_LATERAL + colUnidade + colNome + colForma + 2, py + 5.5)
    }
    doc.text(
      'Registro',
      MARGEM_LATERAL + colUnidade + colNome + colForma + colProcurador + 2,
      py + 5.5,
    )
    return py + 8
  }

  y = desenharCabecalho(y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)

  if (dados.linhas.length === 0) {
    doc.setTextColor(100, 116, 139)
    doc.text('Nenhuma presença registrada até o momento.', MARGEM_LATERAL + 2, y + 5)
    y += 10
  }

  dados.linhas.forEach((linha, idx) => {
    // Quebra de página: redesenha cabeçalho (margens oficiais preservadas)
    if (y > pageH - MARGEM_RODAPE - 14) {
      doc.addPage()
      y = MARGEM_TOPO
      y = desenharCabecalho(y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
    }

    if (idx % 2 === 1) {
      doc.setFillColor(...corZebra)
      doc.rect(MARGEM_LATERAL, y, LARGURA_UTIL, 8, 'F')
    }

    doc.setTextColor(...corTexto)
    doc.text(formatarLinha(linha.identificadorUnidade, colUnidade - 4), MARGEM_LATERAL + 2, y + 5.5)
    doc.text(
      formatarLinha(linha.nomeParticipante, colNome - 4),
      MARGEM_LATERAL + colUnidade + 2,
      y + 5.5,
    )
    doc.text(rotuloForma(linha.forma), MARGEM_LATERAL + colUnidade + colNome + 2, y + 5.5)
    if (linha.forma === 'procuracao' && linha.nomeProcurador) {
      doc.setTextColor(100, 116, 139)
      // v0.0.237: UMA linha só — se a string não couber na coluna, trunca com
      // reticências (nunca quebra em duas); colNome absorve o excedente.
      doc.text(
        formatarLinha(linha.nomeProcurador, Math.max(colProcurador - 2, 10)),
        MARGEM_LATERAL + colUnidade + colNome + colForma + 2,
        y + 5.5,
      )
      doc.setTextColor(...corTexto)
    }
    doc.text(
      formatarLinha(linha.dataHora, colData - 4),
      MARGEM_LATERAL + colUnidade + colNome + colForma + colProcurador + 2,
      y + 5.5,
    )
    doc.setDrawColor(...corLinha)
    doc.line(MARGEM_LATERAL, y + 8, MARGEM_LATERAL + LARGURA_UTIL, y + 8)
    y += 8
  })

  // Nota ZapSign (enxuta, sem bloco criptográfico — padrão da ata)
  y += 6
  if (y > pageH - MARGEM_RODAPE - 30) {
    doc.addPage()
    y = MARGEM_TOPO
  }
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  const nota = doc.splitTextToSize(
    'Documento assinado eletronicamente por meio da plataforma ZapSign, com registro de IP, e-mail e data/hora de cada signatário.',
    LARGURA_UTIL,
  )
  doc.text(nota, MARGEM_LATERAL, y)
  y += nota.length * 4 + 4

  // Blocos de assinatura da mesa (sem linhas para preencher — assinatura é na ZapSign)
  const blocos: SignatarioListaPresenca[] = []
  if (dados.presidente) blocos.push({ ...dados.presidente, cargo: 'Presidente da Assembleia' })
  if (dados.secretario) blocos.push({ ...dados.secretario, cargo: 'Secretário(a) da Assembleia' })

  if (blocos.length > 0) {
    if (y > pageH - MARGEM_RODAPE - 34) {
      doc.addPage()
      y = MARGEM_TOPO
    }
    const larguraBloco = blocos.length === 2 ? (LARGURA_UTIL - 10) / 2 : LARGURA_UTIL
    blocos.forEach((b, i) => {
      const x = MARGEM_LATERAL + i * (larguraBloco + 10)
      doc.setDrawColor(...corTexto)
      doc.setLineWidth(0.4)
      doc.line(x, y + 14, x + larguraBloco, y + 14)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...corTexto)
      doc.text(b.nome || '—', x, y + 19, { maxWidth: larguraBloco })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(b.cargo || '', x, y + 23.5, { maxWidth: larguraBloco })
    })
    y += 30
  }

  // Rodapé (nota de emissão)
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Emitido pelo Koinon em ${new Date().toLocaleString('pt-BR')}  •  Página ${p} de ${paginas}`,
      MARGEM_LATERAL,
      pageH - 8,
    )
  }

  return new Uint8Array(doc.output('arraybuffer'))
}

const formatarLinha = (texto: string | undefined, larguraCaracteres: number): string => {
  const t = (texto || '').trim()
  if (t.length <= larguraCaracteres) return t
  return `${t.slice(0, larguraCaracteres - 1)}…`
}

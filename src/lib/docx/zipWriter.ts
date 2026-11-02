/**
 * Gerador de arquivo ZIP e DOCX (Office Open XML) nativo em TypeScript puro
 * sem dependências externas pesadas, gerando um .docx padrão ISO/IEC 29500-1
 * perfeitamente compatível com Microsoft Word, Google Docs, LibreOffice e Apple Pages.
 */

// Tabela CRC32 pré-calculada
const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[n] = c >>> 0
}

function calcularCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export interface ArquivoZip {
  nome: string
  dados: Uint8Array
}

/**
 * Cria um arquivo ZIP (Store / sem compressão) contendo os arquivos indicados.
 * Microsoft Word aceita perfeitamente arquivos OOXML .docx em formato Store (compression method 0).
 */
export function criarZip(arquivos: ArquivoZip[]): Blob {
  const encoder = new TextEncoder()
  const entradasLocais: Uint8Array[] = []
  const entradasDiretorioCentral: Uint8Array[] = []
  let offset = 0

  for (const arq of arquivos) {
    const nomeBytes = encoder.encode(arq.nome)
    const dados = arq.dados
    const crc = calcularCrc32(dados)
    const tamanho = dados.length

    // Cabeçalho do arquivo local (30 bytes + nome)
    const cabecalhoLocal = new Uint8Array(30 + nomeBytes.length)
    const viewLocal = new DataView(cabecalhoLocal.buffer)

    viewLocal.setUint32(0, 0x04034b50, true) // Local file header signature
    viewLocal.setUint16(4, 20, true) // Versão mínima (2.0)
    viewLocal.setUint16(6, 0x0800, true) // Flags: UTF-8 ativado (bit 11)
    viewLocal.setUint16(8, 0, true) // Método de compressão: Store (0)
    viewLocal.setUint16(10, 0x4a21, true) // Hora de modificação
    viewLocal.setUint16(12, 0x5821, true) // Data de modificação
    viewLocal.setUint32(14, crc, true) // CRC-32
    viewLocal.setUint32(18, tamanho, true) // Tamanho comprimido
    viewLocal.setUint32(22, tamanho, true) // Tamanho não comprimido
    viewLocal.setUint16(26, nomeBytes.length, true) // Tamanho do nome do arquivo
    viewLocal.setUint16(28, 0, true) // Tamanho do campo extra
    cabecalhoLocal.set(nomeBytes, 30)

    entradasLocais.push(cabecalhoLocal)
    entradasLocais.push(dados)

    // Cabeçalho do diretório central (46 bytes + nome)
    const cabecalhoDir = new Uint8Array(46 + nomeBytes.length)
    const viewDir = new DataView(cabecalhoDir.buffer)

    viewDir.setUint32(0, 0x02014b50, true) // Central directory header signature
    viewDir.setUint16(4, 20, true) // Versão feita por
    viewDir.setUint16(6, 20, true) // Versão necessária
    viewDir.setUint16(8, 0x0800, true) // Flags: UTF-8
    viewDir.setUint16(10, 0, true) // Método: Store
    viewDir.setUint16(12, 0x4a21, true) // Hora
    viewDir.setUint16(14, 0x5821, true) // Data
    viewDir.setUint32(16, crc, true) // CRC-32
    viewDir.setUint32(20, tamanho, true) // Tamanho comprimido
    viewDir.setUint32(24, tamanho, true) // Tamanho não comprimido
    viewDir.setUint16(28, nomeBytes.length, true) // Tamanho do nome
    viewDir.setUint16(30, 0, true) // Campo extra
    viewDir.setUint16(32, 0, true) // Comentário
    viewDir.setUint16(34, 0, true) // Disco de início
    viewDir.setUint16(36, 0, true) // Atributos internos
    viewDir.setUint32(38, 0, true) // Atributos externos
    viewDir.setUint32(42, offset, true) // Offset relativo do cabeçalho local
    cabecalhoDir.set(nomeBytes, 46)

    entradasDiretorioCentral.push(cabecalhoDir)

    offset += cabecalhoLocal.length + tamanho
  }

  const offsetInicioDir = offset
  let tamanhoDiretorioCentral = 0
  for (const entrada of entradasDiretorioCentral) {
    tamanhoDiretorioCentral += entrada.length
  }

  // Registro de Fim do Diretório Central (22 bytes)
  const eocd = new Uint8Array(22)
  const viewEocd = new DataView(eocd.buffer)
  viewEocd.setUint32(0, 0x06054b50, true) // EOCD signature
  viewEocd.setUint16(4, 0, true) // Número deste disco
  viewEocd.setUint16(6, 0, true) // Disco onde começa o dir central
  viewEocd.setUint16(8, arquivos.length, true) // Registros neste disco
  viewEocd.setUint16(10, arquivos.length, true) // Total de registros
  viewEocd.setUint32(12, tamanhoDiretorioCentral, true) // Tamanho do dir central
  viewEocd.setUint32(16, offsetInicioDir, true) // Offset do dir central
  viewEocd.setUint16(20, 0, true) // Comentário

  const partes = [...entradasLocais, ...entradasDiretorioCentral, eocd]
  return new Blob(partes as unknown as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

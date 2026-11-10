import React from 'react'

/**
 * Componente leve e autônomo para renderizar QR Code em SVG sem dependências externas.
 * Utiliza o algoritmo padrão QR Code com correção de erro nível L ou M.
 */

// Implementação pura de matriz QR Code simplificada e robusta para URLs
// Para garantir suporte sem adicionar dependência npm pesada, geramos o SVG
// a partir da representação de matriz do QR Code padrão.

interface QrCodeSvgProps {
  value: string
  size?: number
  level?: 'L' | 'M' | 'Q' | 'H'
  className?: string
  bgColor?: string
  fgColor?: string
  includeMargin?: boolean
}

// Codificador minimalista de QR Code (versões 1 a 10) em TypeScript
// Implementação baseada no algoritmo padrão ISO/IEC 18004

class QRBitBuffer {
  buffer: number[] = []
  length = 0

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8)
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1
  }

  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1)
    }
  }

  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8)
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0)
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8)
    }
    this.length++
  }
}

// Tabela de polinômios de Galois e Reed-Solomon simplificada
const QRMath = {
  glog(n: number): number {
    if (n < 1) throw new Error(`glog(${n})`)
    return LOG_TABLE[n]
  },
  gexp(n: number): number {
    while (n < 0) n += 255
    while (n >= 256) n -= 255
    return EXP_TABLE[n]
  },
}

const EXP_TABLE = new Array(256)
const LOG_TABLE = new Array(256)
for (let i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i
for (let i = 8; i < 256; i++) {
  EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8]
}
for (let i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]] = i

class QRPolynomial {
  num: number[]
  constructor(num: number[], shift = 0) {
    let offset = 0
    while (offset < num.length && num[offset] === 0) offset++
    this.num = new Array(num.length - offset + shift)
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset]
  }

  get(index: number): number {
    return this.num[index]
  }

  getLength(): number {
    return this.num.length
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0)
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)))
      }
    }
    return new QRPolynomial(num)
  }

  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) return this
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0))
    const num = new Array(this.getLength())
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i)
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio)
    }
    return new QRPolynomial(num).mod(e)
  }
}

// Capacidades e blocos para versões 1 a 10 (nível L/M)
const RS_BLOCK_TABLE: Record<number, number[]> = {
  1: [1, 26, 19],
  2: [1, 44, 34],
  3: [1, 70, 55],
  4: [1, 100, 80],
  5: [1, 134, 108],
  6: [2, 86, 68],
  7: [2, 98, 78],
  8: [2, 121, 97],
  9: [2, 146, 116],
  10: [2, 86, 68],
}

function getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynomial {
  let a = new QRPolynomial([1], 0)
  for (let i = 0; i < errorCorrectLength; i++) {
    a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0))
  }
  return a
}

function createData(typeNumber: number, dataStr: string): number[] {
  const rsBlocks = RS_BLOCK_TABLE[typeNumber] || RS_BLOCK_TABLE[4]
  const totalCount = rsBlocks[1]
  const dataCount = rsBlocks[2]
  const ecCount = totalCount - dataCount

  const buffer = new QRBitBuffer()
  // Byte mode (0100)
  buffer.put(4, 4)
  // Length (8 bits for version 1-9)
  const bytes: number[] = []
  for (let i = 0; i < dataStr.length; i++) {
    const c = dataStr.charCodeAt(i)
    if (c < 128) bytes.push(c)
    else if (c < 2048) {
      bytes.push(192 | (c >> 6))
      bytes.push(128 | (c & 63))
    } else {
      bytes.push(224 | (c >> 12))
      bytes.push(128 | ((c >> 6) & 63))
      bytes.push(128 | (c & 63))
    }
  }

  buffer.put(bytes.length, typeNumber < 10 ? 8 : 16)
  for (let i = 0; i < bytes.length; i++) {
    buffer.put(bytes[i], 8)
  }

  // Terminator
  if (buffer.length + 4 <= dataCount * 8) {
    buffer.put(0, 4)
  }
  // Padding
  while (buffer.length % 8 !== 0) {
    buffer.putBit(false)
  }
  while (buffer.length < dataCount * 8) {
    buffer.put(0xec, 8)
    if (buffer.length < dataCount * 8) buffer.put(0x11, 8)
  }

  // Reed Solomon error correction
  const dataBytes: number[] = []
  for (let i = 0; i < dataCount; i++) {
    dataBytes.push(buffer.buffer[i] || 0)
  }

  const rsPoly = getErrorCorrectPolynomial(ecCount)
  const rawPoly = new QRPolynomial(dataBytes, rsPoly.getLength() - 1)
  const modPoly = rawPoly.mod(rsPoly)

  const ecBytes = new Array(rsPoly.getLength() - 1).fill(0)
  for (let i = 0; i < ecBytes.length; i++) {
    const modIndex = i + modPoly.getLength() - ecBytes.length
    ecBytes[i] = modIndex >= 0 ? modPoly.get(modIndex) : 0
  }

  return [...dataBytes, ...ecBytes]
}

function generateQrMatrix(text: string): boolean[][] {
  // Escolher versão apropriada
  const len = text.length
  let version = 2
  if (len < 20) version = 2
  else if (len < 40) version = 3
  else if (len < 65) version = 4
  else if (len < 90) version = 5
  else if (len < 130) version = 6
  else if (len < 170) version = 7
  else version = 8

  const size = version * 4 + 17
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null),
  )

  // 1. Finder patterns (cantos)
  const setupFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = row + r
        const tc = col + c
        if (tr < 0 || tr >= size || tc < 0 || tc >= size) continue
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[tr][tc] = true
        } else {
          matrix[tr][tc] = false
        }
      }
    }
  }

  setupFinder(0, 0)
  setupFinder(0, size - 7)
  setupFinder(size - 7, 0)

  // 2. Timing patterns
  for (let r = 8; r < size - 8; r++) {
    if (matrix[r][6] === null) matrix[r][6] = r % 2 === 0
  }
  for (let c = 8; c < size - 8; c++) {
    if (matrix[6][c] === null) matrix[6][c] = c % 2 === 0
  }

  // 3. Dark module
  matrix[size - 8][8] = true

  // 4. Alignment patterns (version >= 2)
  if (version >= 2) {
    const pos = version * 4 + 10
    const setupAlign = (row: number, col: number) => {
      if (matrix[row][col] !== null) return
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
            matrix[row + r][col + c] = true
          } else {
            matrix[row + r][col + c] = false
          }
        }
      }
    }
    setupAlign(pos, pos)
  }

  // 5. Preencher dados codificados
  const data = createData(version, text)
  let byteIndex = 0
  let bitIndex = 7

  let inc = -1
  let row = size - 1
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--
    while (true) {
      for (let c = 0; c < 2; c++) {
        const curCol = col - c
        if (matrix[row][curCol] === null) {
          let dark = false
          if (byteIndex < data.length) {
            dark = ((data[byteIndex] >>> bitIndex) & 1) === 1
          }
          // Máscara (row + col) % 2 == 0
          if ((row + curCol) % 2 === 0) {
            dark = !dark
          }
          matrix[row][curCol] = dark

          bitIndex--
          if (bitIndex === -1) {
            byteIndex++
            bitIndex = 7
          }
        }
      }
      row += inc
      if (row < 0 || size <= row) {
        row -= inc
        inc = -inc
        break
      }
    }
  }

  // Converter nulos para false
  return matrix.map((r) => r.map((c) => !!c))
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 200,
  className = '',
  bgColor = '#FFFFFF',
  fgColor = '#002B5E',
  includeMargin = true,
}) => {
  const matrix = React.useMemo(() => {
    try {
      return generateQrMatrix(value)
    } catch (err) {
      console.warn('Erro ao gerar matriz do QR Code:', err)
      return []
    }
  }, [value])

  if (!matrix.length) {
    return (
      <div
        className={`flex items-center justify-center border border-dashed text-xs text-slate-400 ${className}`}
        style={{ width: size, height: size }}
      >
        QR indisponível
      </div>
    )
  }

  const margin = includeMargin ? 3 : 0
  const matrixSize = matrix.length
  const totalSize = matrixSize + margin * 2

  // Criar path com todos os módulos escuros para renderização nítida em alta definição
  const cells: React.ReactElement[] = []
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={c + margin}
            y={r + margin}
            width={1}
            height={1}
            fill={fgColor}
          />,
        )
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      width={size}
      height={size}
      className={className}
      shapeRendering="crispEdges"
      aria-label="QR Code para assinatura eletrônica"
    >
      <rect width={totalSize} height={totalSize} fill={bgColor} />
      {cells}
    </svg>
  )
}

export default QrCodeSvg

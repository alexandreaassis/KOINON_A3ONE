import { criarZip, escapeXml } from './zipWriter'

export interface BlocoRoteiroCena {
  id: string
  letra: string // a, b, c, d, e, f, g, h, i, j, k
  titulo: string
  focoAnimacaoSeta: string
  duracaoEstimadaSegundos: number
  duracaoEstimadaTexto: string
  textoLocucaoOriginal: string
  /**
   * Partes do texto para renderização no docx e na tela com marcações:
   * tipo: 'normal' | 'enfase' | 'pausa' | 'direcao'
   */
  partesLocucao: {
    tipo: 'normal' | 'enfase' | 'pausa' | 'direcao'
    texto: string
  }[]
  dicasLocutor: string
}

export function converterTextoEmPartesLocucao(
  texto: string,
): { tipo: 'normal' | 'enfase' | 'pausa' | 'direcao'; texto: string }[] {
  // Regex para capturar [pausa], [pausa curta], [pausa longa], **ênfase**, (direção)
  const partes: { tipo: 'normal' | 'enfase' | 'pausa' | 'direcao'; texto: string }[] = []
  const regex = /(\[pausa[^\]]*\]|\*\*[^*]+\*\*|\([A-ZÇÃÉÊÍÓÔÚa-zçãéêíóôú\s,.:!-]+\))/g

  let ultimoIndice = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(texto)) !== null) {
    if (match.index > ultimoIndice) {
      partes.push({
        tipo: 'normal',
        texto: texto.slice(ultimoIndice, match.index),
      })
    }

    const token = match[0]
    if (token.startsWith('[pausa') && token.endsWith(']')) {
      partes.push({ tipo: 'pausa', texto: token })
    } else if (token.startsWith('**') && token.endsWith('**')) {
      partes.push({ tipo: 'enfase', texto: token.slice(2, -2) })
    } else if (token.startsWith('(') && token.endsWith(')')) {
      partes.push({ tipo: 'direcao', texto: token })
    } else {
      partes.push({ tipo: 'normal', texto: token })
    }

    ultimoIndice = regex.lastIndex
  }

  if (ultimoIndice < texto.length) {
    partes.push({
      tipo: 'normal',
      texto: texto.slice(ultimoIndice),
    })
  }

  return partes
}

export function gerarDocxRoteiro(cenas: BlocoRoteiroCena[], nomeCondominio: string): Blob {
  const encoder = new TextEncoder()

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`

  // 3. word/_rels/document.xml.rels
  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`

  // 4. docProps/core.xml
  const dataIso = new Date().toISOString()
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Roteiro de Locução - Vídeo Institucional de Cadastro de Moradores</dc:title>
  <dc:subject>Roteiro com marcações de ênfase e pausa para locução humana</dc:subject>
  <dc:creator>Koinon - uma solução A3ONE</dc:creator>
  <cp:keywords>Koinon, A3ONE, Roteiro, Vídeo, Cadastro Morador, Assembleia</cp:keywords>
  <dc:description>Roteiro oficial de gravação do fluxo de cadastro pelo link da unidade.</dc:description>
  <cp:lastModifiedBy>Koinon Plataforma Virtual</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${dataIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${dataIso}</dcterms:modified>
</cp:coreProperties>`

  // 5. docProps/app.xml
  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Koinon / A3ONE Soluções Integradas</Application>
  <DocSecurity>0</DocSecurity>
  <Company>A3ONE Soluções Integradas</Company>
</Properties>`

  // 6. word/settings.xml
  const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:characterSpacingControl w:val="doNotCompress"/>
</w:settings>`

  // 7. word/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Poppins" w:hAnsi="Poppins" w:cs="Poppins" w:eastAsia="Poppins"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="002B5E"/>
        <w:lang w:val="pt-BR"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="140" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`

  // 8. Construção dos parágrafos de word/document.xml
  let bodyXml = ''

  // Cabeçalho / Título do Documento
  bodyXml += `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="60"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="0066FF"/>
          <w:sz w:val="18"/>
        </w:rPr>
        <w:t>KOINON • UMA SOLUÇÃO A3ONE</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="002B5E"/>
          <w:sz w:val="34"/>
        </w:rPr>
        <w:t>ROTEIRO DE LOCUÇÃO HUMANA</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="160"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:color w:val="5A6B82"/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t>Vídeo Institucional: Cadastro de Moradores pelo Link da Unidade</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="260"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="002B5E"/>
          <w:sz w:val="20"/>
        </w:rPr>
        <w:t>${escapeXml(nomeCondominio)}</w:t>
      </w:r>
    </w:p>
  `

  // Box de Guia do Locutor
  bodyXml += `
    <w:p>
      <w:pPr>
        <w:pBdr>
          <w:top w:val="single" w:sz="12" w:space="8" w:color="0066FF"/>
          <w:left w:val="single" w:sz="24" w:space="12" w:color="0066FF"/>
          <w:bottom w:val="single" w:sz="12" w:space="8" w:color="0066FF"/>
          <w:right w:val="single" w:sz="12" w:space="8" w:color="0066FF"/>
        </w:pBdr>
        <w:shd w:val="clear" w:color="auto" w:fill="F3F7FC"/>
        <w:spacing w:before="120" w:after="180"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="002B5E"/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t>INSTRUÇÕES PARA A GRAVAÇÃO:</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="20"/><w:color w:val="5A6B82"/></w:rPr>
        <w:t xml:space="preserve">&#10;1. Este roteiro foi formatado para locução natural humana. As frases são curtas e pontuadas para respiração confortável.</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="20"/><w:color w:val="5A6B82"/></w:rPr>
        <w:t xml:space="preserve">&#10;2. Palavras em </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="0066FF"/></w:rPr>
        <w:t>NEGRITO AZUL</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="20"/><w:color w:val="5A6B82"/></w:rPr>
        <w:t xml:space="preserve"> indicam </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="002B5E"/></w:rPr>
        <w:t>ÊNFASE VOCAL</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="20"/><w:color w:val="5A6B82"/></w:rPr>
        <w:t> (aumente levemente a intenção e a clareza da pronúncia).</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="20"/><w:color w:val="5A6B82"/></w:rPr>
        <w:t xml:space="preserve">&#10;3. A marcação </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="E65100"/></w:rPr>
        <w:t>[pausa]</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="20"/><w:color w:val="5A6B82"/></w:rPr>
        <w:t xml:space="preserve"> indica pausa de 1 segundo para deixar a animação da tela respirar antes da próxima fala.</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="20"/><w:color w:val="5A6B82"/></w:rPr>
        <w:t xml:space="preserve">&#10;4. A indicação de </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="002B5E"/></w:rPr>
        <w:t>Foco da Animação / Seta</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="20"/><w:color w:val="5A6B82"/></w:rPr>
        <w:t> mostra para qual elemento a seta visual da tela estará apontando em sincronia com você.</w:t>
      </w:r>
    </w:p>
  `

  // Duração total estimada
  const duracaoTotalSegundos = cenas.reduce((acc, c) => acc + c.duracaoEstimadaSegundos, 0)
  const minTotal = Math.floor(duracaoTotalSegundos / 60)
  const segTotal = duracaoTotalSegundos % 60
  const duracaoTotalTexto = `${minTotal} min e ${segTotal.toString().padStart(2, '0')} s`

  bodyXml += `
    <w:p>
      <w:pPr>
        <w:spacing w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="002B5E"/><w:sz w:val="22"/></w:rPr>
        <w:t xml:space="preserve">TEMPO TOTAL ESTIMADO DE VÍDEO: </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:b/><w:color w:val="0066FF"/><w:sz w:val="22"/></w:rPr>
        <w:t>${duracaoTotalTexto} (${cenas.length} cenas)</w:t>
      </w:r>
    </w:p>
  `

  // Iterar pelas cenas
  cenas.forEach((cena, index) => {
    // Título da Cena
    bodyXml += `
      <w:p>
        <w:pPr>
          <w:pBdr>
            <w:bottom w:val="single" w:sz="8" w:space="4" w:color="8EC0FF"/>
          </w:pBdr>
          <w:spacing w:before="300" w:after="100"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:color w:val="0066FF"/>
            <w:sz w:val="26"/>
          </w:rPr>
          <w:t xml:space="preserve">CENA ${index + 1} (${cena.letra.toUpperCase()}) — </w:t>
        </w:r>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:color w:val="002B5E"/>
            <w:sz w:val="26"/>
          </w:rPr>
          <w:t>${escapeXml(cena.titulo)}</w:t>
        </w:r>
      </w:p>
    `

    // Metadados da Cena (Duração + Foco da Seta)
    bodyXml += `
      <w:p>
        <w:pPr>
          <w:spacing w:after="100"/>
        </w:pPr>
        <w:r>
          <w:rPr><w:b/><w:color w:val="002B5E"/><w:sz w:val="20"/></w:rPr>
          <w:t xml:space="preserve">⏱ Duração estimada: </w:t>
        </w:r>
        <w:r>
          <w:rPr><w:color w:val="0066FF"/><w:b/><w:sz w:val="20"/></w:rPr>
          <w:t xml:space="preserve">${escapeXml(cena.duracaoEstimadaTexto)}   |   </w:t>
        </w:r>
        <w:r>
          <w:rPr><w:b/><w:color w:val="002B5E"/><w:sz w:val="20"/></w:rPr>
          <w:t xml:space="preserve">🎯 Foco da Seta / Animação: </w:t>
        </w:r>
        <w:r>
          <w:rPr><w:color w:val="5A6B82"/><w:sz w:val="20"/></w:rPr>
          <w:t>${escapeXml(cena.focoAnimacaoSeta)}</w:t>
        </w:r>
      </w:p>
    `

    // Texto do Locutor com partes formatadas
    bodyXml += `
      <w:p>
        <w:pPr>
          <w:pBdr>
            <w:left w:val="single" w:sz="18" w:space="10" w:color="002B5E"/>
          </w:pBdr>
          <w:shd w:val="clear" w:color="auto" w:fill="F3F7FC"/>
          <w:spacing w:before="60" w:after="120"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:color w:val="002B5E"/>
            <w:sz w:val="18"/>
          </w:rPr>
          <w:t xml:space="preserve">FALA DO LOCUTOR:&#10;</w:t>
        </w:r>
    `

    // Renderizar partes da fala
    for (const parte of cena.partesLocucao) {
      if (parte.tipo === 'enfase') {
        bodyXml += `
          <w:r>
            <w:rPr>
              <w:b/>
              <w:color w:val="0066FF"/>
              <w:sz w:val="22"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXml(parte.texto)}</w:t>
          </w:r>
        `
      } else if (parte.tipo === 'pausa') {
        bodyXml += `
          <w:r>
            <w:rPr>
              <w:b/>
              <w:color w:val="E65100"/>
              <w:highlight w:val="yellow"/>
              <w:sz w:val="20"/>
            </w:rPr>
            <w:t xml:space="preserve"> ${escapeXml(parte.texto)} </w:t>
          </w:r>
        `
      } else if (parte.tipo === 'direcao') {
        bodyXml += `
          <w:r>
            <w:rPr>
              <w:i/>
              <w:color w:val="5A6B82"/>
              <w:sz w:val="20"/>
            </w:rPr>
            <w:t xml:space="preserve"> ${escapeXml(parte.texto)} </w:t>
          </w:r>
        `
      } else {
        bodyXml += `
          <w:r>
            <w:rPr>
              <w:color w:val="002B5E"/>
              <w:sz w:val="22"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXml(parte.texto)}</w:t>
          </w:r>
        `
      }
    }

    bodyXml += `
      </w:p>
    `

    // Dicas de Interpretação / Tom da Cena
    if (cena.dicasLocutor) {
      bodyXml += `
        <w:p>
          <w:pPr>
            <w:spacing w:after="160"/>
          </w:pPr>
          <w:r>
            <w:rPr><w:b/><w:color w:val="5A6B82"/><w:sz w:val="18"/></w:rPr>
            <w:t xml:space="preserve">💡 Tom / Orientação: </w:t>
          </w:r>
          <w:r>
            <w:rPr><w:i/><w:color w:val="5A6B82"/><w:sz w:val="18"/></w:rPr>
            <w:t>${escapeXml(cena.dicasLocutor)}</w:t>
          </w:r>
        </w:p>
      `
    }
  })

  // Encerramento institucional do documento
  bodyXml += `
    <w:p>
      <w:pPr>
        <w:pBdr>
          <w:top w:val="single" w:sz="12" w:space="8" w:color="002B5E"/>
        </w:pBdr>
        <w:jc w:val="center"/>
        <w:spacing w:before="300" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="002B5E"/>
          <w:sz w:val="20"/>
        </w:rPr>
        <w:t>Koinon — Plataforma de Assembleias Virtuais e Votações</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:color w:val="0066FF"/>
          <w:sz w:val="18"/>
        </w:rPr>
        <w:t>uma solução A3ONE Soluções Integradas</w:t>
      </w:r>
    </w:p>
  `

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`

  const arquivos = [
    { nome: '[Content_Types].xml', dados: encoder.encode(contentTypesXml) },
    { nome: '_rels/.rels', dados: encoder.encode(relsXml) },
    { nome: 'docProps/core.xml', dados: encoder.encode(coreXml) },
    { nome: 'docProps/app.xml', dados: encoder.encode(appXml) },
    { nome: 'word/_rels/document.xml.rels', dados: encoder.encode(docRelsXml) },
    { nome: 'word/settings.xml', dados: encoder.encode(settingsXml) },
    { nome: 'word/styles.xml', dados: encoder.encode(stylesXml) },
    { nome: 'word/document.xml', dados: encoder.encode(documentXml) },
  ]

  return criarZip(arquivos)
}

/**
 * Dispara o download de um arquivo no navegador
 */
export function baixarBlobComoArquivo(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

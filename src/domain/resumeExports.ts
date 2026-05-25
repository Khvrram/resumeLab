import type {
  ResumePreviewBlock,
  ResumePreviewDocument,
  ResumePreviewSection,
} from "./khurramsResumeTemplate";

type PdfFont = "F1" | "F2";

type PdfLine = {
  align?: "left" | "center" | "right";
  font: PdfFont;
  size: number;
  text: string;
  x: number;
  y: number;
};

type PdfRule = {
  x1: number;
  x2: number;
  y: number;
};

type PdfPageDrawing = {
  lines: PdfLine[];
  rules: PdfRule[];
};

type PdfLayoutState = {
  current: PdfPageDrawing;
  document: ResumePreviewDocument;
  drawings: PdfPageDrawing[];
  y: number;
};

const letterWidth = 612;
const letterHeight = 792;
const pdfMarginX = 54;
const pdfTopY = 736;
const pdfBottomY = 52;

export function createResumePdfBytes(
  document: ResumePreviewDocument,
  pageSections: ResumePreviewSection[][],
): Uint8Array {
  const drawings = layoutPdf(document, pageSections);
  const objects: string[] = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  const pageIds: number[] = [];
  let nextObjectId = 5;

  drawings.forEach((drawing) => {
    const content = renderPdfContent(drawing);
    const contentObjectId = nextObjectId;
    const pageObjectId = nextObjectId + 1;

    objects[contentObjectId] = `<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`;
    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${letterWidth} ${letterHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    pageIds.push(pageObjectId);
    nextObjectId += 2;
  });

  objects[2] =
    `<< /Type /Pages /Count ${pageIds.length} /Kids [` +
    `${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  return assemblePdf(objects);
}

export function createResumeDocxBytes(
  document: ResumePreviewDocument,
  pageSections: ResumePreviewSection[][],
): Uint8Array {
  return createStoredZip({
    "[Content_Types].xml": textBytes(contentTypesXml),
    "_rels/.rels": textBytes(packageRelationshipsXml),
    "word/document.xml": textBytes(renderDocumentXml(document, pageSections)),
    "word/styles.xml": textBytes(stylesXml),
  });
}

function layoutPdf(
  document: ResumePreviewDocument,
  pageSections: ResumePreviewSection[][],
): PdfPageDrawing[] {
  const sectionsByPage =
    pageSections.length > 0 ? pageSections : [document.sections];
  const state: PdfLayoutState = {
    current: createPdfPage(),
    document,
    drawings: [],
    y: pdfTopY,
  };

  sectionsByPage.forEach((sections, pageIndex) => {
    if (pageIndex > 0 || state.drawings.length === 0) {
      if (state.current.lines.length > 0 || state.current.rules.length > 0) {
        finishPdfPage(state);
      }
    }

    state.y = addPdfHeader(state.current, document, pdfTopY);

    sections.forEach((section) => {
      ensurePdfSpace(state, 38);
      state.current.lines.push({
        font: "F2",
        size: 9,
        text: section.title.toUpperCase(),
        x: pdfMarginX,
        y: state.y,
      });
      state.current.rules.push({
        x1: pdfMarginX,
        x2: letterWidth - pdfMarginX,
        y: state.y - 5,
      });
      state.y -= 18;

      section.blocks.forEach((block) => {
        addPdfBlock(state, block, section.title);
      });

      state.y -= 6;
    });
  });

  if (state.current.lines.length > 0 || state.current.rules.length > 0) {
    finishPdfPage(state);
  }

  return state.drawings.length > 0 ? state.drawings : [createPdfPage()];
}

function createPdfPage(): PdfPageDrawing {
  return {
    lines: [],
    rules: [],
  };
}

function finishPdfPage(state: PdfLayoutState) {
  state.drawings.push(state.current);
  state.current = createPdfPage();
  state.y = pdfTopY;
}

function startOverflowPdfPage(state: PdfLayoutState) {
  finishPdfPage(state);
  state.y = addPdfHeader(state.current, state.document, pdfTopY);
}

function addPdfHeader(
  drawing: PdfPageDrawing,
  document: ResumePreviewDocument,
  y: number,
) {
  drawing.lines.push({
    align: "center",
    font: "F2",
    size: 15,
    text: document.name.toUpperCase() || "RESUME",
    x: letterWidth / 2,
    y,
  });
  y -= 15;

  if (document.subtitle) {
    drawing.lines.push({
      align: "center",
      font: "F1",
      size: 8,
      text: document.subtitle,
      x: letterWidth / 2,
      y,
    });
    y -= 12;
  }

  if (document.contact) {
    drawing.lines.push({
      align: "center",
      font: "F1",
      size: 7,
      text: document.contact,
      x: letterWidth / 2,
      y,
    });
    y -= 10;
  }

  drawing.rules.push({ x1: pdfMarginX, x2: letterWidth - pdfMarginX, y: y - 2 });
  return y - 18;
}

function addPdfBlock(
  state: PdfLayoutState,
  block: ResumePreviewBlock,
  sectionTitle: string,
) {
  const isStandaloneLine =
    !block.meta && block.bullets.length === 0 && /summary|skills/i.test(sectionTitle);

  if (block.heading) {
    if (isStandaloneLine) {
      addWrappedPdfText(state, block.heading, pdfMarginX, {
        maxWidth: letterWidth - pdfMarginX * 2,
        size: 8,
      });
    } else {
      ensurePdfSpace(state, 18);
      state.current.lines.push({
        font: "F2",
        size: 8,
        text: block.heading,
        x: pdfMarginX,
        y: state.y,
      });

      if (block.meta) {
        state.current.lines.push({
          align: "right",
          font: "F2",
          size: 7,
          text: block.meta,
          x: letterWidth - pdfMarginX,
          y: state.y,
        });
      }

      state.y -= 11;
    }
  }

  block.bullets.forEach((bullet) => {
    addWrappedPdfText(state, `- ${bullet}`, pdfMarginX + 12, {
      maxWidth: letterWidth - pdfMarginX * 2 - 12,
      size: 7.6,
    });
  });

  state.y -= 5;
}

function addWrappedPdfText(
  state: PdfLayoutState,
  text: string,
  x: number,
  options: {
    maxWidth: number;
    size: number;
  },
) {
  const lines = wrapPdfText(text, options.maxWidth, options.size);

  lines.forEach((line) => {
    ensurePdfSpace(state, 14);
    state.current.lines.push({
      font: "F1",
      size: options.size,
      text: line,
      x,
      y: state.y,
    });
    state.y -= options.size + 3;
  });
}

function ensurePdfSpace(state: PdfLayoutState, neededHeight: number) {
  if (state.y - neededHeight >= pdfBottomY) {
    return;
  }

  startOverflowPdfPage(state);
}

function wrapPdfText(text: string, maxWidth: number, size: number) {
  const maxChars = Math.max(12, Math.floor(maxWidth / (size * 0.47)));
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;

    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
      return;
    }

    line = candidate;
  });

  if (line) {
    lines.push(line);
  }

  return lines;
}

function renderPdfContent(drawing: PdfPageDrawing) {
  return [
    "0.35 w",
    ...drawing.rules.map((rule) => `${rule.x1} ${rule.y} m ${rule.x2} ${rule.y} l S`),
    ...drawing.lines.map((line) => {
      const x = alignPdfX(line);
      return `BT /${line.font} ${line.size} Tf 1 0 0 1 ${roundPdf(x)} ${roundPdf(
        line.y,
      )} Tm (${escapePdfString(line.text)}) Tj ET`;
    }),
  ].join("\n");
}

function alignPdfX(line: PdfLine) {
  const width = approximatePdfTextWidth(line.text, line.size);

  if (line.align === "center") {
    return line.x - width / 2;
  }

  if (line.align === "right") {
    return line.x - width;
  }

  return line.x;
}

function approximatePdfTextWidth(text: string, size: number) {
  return text.length * size * 0.48;
}

function assemblePdf(objects: string[]) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n% ResumeLab\n")];
  const offsets = [0];
  let offset = chunks[0].byteLength;

  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    offsets[objectId] = offset;
    const chunk = encoder.encode(`${objectId} 0 obj\n${objects[objectId]}\nendobj\n`);
    chunks.push(chunk);
    offset += chunk.byteLength;
  }

  const xrefOffset = offset;
  const xref = [
    "xref",
    `0 ${objects.length}`,
    "0000000000 65535 f ",
    ...offsets
      .slice(1)
      .map((value) => `${String(value).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");

  chunks.push(encoder.encode(xref));
  return concatBytes(chunks);
}

function renderDocumentXml(
  document: ResumePreviewDocument,
  pageSections: ResumePreviewSection[][],
) {
  const sections = flattenSections(pageSections.length > 0 ? pageSections : [document.sections]);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphXml(document.name.toUpperCase() || "Resume", {
      align: "center",
      bold: true,
      size: 32,
    })}
    ${document.subtitle ? paragraphXml(document.subtitle, { align: "center", size: 18 }) : ""}
    ${document.contact ? paragraphXml(document.contact, { align: "center", size: 16 }) : ""}
    ${sections.map(sectionXml).join("\n")}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function sectionXml(section: ResumePreviewSection) {
  return [
    paragraphXml(section.title.toUpperCase(), {
      bold: true,
      border: true,
      size: 20,
    }),
    ...section.blocks.flatMap((block) => blockXml(block, section.title)),
  ].join("\n");
}

function blockXml(block: ResumePreviewBlock, sectionTitle: string) {
  const isStandaloneLine =
    !block.meta && block.bullets.length === 0 && /summary|skills/i.test(sectionTitle);
  const paragraphs: string[] = [];

  if (block.heading) {
    paragraphs.push(
      paragraphXml(isStandaloneLine ? block.heading : joinDocxHeading(block), {
        bold: !isStandaloneLine,
        size: 18,
      }),
    );
  }

  block.bullets.forEach((bullet) => {
    paragraphs.push(paragraphXml(`- ${bullet}`, { indent: 360, size: 17 }));
  });

  return paragraphs;
}

function paragraphXml(
  text: string,
  options: {
    align?: "center";
    bold?: boolean;
    border?: boolean;
    indent?: number;
    size?: number;
  } = {},
) {
  const pPr = [
    options.align ? `<w:jc w:val="${options.align}"/>` : "",
    options.indent ? `<w:ind w:left="${options.indent}"/>` : "",
    options.border
      ? '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="000000"/></w:pBdr>'
      : "",
  ]
    .filter(Boolean)
    .join("");
  const rPr = [
    options.bold ? "<w:b/>" : "",
    options.size ? `<w:sz w:val="${options.size}"/>` : "",
  ]
    .filter(Boolean)
    .join("");

  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}<w:r>${
    rPr ? `<w:rPr>${rPr}</w:rPr>` : ""
  }<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function joinDocxHeading(block: ResumePreviewBlock) {
  return [block.heading, block.meta].filter(Boolean).join(" | ");
}

function flattenSections(pageSections: ResumePreviewSection[][]) {
  return pageSections.flatMap((sections) => sections);
}

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const packageRelationshipsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
  </w:style>
</w:styles>`;

function createStoredZip(files: Record<string, Uint8Array>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  Object.entries(files).forEach(([name, data]) => {
    const nameBytes = textBytes(name);
    const crc = crc32(data);
    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);

    writeZipCommonHeader(localView, 0x04034b50, crc, data, nameBytes);
    localParts.push(localHeader, nameBytes, data);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    writeZipCommonHeader(centralView, 0x02014b50, crc, data, nameBytes);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint32(42, localOffset, true);
    centralParts.push(centralHeader, nameBytes);

    localOffset += localHeader.byteLength + nameBytes.byteLength + data.byteLength;
  });

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  const fileCount = Object.keys(files).length;

  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, fileCount, true);
  endView.setUint16(10, fileCount, true);
  endView.setUint32(12, centralDirectory.byteLength, true);
  endView.setUint32(16, localOffset, true);

  return concatBytes([...localParts, centralDirectory, end]);
}

function writeZipCommonHeader(
  view: DataView,
  signature: number,
  crc: number,
  data: Uint8Array,
  nameBytes: Uint8Array,
) {
  view.setUint32(0, signature, true);
  view.setUint16(signature === 0x04034b50 ? 4 : 6, 20, true);
  view.setUint16(signature === 0x04034b50 ? 6 : 8, 0, true);
  view.setUint16(signature === 0x04034b50 ? 8 : 10, 0, true);
  view.setUint16(signature === 0x04034b50 ? 10 : 12, 0, true);
  view.setUint16(signature === 0x04034b50 ? 12 : 14, 0, true);
  view.setUint32(signature === 0x04034b50 ? 14 : 16, crc, true);
  view.setUint32(signature === 0x04034b50 ? 18 : 20, data.byteLength, true);
  view.setUint32(signature === 0x04034b50 ? 22 : 24, data.byteLength, true);
  view.setUint16(signature === 0x04034b50 ? 26 : 28, nameBytes.byteLength, true);
}

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  bytes.forEach((byte) => {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });

  return (crc ^ 0xffffffff) >>> 0;
}

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }

  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  crcTable = table;
  return table;
}

function concatBytes(parts: Uint8Array[]) {
  const totalLength = parts.reduce((total, part) => total + part.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.byteLength;
  });

  return output;
}

function textBytes(value: string) {
  return new TextEncoder().encode(value);
}

function byteLength(value: string) {
  return textBytes(value).byteLength;
}

function escapePdfString(value: string) {
  return value
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function roundPdf(value: number) {
  return Number(value.toFixed(2));
}

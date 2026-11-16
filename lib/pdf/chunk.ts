export type PageText = { page: number; text: string; ocr: boolean };
export type Chunk = { index: number; pageStart: number; pageEnd: number; content: string; usedOcr: boolean };

/**
 * Group pages into chunks of about maxChars, never mixing partial pages unless a single
 * page is bigger than maxChars. Every page is prefixed with [[Page N]] so the AI can cite it.
 */
export function chunkPages(pages: PageText[], maxChars: number): Chunk[] {
  const chunks: Chunk[] = [];
  let buf = "";
  let start = 0;
  let end = 0;
  let ocr = false;

  const flush = () => {
    if (!buf) return;
    chunks.push({ index: chunks.length, pageStart: start, pageEnd: end, content: buf.trim(), usedOcr: ocr });
    buf = "";
    ocr = false;
  };

  for (const p of pages) {
    if (!p.text) continue;
    const block = `[[Page ${p.page}]]\n${p.text}\n\n`;

    if (block.length > maxChars) {
      flush();
      for (const piece of splitLong(p.text, maxChars - 20)) {
        chunks.push({
          index: chunks.length,
          pageStart: p.page,
          pageEnd: p.page,
          content: `[[Page ${p.page}]]\n${piece}`,
          usedOcr: p.ocr,
        });
      }
      continue;
    }

    if (buf && buf.length + block.length > maxChars) flush();
    if (!buf) start = p.page;
    buf += block;
    end = p.page;
    ocr = ocr || p.ocr;
  }
  flush();
  return chunks;
}

function splitLong(text: string, max: number): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(" ", max);
    if (cut < max * 0.5) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** Normalise extracted text. Also strips NUL bytes, which Postgres rejects. */
export function cleanText(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/(\w)-\n(\w)/g, "$1$2") // re-join words hyphenated across lines
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

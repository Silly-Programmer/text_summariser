export const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

export const STATUS_LABEL: Record<string, string> = {
  uploaded: "Queued",
  extracting: "Reading text",
  ocr: "Running OCR",
  chunking: "Preparing",
  ready: "Ready",
  failed: "Failed",
  pending: "Queued",
  generating: "Writing",
  done: "Ready",
};

export const IN_PROGRESS = ["uploaded", "extracting", "ocr", "chunking", "pending", "generating"];

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const percent = (score: number, total: number) => (total > 0 ? Math.round((score / total) * 100) : 0);

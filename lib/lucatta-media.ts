export const RECEIPT_MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export function normalizeMimeType(value?: string) {
  return String(value || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
}

export function receiptExtension(value?: string) {
  return RECEIPT_MIME_EXTENSIONS[normalizeMimeType(value)];
}

export function isReceiptMimeType(value?: string) {
  return Boolean(receiptExtension(value));
}

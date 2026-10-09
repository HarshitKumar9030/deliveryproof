import { createHash, randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { UTApi } from 'uploadthing/server';
import { MAX_ARTIFACT_BYTES, MAX_REVIEW_BYTES, type Artifact, type ArtifactContent } from '../../domain/artifacts.ts';

export class ArtifactError extends Error {}

function storageKey() {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) throw new Error('File encryption key is not configured');
  return Buffer.from(key, 'hex');
}
export function encryptArtifact(artifact: Artifact, bytes: Uint8Array) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', storageKey(), iv);
  cipher.setAAD(Buffer.from(`${artifact.id}:${artifact.sha256}`));
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([Buffer.from('DPF1'), iv, cipher.getAuthTag(), encrypted]);
}
export function decryptArtifact(artifact: Artifact, bytes: Uint8Array) {
  const data = Buffer.from(bytes);
  if (data.length < 32 || data.subarray(0, 4).toString() !== 'DPF1') throw new Error('Invalid encrypted file');
  const decipher = createDecipheriv('aes-256-gcm', storageKey(), data.subarray(4, 16));
  decipher.setAAD(Buffer.from(`${artifact.id}:${artifact.sha256}`));
  decipher.setAuthTag(data.subarray(16, 32));
  return Buffer.concat([decipher.update(data.subarray(32)), decipher.final()]);
}

/** Bound streamed bodies too: Content-Length is optional and untrusted. */
export async function boundedBytes(body: ReadableStream<Uint8Array> | null, limit: number) {
  if (!body) throw new ArtifactError('No file content received.');
  const reader = body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new ArtifactError('File exceeds the upload limit.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, total);
}

export async function inspectArtifact(name: string, bytes: Uint8Array): Promise<Artifact> {
  if (!bytes.length || bytes.length > MAX_ARTIFACT_BYTES) throw new ArtifactError('Choose a nonempty file under 4 MB.');
  const content = Buffer.from(bytes); let mimeType: string; let pages: number | undefined; let lines: number | undefined;
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf' && content.subarray(0, 5).toString() === '%PDF-') {
    try { pages = (await PDFDocument.load(content, { updateMetadata: false })).getPageCount(); }
    catch { throw new ArtifactError('Use a readable, unencrypted PDF.'); }
    if (!pages || pages > 25) throw new ArtifactError('PDFs may contain up to 25 pages.');
    mimeType = 'application/pdf';
  } else if (extension === 'png' && content.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) mimeType = 'image/png';
  else if (['jpg', 'jpeg'].includes(extension || '') && content[0] === 255 && content[1] === 216 && content[2] === 255) mimeType = 'image/jpeg';
  else if (extension === 'webp' && content.subarray(0, 4).toString() === 'RIFF' && content.subarray(8, 12).toString() === 'WEBP') mimeType = 'image/webp';
  else if (['txt','md','csv','json','svg'].includes(extension || '')) {
    if (content.length > 256 * 1024) throw new ArtifactError('Text files must be under 256 KB.');
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(content); }
    catch { throw new ArtifactError('Text files must use UTF-8.'); }
    if (text.includes('\0')) throw new ArtifactError('Binary content is not a text document.');
    lines = text.split(/\r?\n/).length; mimeType = 'text/plain';
  } else throw new ArtifactError('Supported: PDF, PNG, JPEG, WebP, TXT, Markdown, CSV, JSON and SVG source.');
  return { id: randomUUID(), name: name.replace(/[\x00-\x1f/\\]/g, '_').slice(0, 180) || 'file', mimeType, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex'), ...(pages ? { pages } : {}), ...(lines ? { lines } : {}), uploadedAt: new Date().toISOString() };
}

export async function storeArtifact(artifact: Artifact, bytes: Uint8Array) {
  // The free storage plan supports public objects: only authenticated ciphertext leaves this server.
  const encrypted = encryptArtifact(artifact, bytes);
  const result = await new UTApi({ logLevel: 'None' }).uploadFiles(new File([Uint8Array.from(encrypted)], `${artifact.id}.bin`, { type: 'application/octet-stream' }), { contentDisposition: 'attachment' });
  if (result.error || !result.data) throw new Error('Encrypted upload failed');
  return result.data.key;
}

export async function readArtifact(artifact: Artifact, key: string): Promise<ArtifactContent> {
  const { ufsUrl } = await new UTApi().generateSignedURL(key, { expiresIn: 60 });
  const response = await fetch(ufsUrl, { signal: AbortSignal.timeout(20000), cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw new Error('Original file unavailable');
  const encrypted = await boundedBytes(response.body, Math.min(artifact.bytes, MAX_ARTIFACT_BYTES) + 32);
  const content = decryptArtifact(artifact, encrypted);
  if (content.length !== artifact.bytes || createHash('sha256').update(content).digest('hex') !== artifact.sha256) throw new Error('Original file integrity check failed');
  return { ...artifact, content };
}

export function assertReviewBudget(files: Artifact[]) {
  if (files.reduce((sum, file) => sum + file.bytes, 0) > MAX_REVIEW_BYTES) throw new ArtifactError('Review files may total up to 12 MB.');
}

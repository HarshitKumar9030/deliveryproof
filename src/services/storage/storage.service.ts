import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ScopeSchema } from '../../domain/evidence.js';
import type { EvidenceScope } from '../../domain/evidence.js';

/** Local development adapter. Never expose the root folder through static serving. */
export class LocalEvidenceStorage {
  constructor(private readonly root: string) {}
  private location(scope: EvidenceScope, hash: string) {
    const valid = ScopeSchema.parse(scope);
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid content hash');
    return resolve(this.root, valid.ownerId, valid.projectId, hash);
  }
  async put(scope: EvidenceScope, content: Uint8Array) {
    if (!content.byteLength || content.byteLength > 20 * 1024 * 1024) throw new Error('File must be 1 byte to 20 MB');
    const hash = createHash('sha256').update(content).digest('hex');
    const path = this.location(scope, hash);
    const valid = ScopeSchema.parse(scope);
    await mkdir(resolve(this.root, valid.ownerId, valid.projectId), { recursive: true });
    try { await writeFile(path, content, { flag: 'wx' }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    return { hash, bytes: content.byteLength };
  }
  async get(scope: EvidenceScope, hash: string) {
    const content = await readFile(this.location(scope, hash));
    if (createHash('sha256').update(content).digest('hex') !== hash) throw new Error('Evidence integrity check failed');
    return content;
  }
}

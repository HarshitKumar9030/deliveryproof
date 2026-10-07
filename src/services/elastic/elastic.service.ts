import { Client } from '@elastic/elasticsearch';
import { EvidenceSchema, ScopeSchema } from '../../domain/evidence.ts';
import type { EvidenceRecord, EvidenceScope } from '../../domain/evidence.ts';

export class ElasticEvidenceService {
  constructor(private readonly client: Client, private readonly index: string) {}

  async ensureIndex() {
    if (await this.client.indices.exists({ index: this.index })) return;
    await this.client.indices.create({ index: this.index, mappings: { properties: {
      ownerId: { type: 'keyword' }, projectId: { type: 'keyword' }, id: { type: 'keyword' },
      kind: { type: 'keyword' }, occurredAt: { type: 'date' }, text: { type: 'text' }, sourceRef: { type: 'keyword' },
    } } });
  }

  async indexEvidence(record: EvidenceRecord) {
    const data = EvidenceSchema.parse(record);
    await this.client.index({ index: this.index,
      id: `${data.ownerId}:${data.projectId}:${data.id}`, document: data });
  }

  async search(scope: EvidenceScope, query: string): Promise<EvidenceRecord[]> {
    const valid = ScopeSchema.parse(scope);
    if (!query.trim()) throw new Error('Search query is required');
    const response = await this.client.search<EvidenceRecord>({ index: this.index, size: 20,
      query: { bool: {
        filter: [{ term: { ownerId: valid.ownerId } }, { term: { projectId: valid.projectId } }],
        must: [{ match: { text: query } }],
      } },
    });
    return response.hits.hits.flatMap(hit => {
      if (!hit._source) return [];
      const record = EvidenceSchema.parse(hit._source);
      if (record.ownerId !== valid.ownerId || record.projectId !== valid.projectId) throw new Error('Evidence scope mismatch');
      return [record];
    });
  }
}

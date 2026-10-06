import { Client } from '@elastic/elasticsearch';
import OpenAI from 'openai';
import { required } from '../config.js';
import { PayPalService } from './paypal/paypal.service.js';
import { ElasticEvidenceService } from './elastic/elastic.service.js';
import { AiEvidenceService } from './ai/ai.service.js';
import { LocalEvidenceStorage } from './storage/storage.service.js';

/** Lazy factories: booting health checks never requires provider credentials. Server only. */
export function createServices(env: NodeJS.ProcessEnv = process.env) {
  return {
    paypal: () => new PayPalService({ clientId: required(env, 'PAYPAL_CLIENT_ID'),
      clientSecret: required(env, 'PAYPAL_CLIENT_SECRET'), webhookId: env.PAYPAL_WEBHOOK_ID }),
    elastic: () => new ElasticEvidenceService(new Client({
      node: required(env, 'ELASTIC_URL'), auth: { apiKey: required(env, 'ELASTIC_API_KEY') },
    }), env.ELASTIC_INDEX || 'deliveryproof-evidence'),
    ai: () => new AiEvidenceService(new OpenAI({ apiKey: required(env, 'OPENAI_API_KEY'),
      timeout: 60_000, maxRetries: 1 }), required(env, 'OPENAI_MODEL')),
    storage: () => new LocalEvidenceStorage(env.EVIDENCE_STORAGE_DIR || '.data/evidence'),
  };
}

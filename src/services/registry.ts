import { Client } from '@elastic/elasticsearch';
import { GoogleGenAI } from '@google/genai';
import { required } from '../config.ts';
import { PayPalService } from './paypal/paypal.service.ts';
import { ElasticEvidenceService } from './elastic/elastic.service.ts';
import { AiEvidenceService } from './ai/ai.service.ts';
import { LocalEvidenceStorage } from './storage/storage.service.ts';

/** Lazy factories: booting health checks never requires provider credentials. Server only. */
export function createServices(env: NodeJS.ProcessEnv = process.env) {
  return {
    paypal: () => new PayPalService({ clientId: required(env, 'PAYPAL_CLIENT_ID'),
      clientSecret: required(env, 'PAYPAL_CLIENT_SECRET'), webhookId: env.PAYPAL_WEBHOOK_ID }),
    elastic: () => new ElasticEvidenceService(new Client({
      node: required(env, 'ELASTIC_URL'), auth: { apiKey: required(env, 'ELASTIC_API_KEY') },
    }), env.ELASTIC_INDEX || 'deliveryproof-evidence'),
    ai: () => new AiEvidenceService(new GoogleGenAI({ apiKey: required(env, 'GEMINI_API_KEY'),
      httpOptions: { timeout: 60_000 } }), required(env, 'GEMINI_MODEL')),
    storage: () => new LocalEvidenceStorage(env.EVIDENCE_STORAGE_DIR || '.data/evidence'),
  };
}

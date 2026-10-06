export class ConfigurationError extends Error {
  constructor(key: string) {
    super(`Missing configuration: ${key}`);
    this.name = 'ConfigurationError';
  }
}

export function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new ConfigurationError(key);
  return value;
}

export function integrationStatus(env: NodeJS.ProcessEnv) {
  const configured = (...keys: string[]) => keys.every(key => Boolean(env[key]?.trim()));
  return {
    paypal: configured('PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'),
    paypalWebhooks: configured('PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'),
    elastic: configured('ELASTIC_URL', 'ELASTIC_API_KEY'),
    ai: configured('GEMINI_API_KEY', 'GEMINI_MODEL'),
  };
}

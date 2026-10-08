import { z } from 'zod';

const MoneySchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  value: z.string().regex(/^(0|[1-9]\d*)\.\d{2}$/),
}).refine(money => /[1-9]/.test(money.value), 'Amount must be positive');
const OrderSchema = z.object({
  id: z.string(), status: z.string(),
  links: z.array(z.object({ href: z.string(), rel: z.string(), method: z.string().optional() })).optional(),
}).passthrough();
const DisputeSchema = z.object({
  dispute_id: z.string(), status: z.string(), reason: z.string(),
  seller_response_due_date: z.string().optional(),
  links: z.array(z.object({ href: z.string(), rel: z.string(), method: z.string().optional() })).optional(),
}).passthrough();
export type PayPalDispute = z.infer<typeof DisputeSchema>;
type Fetch = typeof globalThis.fetch;
class PayPalOrderUnavailable extends Error {}

export class PayPalService {
  private readonly baseUrl = 'https://api-m.sandbox.paypal.com';
  private token?: { value: string; expiresAt: number };
  constructor(private readonly config: { clientId: string; clientSecret: string; webhookId?: string },
    private readonly fetcher: Fetch = globalThis.fetch) {}

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;
    const response = await this.fetcher(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST', signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }, body: 'grant_type=client_credentials',
    });
    if (!response.ok) throw new Error(`PayPal authentication failed (${response.status})`);
    const data = z.object({ access_token: z.string(), expires_in: z.number().positive() }).parse(await response.json());
    this.token = { value: data.access_token, expiresAt: Date.now() + Math.max(0, data.expires_in - 60) * 1000 };
    return data.access_token;
  }

  private async request(path: string, method = 'GET', body?: unknown, requestId?: string, form?: FormData): Promise<unknown> {
    const headers: Record<string, string> = { Authorization: `Bearer ${await this.accessToken()}` };
    if (requestId) headers['PayPal-Request-Id'] = z.string().min(1).max(38).parse(requestId);
    if (!form) headers['Content-Type'] = 'application/json';
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method, headers, signal: AbortSignal.timeout(30_000),
      body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    // Do not include provider response bodies or credentials in errors/logs.
    if (!response.ok) {
      if (response.status === 404 && method === 'GET' && /^\/v2\/checkout\/orders\/[^/]+$/.test(path)) {
        const error = z.object({ name: z.literal('RESOURCE_NOT_FOUND'),
          details: z.array(z.object({ issue: z.literal('INVALID_RESOURCE_ID') })).min(1),
        }).safeParse(await response.json().catch(() => null));
        if (error.success) throw new PayPalOrderUnavailable('PayPal order is no longer available');
      }
      throw new Error(`PayPal request failed (${response.status})`);
    }
    return response.status === 204 ? undefined : response.json();
  }

  async createOrder(input: { projectId: string; currency: string; value: string; requestId: string; returnUrl?: string; cancelUrl?: string }) {
    const money = MoneySchema.parse(input);
    z.string().min(1).max(127).parse(input.projectId);
    return OrderSchema.parse(await this.request('/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE', purchase_units: [{ custom_id: input.projectId,
        amount: { currency_code: money.currency, value: money.value } }],
      ...(input.returnUrl && input.cancelUrl ? { payment_source: { paypal: { experience_context: {
        return_url: z.url().parse(input.returnUrl), cancel_url: z.url().parse(input.cancelUrl),
        user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING',
      } } } } : {}),
    }, input.requestId));
  }

  async getOrder(orderId: string) {
    return OrderSchema.parse(await this.request(`/v2/checkout/orders/${encodeURIComponent(orderId)}`));
  }

  /** Missing/expired orders may be replaced only if the caller has first
   * excluded capture attempts. Authentication and provider failures still throw. */
  async getOrderIfAvailable(orderId: string) {
    try { return await this.getOrder(orderId); }
    catch (error) {
      if (error instanceof PayPalOrderUnavailable) return null;
      throw error;
    }
  }

  async checkConnection() { await this.accessToken(); }

  async captureOrder(orderId: string, requestId: string) {
    return OrderSchema.parse(await this.request(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, 'POST', {}, requestId));
  }

  async getDispute(disputeId: string): Promise<PayPalDispute> {
    return DisputeSchema.parse(await this.request(`/v1/customer/disputes/${encodeURIComponent(disputeId)}`));
  }

  async verifyWebhook(headers: Headers, event: unknown): Promise<boolean> {
    if (!this.config.webhookId) throw new Error('PAYPAL_WEBHOOK_ID is required');
    const value = (key: string) => {
      const result = headers.get(key);
      if (!result) throw new Error(`Missing webhook header: ${key}`);
      return result;
    };
    const result = z.object({ verification_status: z.string() }).parse(await this.request(
      '/v1/notifications/verify-webhook-signature', 'POST', {
        auth_algo: value('paypal-auth-algo'), cert_url: value('paypal-cert-url'),
        transmission_id: value('paypal-transmission-id'), transmission_sig: value('paypal-transmission-sig'),
        transmission_time: value('paypal-transmission-time'), webhook_id: this.config.webhookId, webhook_event: event,
      }));
    return result.verification_status === 'SUCCESS';
  }

  /** Low-level transport only. Caller must authorize the reviewer, bind project/case,
   * persist approval, recheck allowed action/deadline and deduplicate submission. */
  async provideEvidence(disputeId: string, input: { notes: string; file: Uint8Array; filename: string; evidenceType: string }) {
    z.string().min(1).max(2000).parse(input.notes);
    if (input.file.byteLength === 0 || input.file.byteLength > 5 * 1024 * 1024) throw new Error('Evidence file must be 1 byte to 5 MB');
    if (!/^[A-Za-z0-9_.-]+\.pdf$/i.test(input.filename)) throw new Error('Use a simple PDF filename');
    const form = new FormData();
    form.append('input', new Blob([JSON.stringify({ evidences: [{
      evidence_type: input.evidenceType, notes: input.notes,
    }] })], { type: 'application/json' }));
    form.append('file1', new Blob([new Uint8Array(input.file)], { type: 'application/pdf' }), input.filename);
    return this.request(`/v1/customer/disputes/${encodeURIComponent(disputeId)}/provide-evidence`, 'POST', undefined, undefined, form);
  }
}

# Service foundation

## Status

| Technology | Files | Current scope |
| --- | --- | --- |
| PayPal | `src/services/paypal/` | Sandbox OAuth, create/capture order, read dispute, verify webhook via PayPal, multipart PDF evidence transport |
| Elastic | `src/services/elastic/` | Index mapping, scoped indexing and lexical search; vector search is a later enhancement |
| AI / OpenAI | `src/services/ai/` | Responses structured output, scope checks, citation-ID validation; configurable model |
| File storage | `src/services/storage/` | Local content-addressed originals; no overwrite; integrity-checked reads |
| AG Grid / AG Studio | `src/services/dashboard/` | Browser-safe row and column contracts using AG Grid types. Rendered grid, Studio widgets and agent framework are not implemented yet |
| Render | `render.yaml`, `src/services/jobs/` | Undeployed web-service Blueprint; durable job and webhook repository interfaces. Queue / Workflows adapter not implemented |
| Postman | `tools/postman/` | Importable collection and blank environment for local health and PayPal sandbox calls |
| APIMatic | `tools/apimatic/README.md` | Development setup instructions for the PayPal Context Plugin; not a runtime API |

Do not import `registry.ts` into a browser bundle: it creates credentialed server clients.
Create one service instance per provider in the eventual backend composition root, rather than rebuilding clients for every request.

## Configuration

Copy `.env.example` to `.env`. Fill in only integrations being exercised.
The health route reports whether keys are present, not whether they are valid.
No startup call connects to a provider or creates an Elastic index.

- **PayPal:** use a sandbox REST application from the developer dashboard. Configure a real webhook ID when implementing the event route. No live-mode toggle exists.
- **Elastic:** set `ELASTIC_URL`, `ELASTIC_API_KEY`, and optionally `ELASTIC_INDEX`. `ensureIndex()` explicitly creates an index when invoked. Use API keys restricted to the evidence index.
- **AI:** set `OPENAI_API_KEY` and `OPENAI_MODEL` to an available model supporting Responses structured outputs. No model is hardcoded. Evidence is sent to the provider only when `analyse()` is called; `store: false` requests no stored Response. This does not override provider retention policies.
- **Storage:** `.data/evidence` is ignored by Git. The caller must authenticate the user before constructing a scope. File paths are never accepted from users; reads use an owner/project plus SHA-256 hash.
- **Render:** the Blueprint has placeholders for secrets, not credentials. It is not deployed. Local disk is not a production evidence store.

Example backend use:

```ts
import { createServices } from './services/registry.js';
const services = createServices();
const paypal = services.paypal();
const order = await paypal.createOrder({
  projectId: 'project-001', currency: 'USD', value: '500.00',
  requestId: 'unique-and-persisted-operation-id',
});
```

The application must persist operation IDs so retries reuse the same PayPal request ID.
Do not automatically retry evidence submission: first inspect the case if its result is unknown.

## Boundaries still to implement

1. Authentication and project membership checks. Scope validation prevents mixed-record analysis but does not authenticate users.
2. Durable database for projects, original event records, case links, approvals, and submission receipts.
3. Verified webhook ingestion with atomic event deduplication and a durable job outbox/dispatcher.
4. Delivery portal, acknowledgements, authorized uploads, MIME validation, and PDF packet export.
5. Reviewed submission orchestration: verify authenticated reviewer, bind case to payment/project, re-fetch deadline and allowed action, record the approval and packet hash, then invoke PayPal transport.
6. AG Studio dashboard and its license setup. AG Grid contracts alone are not AG Studio integration.
7. Semantic retrieval, evidence quotation checks, and evaluations. Valid citation IDs do not prove that a generated statement is supported by its cited text.

The current HTTP app deliberately exposes only `/health`; credentialed payment and evidence services are not exposed as unauthenticated routes.
Tests use mocked provider responses and temporary local files. Live connectivity and an end-to-end dispute have not been tested.

## Optional sponsors

Zapier (correspondence ingestion), Bryntum (deadline timelines), KERNEL (authorized browser evidence collection), and Astropods (alternate agent runtime) remain optional. Channel3 retail data is outside the digital-services MVP. There are no pretend service implementations for them.

## Reference documentation

- [PayPal Orders](https://developer.paypal.com/api/orders/v2)
- [PayPal dispute evidence](https://developer.paypal.com/platforms/disputes/handle-disputes/use-disputes-api/)
- [PayPal webhook verification](https://developer.paypal.com/api/rest/webhooks/rest/)
- [Elastic JavaScript client](https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/getting-started)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Render Blueprints](https://render.com/docs/blueprint-spec)
- [AG Studio hackathon resources](https://paypalaihackathon.devpost.com/details/aggrid)

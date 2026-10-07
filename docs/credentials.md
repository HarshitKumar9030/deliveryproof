# Local credentials and the first core workflow

Run `npm run setup:local`. It creates an ignored `.env.local` with a random workspace password and session signing secret, preserves existing values, and prints no secrets. Add provider credentials in that file, then restart `npm run dev`. Never use `NEXT_PUBLIC_` for provider secrets.

| Variable | Where to get it | Needed when |
| --- | --- | --- |
| `GEMINI_API_KEY` | [Google AI Studio API keys](https://aistudio.google.com/api-keys): create a key for your project | Evidence analysis |
| `GEMINI_MODEL` | Copy an available text model ID with structured-output support from [Gemini models](https://ai.google.dev/gemini-api/docs/models) | Evidence analysis; model availability depends on your account |
| `WORKSPACE_PASSWORD` | Generated locally by the setup script; read it from `.env.local` to unlock analysis | Single-workspace development access |
| `WORKSPACE_SESSION_SECRET` | Generated locally by the setup script; keep at least 32 random characters | Signs the eight-hour HttpOnly session |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox): select Sandbox, create/open a REST app, copy its credentials | Future sandbox order/webhook flow |
| `PAYPAL_WEBHOOK_ID` | In that sandbox REST app, register the public HTTPS webhook endpoint and copy its webhook ID | After verified webhook ingestion is implemented; localhost cannot receive PayPal callbacks directly |
| `ELASTIC_URL`, `ELASTIC_API_KEY` | [Elastic project connection details](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/find-connection-details-serverless): copy Elasticsearch endpoint and create an index-scoped Elasticsearch API key | Future evidence indexing/retrieval; do not use a Cloud management API key |
| `ELASTIC_INDEX` | Choose an index name; default `deliveryproof-evidence` | Evidence indexing |

No Render API token or AG Grid key is required for the current local workflow. Deployment, AG Studio licensing, and other sponsor integrations are separate follow-up work.

## What works now

Open Orbit Labs → Response → select records → enter the actual dispute reason → Analyse with Gemini → unlock with the local workspace password if prompted. The server resolves canonical demo records by project/source ID, sends them to Gemini, validates structured output and citation IDs, and returns findings and gaps. Inspect the references, then choose **Review these findings in a draft**. Editing or regenerating requires fresh human review before preparing the JSON demo packet.

Gemini requires your configured key/model; unavailable or invalid configuration produces an explicit error, never simulated AI success. Live connectivity has not been verified without those credentials. Citation-ID validation does not establish factual support; the reviewer must inspect each source.

## Current boundary

This is a single-workspace development access gate protecting the analysis endpoint, not a multi-user account system. Login and analysis have process-local limits, same-origin checks, bounded request bodies, and signed HttpOnly cookies. Only server-owned synthetic dispute records are currently accepted. New in-memory records are not silently treated as durable originals.
When deploying behind a proxy, set `APP_ORIGIN` to the exact HTTPS app origin. Shared rate limits, user accounts/membership, and durable storage are required before opening this to multiple customers.

Next core milestones: durable project/evidence storage and membership → verified PayPal webhook ingestion with deduplication → delivery portal/acknowledgements → Elastic retrieval → reviewed PDF packet and PayPal submission. No real payments or dispute submissions are initiated by this slice.

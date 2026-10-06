# DeliveryProof

Preserve proof of digital work, identify delivery gaps, and prepare reviewed PayPal dispute evidence.

Standalone repository on `main`. This is the service foundation; project authentication, delivery UI, durable database/queue, and end-to-end dispute flow come next.

## Local setup

Requires Node.js 22+ and npm.

```sh
npm ci
cp .env.example .env
npm run check
npm run dev
```

PowerShell: use `Copy-Item .env.example .env` instead of `cp`.
Health endpoint: `http://localhost:3001/health`. No provider credentials are needed to start it or run mocked tests.

Never commit credentials or customer evidence. Provider adapters fail explicitly when configuration is missing; they never return simulated success. PayPal uses sandbox only.

See [services](docs/services.md) for integration status, setup, and limitations. Commit verified milestones with `git add <files>` and `git commit -m "<change>"` from this folder. No GitHub remote or deployment is configured yet.

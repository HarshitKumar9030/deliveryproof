# DeliveryProof

Preserve proof of digital work, identify delivery gaps, and prepare reviewed PayPal dispute evidence.

Standalone repository on `main`. Includes a Next.js demo frontend and the separate service foundation. The frontend uses synthetic, in-memory data; no provider credentials are required and no external services are called.

## Local setup

Requires Node.js 22+ and npm.

```sh
npm ci
cp .env.example .env
npm run check
npm run dev
```

PowerShell: use `Copy-Item .env.example .env` instead of `cp`.
Frontend: `http://localhost:3000`. Open a project, record a demo payment/delivery/acknowledgement, or review Orbit Labs' dispute sources and download a reviewed JSON demo packet. Ctrl/⌘K opens project/command search; arrow keys, Enter, and Escape navigate it. Mobile navigation uses a hamburger menu. The light/dark choice persists in a one-year cookie and is rendered by the server to prevent an initial theme flash. Demo project changes survive client navigation and reset on refresh. New project URLs only exist for the current session.

The UI uses Tailwind CSS v4, graphite/amber theme tokens, squircle surfaces, and reduced-motion-aware transitions. Summary cards adapt to screen width and expand into live demo breakdowns. SF Pro is preferred on systems where available. Windows currently renders self-hosted Inter as the explicit fallback; SF Pro is not installed or bundled. No decorative borders or shadows.

In another terminal, run `npm run dev:api` for the separate backend. Health endpoint: `http://localhost:3001/health`. No provider credentials are needed to start it or run mocked tests. `npm run build:api` compiles that service; `npm run build` builds the frontend. The Render Blueprint continues to describe the API service only.

Never commit credentials or customer evidence. Provider adapters fail explicitly when configuration is missing; they never return simulated success. PayPal uses sandbox only.

See [services](docs/services.md) for integration status, setup, and limitations. Commit verified milestones with `git add <files>` and `git commit -m "<change>"` from this folder. No GitHub remote or deployment is configured yet.

See [frontend design](docs/frontend-design.md) for the UI system. Authentication, durable storage/queue, real delivery events, Gemini analysis in the UI, PDF packet generation, and reviewed PayPal submission are future integration work. The demo packet is JSON for inspecting the sample flow, not a PayPal-ready PDF.

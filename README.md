# DeliveryProof

Preserve proof of digital work, identify delivery gaps, and prepare reviewed PayPal dispute evidence.

Standalone repository on `main`, connected to GitHub. Includes a Next.js demo frontend and the separate service foundation. Projects use synthetic, in-memory data. Browsing requires no provider credentials; optional authenticated evidence analysis makes a real server-side Gemini call when explicitly requested.

## Local setup

Requires Node.js 22+ and npm.

```sh
npm ci
npm run setup:local
cp .env.example .env
npm run check
npm run dev
```

PowerShell: use `Copy-Item .env.example .env` instead of `cp`.
For Gemini analysis, follow [credential setup](docs/credentials.md), fill in `.env.local`, and restart the development server.
Frontend: `http://localhost:3000`. Open a project, record a demo payment/delivery/acknowledgement, or review Orbit Labs' dispute sources and download a reviewed JSON demo packet. Ctrl/⌘K opens project/command search; arrow keys, Enter, and Escape navigate it. Mobile navigation uses a hamburger menu. The light/dark choice persists in a one-year cookie and is rendered by the server to prevent an initial theme flash. Demo project changes survive client navigation and reset on refresh. New project URLs only exist for the current session.

The UI uses Tailwind CSS v4, graphite/amber theme tokens, squircle surfaces, and reduced-motion-aware transitions. Summary cards adapt to screen width and expand into live demo breakdowns. SF Pro is preferred on systems where available. Windows currently renders self-hosted Inter as the explicit fallback; SF Pro is not installed or bundled. Soft layered shadows provide depth on cards, dialogs, and primary controls.

In another terminal, run `npm run dev:api` for the separate backend. Health endpoint: `http://localhost:3001/health`. No provider credentials are needed to start it or run mocked tests. `npm run build:api` compiles that service; `npm run build` builds the frontend. The Render Blueprint continues to describe the API service only.

Never commit credentials or customer evidence. Provider adapters fail explicitly when configuration is missing; they never return simulated success. PayPal uses sandbox only.

See [services](docs/services.md) for integration status, setup, and limitations. Commit verified milestones with `git add <files>` and `git commit -m "<change>"` from this folder. GitHub origin is configured; no deployment is configured yet.

See [frontend design](docs/frontend-design.md) for the UI system. Gemini analysis is wired to a single-workspace development access gate. Multi-user authentication, durable storage/queue, real delivery events, PDF packet generation, and reviewed PayPal submission remain future integration work. The demo packet is JSON for inspecting the sample flow, not a PayPal-ready PDF.
# Local product infrastructure

Run `npm run setup:local` to add missing local configuration without replacing existing secrets.
Run `npm run db:local` in a separate terminal. This downloads MongoDB on first use, binds it to
127.0.0.1:27017, and keeps its WiredTiger database in `.data/mongodb` between restarts. It is a
development launcher; use a managed MongoDB URI for hosting. Do not run it alongside another
MongoDB process on port 27017.

Create a development account in an interactive terminal with
`npm run account:create -- you@example.com`. The generated password is printed there once;
only a salted scrypt hash is stored. Auth.js sign-in is available at `/api/auth/signin`.

Add `UPLOADTHING_TOKEN` to `.env.local` from your UploadThing app dashboard. Upload credentials
stay on the server. The upload endpoint requires an authenticated user and a project owned by
that user. Authenticated upload metadata is persisted after UploadThing's verified callback.

These infrastructure routes are the first product migration step. The existing dashboard still
uses demo state until its project flows are connected to the persistent repository.

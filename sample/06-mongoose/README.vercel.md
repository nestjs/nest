# Vercel deployment

This sample can run on Vercel as a NestJS serverless function.

## Modes

- Without `MONGODB_URI`: the app starts in database-disabled mode. Static pages, `/api`, and `/api/health` are available.
- With `MONGODB_URI`: database-backed modules are enabled, including auth, cats, scheduled tasks, report export, and execution records.

## Minimal template APIs

These routes work without a database:

- `GET /api/health`: deployment/runtime health.
- `GET /api/auth/keycloak/config`: public Keycloak config for frontend login wiring.
- `GET /api/auth/me`: validates a bearer token with Keycloak introspection when `KEYCLOAK_INTROSPECTION_URL` and `KEYCLOAK_CLIENT_SECRET` are configured; otherwise it only decodes the payload for local wiring.
- `POST /api/ai/chat`: proxies JSON to `AI_API_URL` and passes `AI_API_KEY` as a bearer token when configured.

## Vercel project settings

Use `sample/06-mongoose` as the Vercel project root.

Build settings are defined in `vercel.json`:

- Install Command: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install --legacy-peer-deps --registry=https://registry.npmjs.org`
- Build Command: `npm run build`
- Output Directory: `public`

## Environment variables

Required only when enabling database-backed APIs:

```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=change-me
BASE_URL=https://node.acongm.com
```

Optional:

```bash
DISABLE_DATABASE=true
LOG_LEVEL=info
KEYCLOAK_ISSUER=
KEYCLOAK_AUTH_URL=
KEYCLOAK_REALM=
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=
KEYCLOAK_INTROSPECTION_URL=
AI_API_URL=
AI_API_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Custom domain

After deployment, add `node.acongm.com` in the Vercel project domain settings and point the DNS record to Vercel as instructed by the dashboard.

## Manual migration

For a small manual GitHub migration, copy the changed files listed by `git status --short` from `sample/06-mongoose`.

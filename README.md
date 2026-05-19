# Sidebrary

A guided intake form that turns your answers into a generated personal site, deployed on Cloudflare.

Live: https://sidebrary.ntedvs.com/

## Stack

- React 19 + Vite + Tailwind v4 (with React Compiler)
- Cloudflare Workers + Workflows for site generation
- KV for intake storage, R2 for uploads, Workers AI + Browser Rendering
- TypeScript, oxfmt

## Scripts

- `bun run dev` - Vite dev server
- `bun run worker` - `wrangler dev`
- `bun run build` - typecheck + build
- `bun run deploy` - build and deploy the Worker
- `bun run types` - regenerate `worker-configuration.d.ts`
- `bun run format` - oxfmt

## Layout

- `src/` - React app (intake flow in `app.tsx`, questions in `questions.ts`, inputs in `fields.tsx`)
- `worker/` - Worker entry (`index.ts`), site generation (`generate.ts`), and Workflow (`workflow.ts`)
- `wrangler.toml` - bindings: `INTAKE_KV`, `UPLOADS` (R2), rate limiters, `SITE_WORKFLOW`, `AI`

## Secrets

Set via `wrangler secret put <NAME>`:

- `CLOUDFLARE_ACCOUNT_ID`
- `BROWSER_RENDERING_TOKEN`

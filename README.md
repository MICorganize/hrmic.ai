# HRMic.ai

Modern HR management platform.

## Tech Stack

| Layer           | Technology                                        |
| --------------- | ------------------------------------------------- |
| Frontend        | Next.js 16 App Router                             |
| Language        | TypeScript (strict)                               |
| ORM             | Prisma 7                                          |
| Database        | PostgreSQL (Neon)                                 |
| Cache / Queue   | Upstash Redis                                     |
| Object Storage  | Cloudflare R2                                     |
| Authentication  | Auth.js (NextAuth v5)                             |
| Validation      | Zod 4                                             |
| Forms           | React Hook Form                                   |
| UI              | Tailwind CSS + shadcn/ui                          |
| Background Jobs | Inngest (v4)                                      |
| Testing         | Vitest + Playwright                               |

## Getting Started

```bash
npm install          # also runs prisma generate (postinstall)
cp .env.example .env # fill in real values (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env` and fill in credentials for:

- **Neon** — `DATABASE_URL` (pooled, for the app) and `DIRECT_URL` (direct, for Prisma CLI migrations)
- **Upstash** — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Cloudflare R2** — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- **Auth.js** — `AUTH_SECRET` (generate with `npx auth secret`)
- **Inngest** — keep `INNGEST_DEV=1` locally; add `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` for Cloud

## Database

```bash
npm run db:migrate  # create & apply a migration (needs DIRECT_URL)
npm run db:studio   # open Prisma Studio
npm run db:seed     # seed the admin user (admin@hrmic.ai)
npm run db:generate # regenerate the Prisma client (also runs on install)
```

The Prisma client is generated to `generated/prisma` (gitignored) — import it from
`@/generated/prisma/client`, not `@prisma/client` (Prisma 7 breaking change).

## Background Jobs

Inngest functions live in `lib/inngest/`. Run the dev server for local testing:

```bash
npx inngest dev     # opens http://localhost:8288
```

## Testing

```bash
npm run test        # Vitest (watch mode)
npm run test:run    # Vitest (single run)
npm run test:e2e    # Playwright (boots the dev server, needs chromium installed once: npx playwright install chromium)
```

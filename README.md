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

The app connects to the real Neon database via the pooled `DATABASE_URL` in `.env`.
`prisma/schema.prisma` is **synced from the database** (`npx prisma db pull`) — it is a
snapshot of the live schema (46 models), not a source of truth for migrations.

> ⚠️ **Do not run `npm run db:migrate` here.** The migrations for this database live in
the main HRMic.ai project. Running `prisma migrate dev` locally would detect drift and
offer to **reset the production database**. Manage schema changes through the real
project and re-sync with `npx prisma db pull`.

```bash
npm run db:generate # regenerate the Prisma client (also runs on install)
npm run db:seed     # upsert admin@hrmic.ai (password: Admin@1234, or ADMIN_PASSWORD env)
npm run db:studio   # open Prisma Studio
```

The Prisma client is generated to `generated/prisma` (gitignored) — import it from
`@/generated/prisma/client`, not `@prisma/client` (Prisma 7 breaking change).

## Login

- Auth.js v5 (Credentials) against the `User` table — passwords are **bcrypt** hashes.
- Login requires `status = "active"`; the session role comes from `UserRole` → `Role`
  (Thai role names, e.g. `ผู้ดูแลระบบ`).
- Existing users in the database (e.g. `cadirek@gmail.com`) sign in with their own password.
- `npm run db:seed` creates `admin@hrmic.ai` with password `Admin@1234` (override via
  `ADMIN_PASSWORD` env) attached to the first tenant and the `ผู้ดูแลระบบ` role.

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

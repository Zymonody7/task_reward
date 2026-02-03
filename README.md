# Task & Reward System

Next.js app with Neon PostgreSQL and Drizzle ORM for schema.

## Stack

- Next.js 14 (App Router)
- Neon (PostgreSQL), Drizzle ORM, `@neondatabase/serverless`
- React 18, SWR, Tailwind CSS
- Session (JWT cookie), RBAC (admin / user)
- UUID primary keys (`gen_random_uuid()`)

## Database schema

**users**

| Column        | Type    | Notes                         |
| ------------- | ------- | ----------------------------- |
| id            | uuid    | PK, default gen_random_uuid() |
| name          | text    | not null                      |
| points        | integer | not null, default 0           |
| username      | text    | not null, unique              |
| password_hash | text    | not null                      |
| role          | text    | not null ('admin' \| 'user')  |

**tasks**

| Column  | Type    | Notes                            |
| ------- | ------- | -------------------------------- |
| id      | uuid    | PK, default gen_random_uuid()    |
| title   | text    | not null                         |
| type    | text    | not null ('ONE_TIME' \| 'DAILY') |
| reward  | integer | not null                         |
| enabled | boolean | not null, default true           |

**point_records**

| Column     | Type        | Notes                                      |
| ---------- | ----------- | ------------------------------------------ |
| id         | uuid        | PK, default gen_random_uuid()              |
| user_id    | uuid        | not null, FK → users.id, on delete cascade |
| task_id    | uuid        | not null, FK → tasks.id, on delete cascade |
| task_title | text        | not null                                   |
| delta      | integer     | not null                                   |
| created_at | timestamptz | not null, default now()                    |
| note       | text        | optional                                   |

**completions**

| Column  | Type | Notes                                      |
| ------- | ---- | ------------------------------------------ |
| user_id | uuid | not null, FK → users.id, on delete cascade |
| task_id | uuid | not null, FK → tasks.id, on delete cascade |
| date    | text | not null (YYYY-MM-DD)                      |

Primary key: `(user_id, task_id, date)`.

**idempotency_keys**

| Column     | Type        | Notes                   |
| ---------- | ----------- | ----------------------- |
| key        | text        | PK                      |
| created_at | timestamptz | not null, default now() |

## Tech choices

- **Next.js + Vercel**: Single repo for API and UI, good fit for Vercel deploy; push to main to deploy, branches for previews.
- **Neon**: Serverless Postgres with HTTP driver, works in serverless/edge without long-lived TCP; scales to zero.

## API

All responses: `{ success: boolean, data?: T, error?: { code, message } }`. Some errors (e.g. already completed) may include extra fields like `user`.

**Auth**

- `POST /api/auth/login` — body `{ username, password }`, sets cookie
- `POST /api/auth/logout` — clears session
- `GET /api/auth/session` — current session (userId, role)

**Users**

- `GET /api/users` — list users (admin only)
- `POST /api/users` — create user `{ name, username, password }` (admin only)
- `GET /api/users/[id]` — user + records + completions (self or admin)

**Tasks**

- `GET /api/tasks` — list tasks
- `POST /api/tasks` — create task `{ title, type, reward, enabled }`, type `ONE_TIME` \| `DAILY` (admin only)
- `PATCH /api/tasks/[id]` — update task, e.g. `{ enabled }` (admin only)
- `POST /api/tasks/complete` — complete task (self only). Body: `{ userId, taskId, idempotencyKey? }`. Success: `data` has `user` (with updated points) and `record`.

**POST /api/tasks/complete** error codes:

| Status | code                    | Meaning                                            |
| ------ | ----------------------- | -------------------------------------------------- |
| 401    | UNAUTHORIZED            | Not logged in                                      |
| 403    | FORBIDDEN               | Can only complete for yourself                     |
| 400    | VALIDATION_ERROR        | Missing userId or taskId                           |
| 404    | NOT_FOUND               | User or task not found                             |
| 400    | TASK_DISABLED           | Task is disabled                                   |
| 400    | ALREADY_COMPLETED       | One-time task already done (may include `user`)    |
| 400    | ALREADY_COMPLETED_TODAY | Daily task already done today (may include `user`) |
| 409    | IDEMPOTENCY_REPLAY      | Same idempotency key already processed             |

## Duplicate points and repeated requests

**1. How duplicate points are avoided**

Completions are enforced by the DB: one-time by (userId, taskId) in practice (one row per user per task); daily by primary key (userId, taskId, date). Before granting points we check existing completions and reject if already done. Idempotency keys: if the client sends the same `idempotencyKey` again, we return 409 and do not run the grant logic.

**2. Same complete request triggered multiple times**

First request: normal flow, points granted, completion and point record written. Later requests with the same idempotency key: 409, no second grant. If no key or different keys (e.g. double-click with new key each time), the second request is rejected by “already completed” or by the unique constraint on completions, so no double grant.

**3. Extra design choices**

- Unified error codes and messages (TASK_DISABLED, ALREADY_COMPLETED, ALREADY_COMPLETED_TODAY, IDEMPOTENCY_REPLAY). Some error responses include `user` so the client can update cache.
- Completions table = who completed which task on which date (PK prevents duplicate completion). Point records table = audit trail of each points change.
- Idempotency key table and optional `idempotencyKey` on complete endpoint so the same logical action can be retried or double-clicked without granting points twice.

## Structure

- `app/` — App Router pages and API routes
- `app/api/` — auth, users, tasks
- `lib/db/` — Drizzle schema and Neon client
- `lib/auth.ts` — session JWT
- `lib/api/` — response helpers, API client
- `context/` — auth context
- `scripts/seed.ts` — seed admin and default tasks

## Local run

Node.js 18+.

1. `npm install`
2. Copy `.env.example` to `.env.local`. Set `DATABASE_URL`, `SESSION_SECRET`, and for seed only `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
3. `npm run db:push` then `npm run db:seed`
4. `npm run dev`

Open [http://localhost:3000](http://localhost:3000); unauthenticated users go to `/login`. Seed creates admin, demo users (e.g. alice/bob), and default tasks.

## Scripts

| Command               | Description                 |
| --------------------- | --------------------------- |
| `npm run dev`         | Dev server                  |
| `npm run build`       | Production build            |
| `npm run start`       | Production start            |
| `npm run db:push`     | Sync schema to Neon         |
| `npm run db:seed`     | Seed admin and default data |
| `npm run db:generate` | Generate migrations         |
| `npm run db:migrate`  | Run migrations              |
| `npm run db:studio`   | Drizzle Studio              |

## Deploy (Vercel)

1. Import repo in Vercel. Set production branch to `main`.
2. Add env vars (e.g. `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`).
3. Push to `main` to deploy.

## AI tools

| Tool        | Role                                                                 |
| ----------- | -------------------------------------------------------------------- |
| GPT         | Summarize requirements                                               |
| AI Studio   | First pass: frontend UI and mock data                                |
| Cursor      | Next.js API routes and business logic refinement                     |
| Codex       | Code review                                                          |

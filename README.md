# Task & Reward System (RewardSys)

Next.js app with Neon PostgreSQL and Drizzle ORM for schema.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Neon (PostgreSQL)
- **ORM**: Drizzle ORM + `@neondatabase/serverless`
- **Frontend**: React 18, SWR, Tailwind CSS
- **Auth**: Session (JWT Cookie), RBAC by role
- **IDs**: UUID primary keys via `gen_random_uuid()`

Everyone must log in. Single `users` table (name, points, username, password, role); admin creates users (name + username + password) on the Users page.

## Structure

- `app/` - App Router pages and API routes
- `app/api/` - API (auth, users, tasks)
- `lib/db/` - Drizzle schema and Neon client
- `lib/auth.ts` - Session JWT sign/verify
- `lib/api/` - Response helpers, API client
- `context/` - Auth from server session
- `scripts/seed.ts` - Seed admin and default tasks (config from .env)

## Local run

**Requires**: Node.js 18+

1. Install: `npm install`

2. Env: copy `.env.example` to `.env.local` and set:
   - `DATABASE_URL` - Neon connection string
   - `SESSION_SECRET` - At least 32 chars for session signing
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` - Used by `npm run db:seed` only (do not commit)

3. Push schema and seed:
   ```bash
   npm run db:push
   npm run db:seed
   ```
   If you previously had text-type ids, clear tables or recreate the DB in Neon before push + seed.

4. Start: `npm run dev`

[http://localhost:3000](http://localhost:3000) redirects to `/dashboard`; unauthenticated users go to `/login`.  
Seed creates: admin (from .env), demo users (e.g. alice/bob, password from `DEMO_USER_PASSWORD`), and default tasks.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next dev server |
| `npm run build` | Production build |
| `npm run start` | Start in production |
| `npm run db:push` | Sync Drizzle schema to Neon |
| `npm run db:seed` | Seed admin and default tasks (uses ADMIN_*, SESSION_SECRET from .env) |
| `npm run db:generate` | Generate migrations |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Open Drizzle Studio |

## API

- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user `{ "name", "username", "password" }` (admin only)
- `GET /api/users/[id]` - User details (records & completions; self or admin)
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task `{ "title", "type", "reward", "enabled" }`
- `POST /api/tasks/complete` - Complete task `{ "userId", "taskId", "idempotencyKey?" }` (self only)

All responses: `{ success, data?, error? }`.

## Deploy (Vercel CI/CD)

Push to the `release` branch to deploy to production.

1. **Connect repo**: In [Vercel](https://vercel.com), import this repo (GitHub/GitLab/Bitbucket).

2. **Production branch**: In the project **Settings → Git**, set **Production Branch** to `release`.  
   Then every push to `release` triggers a production deployment; other branches get preview deployments.

3. **Environment variables**: In **Settings → Environment Variables**, add the same vars as `.env.local` (e.g. `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`) for Production (and Preview if you need DB in previews).

4. **Deploy**: Merge to `release` or push directly:
   ```bash
   git push origin release
   ```

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

| Command               | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `npm run dev`         | Start Next dev server                                                   |
| `npm run build`       | Production build                                                        |
| `npm run start`       | Start in production                                                     |
| `npm run db:push`     | Sync Drizzle schema to Neon                                             |
| `npm run db:seed`     | Seed admin and default tasks (uses ADMIN\_\*, SESSION_SECRET from .env) |
| `npm run db:generate` | Generate migrations                                                     |
| `npm run db:migrate`  | Run migrations                                                          |
| `npm run db:studio`   | Open Drizzle Studio                                                     |

## API

- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user `{ "name", "username", "password" }` (admin only)
- `GET /api/users/[id]` - User details (records & completions; self or admin)
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task `{ "title", "type", "reward", "enabled" }`
- `POST /api/tasks/complete` - Complete task `{ "userId", "taskId", "idempotencyKey?" }` (self only)

All responses: `{ success, data?, error? }`.

## Deploy (Vercel CI/CD)

Push to the `main` branch to deploy to production (with **Production Branch** set to `main` in Vercel).

1. **Connect repo**: In [Vercel](https://vercel.com), import this repo (GitHub/GitLab/Bitbucket).

2. **Production branch**: In the project **Settings → Git**, set **Production Branch** to `main`.  
   Then every push to `main` triggers a production deployment; other branches get preview deployments.

3. **Environment variables**: In **Settings → Environment Variables**, add the same vars as `.env.local` (e.g. `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`) for Production (and Preview if needed).

4. **Deploy**: Push to `main`:
   ```bash
   git push origin main
   ```

**Push to main but no auto-deploy?**

- **Settings → Git**: Confirm "Connected Git Repository" shows the correct repo (e.g. `your-org/task-reward-system`). If not, reconnect the repo.
- **Git provider**: Vercel only reacts to pushes on the connected Git host. Pushing to another remote (e.g. a different GitHub org or a self-hosted Git) will not trigger Vercel.
- **GitHub**: In the repo **Settings → Webhooks**, there should be a Vercel webhook. If it was removed or shows errors, reconnect the project in Vercel (Settings → Git → Disconnect and re-import).
- **Deployments tab**: Check whether new commits appear as "Building" or "Queued". If not, the webhook may not be firing; try **Redeploy** from the latest deployment’s "..." menu to confirm the project builds.

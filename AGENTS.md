# AGENTS.md

## Cursor Cloud specific instructions

### Overview
2XED is a Next.js 15 full-stack adaptive learning platform backed by PostgreSQL 15+. It is a single-service monolith (not a monorepo).

### Prerequisites
- **Node.js 20** (use `nvm use 20`; Node 22+ may work but the project targets 20)
- **PostgreSQL** running on localhost:5432 with user `ember`, password `ember_secret`, database `ember`

### Environment
Copy `.env.example` to `.env` before first run. The defaults in `.env.example` are sufficient for local development.

### Key commands
| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Generate Prisma client | `npx prisma generate` |
| Run migrations | `npx prisma migrate dev` |
| Seed database | See note below |
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Tests | `npm test` (vitest) |
| Build | `npm run build` |

### Gotchas

- **Database seeding**: `npx prisma db seed` fails because the `--compiler-options` JSON uses single quotes that break in the shell. Run the three seed scripts individually instead:
  ```
  npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
  npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-n11-n13.ts
  npx ts-node -r tsconfig-paths/register --compiler-options '{"module":"CommonJS"}' prisma/ensure-routes-n14-n15.ts
  ```

- **Pre-existing test failures**: ~8 test suites fail due to a duplicate `parseProtractorConfig` declaration in `src/features/learn/itemContent.ts`. This is a pre-existing codebase issue, not an environment problem. 7595/7598 tests pass.

- **Pre-existing lint errors**: `npm run lint` exits non-zero due to existing `react/no-unescaped-entities` and `@typescript-eslint/no-require-imports` errors in the codebase.

- **Pre-existing build error for diagnostic quiz**: Starting the diagnostic quiz at `/diagnostic/ks3-maths/run` triggers a Next.js module parse error related to the duplicate `parseProtractorConfig` symbol. All other pages load correctly.

### Test accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ember.local | admin123 |
| Student | student@example.com | password123 |

### Starting PostgreSQL (if not running)
```bash
sudo pg_ctlcluster 16 main start
```

# Ember

## Getting Started

### Prerequisites
- Docker + Docker Compose
- Node.js 20+

### Local Development with Docker

```bash
# Start PostgreSQL and the Next.js app
docker compose up -d

# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev --name init

# Seed the database (Maths Number + FDP graph)
npx prisma db seed
# or: npm run db:seed

# Start the dev server (if not using Docker)
npm run dev
```

### Database Migrations

When the Prisma schema changes:

```bash
# Apply pending migrations
npx prisma migrate dev

# Regenerate the Prisma client
npx prisma generate
```

### Running Tests

```bash
npm test
```

### Environment Variables

Copy `.env.example` to `.env` and set:

```
DATABASE_URL=postgresql://ember:ember_secret@localhost:5432/ember
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

## Maths Skill Graph

Stage 2 introduces a mastery-gated skill graph for Maths (Year 7 Entry).

- **56 skills** across Number (N1–N3) and FDP (N4) strands
- Prerequisite edges enforce unlock order: a skill is only available once all its prerequisites have `mastery ≥ 0.85` AND `confirmedCount ≥ 2`
- Spaced-repetition scheduler:
  - mastery < 0.6 → review in **1 day**
  - mastery ∈ [0.6, 0.85) → review in **3 days**
  - mastery ≥ 0.85 and confirmedCount < 2 → review in **7 days**
  - mastery ≥ 0.85 and confirmedCount ≥ 2 → review in **14 days**


## Stage 3 — Mastery Engine

### Setup
```bash
# Apply migrations
npx prisma migrate deploy

# Seed (creates student + admin user)
npm run db:seed

# Dev server
npm run dev
```

### Admin Access
- URL: http://localhost:3000
- Admin email: admin@ember.local
- Admin password: admin123
- Student email: student@example.com
- Student password: password123

### Key Routes
- `/diagnostic/ks3-maths` — Adaptive diagnostic assessment
- `/learn/ks3-maths` — Practice sessions with stable mastery gating
- `/admin/insight/ks3-maths` — Insight dashboard (admin only)
- `/admin/interventions` — Intervention flags (admin only)

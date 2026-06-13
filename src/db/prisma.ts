import { PrismaClient } from '@prisma/client';

/**
 * Applies optional connection-pool tuning to the database URL.
 *
 * Prisma's default pool is small (num_cpus * 2 + 1), which becomes the
 * bottleneck under live-session load — hundreds of students each querying every
 * couple of seconds queue up waiting for a free connection. Rather than make ops
 * hand-edit the DATABASE_URL query string, expose dedicated env vars:
 *
 *   DATABASE_CONNECTION_LIMIT  max pooled connections per app instance
 *   DATABASE_POOL_TIMEOUT      seconds a query waits for a free connection
 *
 * Returns undefined when nothing is set (or the URL is unusable), so Prisma
 * falls back to its normal handling of DATABASE_URL — i.e. zero behaviour change
 * unless the knobs are explicitly turned. An explicit value already present in
 * the URL is never overridden.
 *
 * See docs/SCALING.md for how to size these against Postgres max_connections.
 */
export function buildDatasourceUrl(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const base = env.DATABASE_URL;
  const limit = env.DATABASE_CONNECTION_LIMIT;
  const timeout = env.DATABASE_POOL_TIMEOUT;
  if (!base || (!limit && !timeout)) return undefined;

  try {
    const url = new URL(base);
    if (limit && !url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', limit);
    }
    if (timeout && !url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', timeout);
    }
    return url.toString();
  } catch {
    // Malformed URL — let Prisma surface its own clearer error.
    return undefined;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const datasourceUrl = buildDatasourceUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

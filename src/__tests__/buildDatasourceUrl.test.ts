import { describe, it, expect } from 'vitest';
import { buildDatasourceUrl } from '@/db/prisma';

const BASE = 'postgresql://ember:ember_secret@localhost:5432/ember';

describe('buildDatasourceUrl', () => {
  it('returns undefined when no pool vars are set (preserves Prisma default)', () => {
    expect(buildDatasourceUrl({ DATABASE_URL: BASE })).toBeUndefined();
  });

  it('returns undefined when DATABASE_URL is absent', () => {
    expect(buildDatasourceUrl({ DATABASE_CONNECTION_LIMIT: '20' })).toBeUndefined();
  });

  it('appends connection_limit when set', () => {
    const url = buildDatasourceUrl({ DATABASE_URL: BASE, DATABASE_CONNECTION_LIMIT: '20' });
    expect(url).toContain('connection_limit=20');
  });

  it('appends pool_timeout when set', () => {
    const url = buildDatasourceUrl({ DATABASE_URL: BASE, DATABASE_POOL_TIMEOUT: '10' });
    expect(url).toContain('pool_timeout=10');
  });

  it('appends both when both are set', () => {
    const url = new URL(
      buildDatasourceUrl({ DATABASE_URL: BASE, DATABASE_CONNECTION_LIMIT: '15', DATABASE_POOL_TIMEOUT: '8' })!,
    );
    expect(url.searchParams.get('connection_limit')).toBe('15');
    expect(url.searchParams.get('pool_timeout')).toBe('8');
  });

  it('never overrides a value already present in the URL', () => {
    const url = buildDatasourceUrl({
      DATABASE_URL: `${BASE}?connection_limit=5`,
      DATABASE_CONNECTION_LIMIT: '20',
    });
    expect(url).toContain('connection_limit=5');
    expect(url).not.toContain('connection_limit=20');
  });

  it('preserves existing query params (e.g. schema, sslmode)', () => {
    const url = new URL(
      buildDatasourceUrl({
        DATABASE_URL: `${BASE}?schema=public&sslmode=require`,
        DATABASE_CONNECTION_LIMIT: '20',
      })!,
    );
    expect(url.searchParams.get('schema')).toBe('public');
    expect(url.searchParams.get('sslmode')).toBe('require');
    expect(url.searchParams.get('connection_limit')).toBe('20');
  });

  it('returns undefined for a malformed URL rather than throwing', () => {
    expect(buildDatasourceUrl({ DATABASE_URL: 'not a url', DATABASE_CONNECTION_LIMIT: '20' })).toBeUndefined();
  });
});

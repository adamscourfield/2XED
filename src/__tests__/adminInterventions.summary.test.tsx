import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const getServerSessionMock = vi.fn();
const redirectMock = vi.fn();
const interventionFindManyMock = vi.fn();
const eventFindManyMock = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/features/auth/authOptions', () => ({ authOptions: {} }));

vi.mock('@/features/config/learningConfig', () => ({
  LEARNING_CONFIG: { defaultSubjectSlug: 'maths' },
}));

vi.mock('@/db/prisma', () => ({
  prisma: {
    interventionFlag: {
      findMany: interventionFindManyMock,
    },
    skillMastery: {
      findUnique: vi.fn(),
    },
    attempt: {
      count: vi.fn(),
    },
    event: {
      findMany: eventFindManyMock,
    },
  },
}));

describe('admin interventions page summary cards', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
    redirectMock.mockReset();
    interventionFindManyMock.mockReset();
    eventFindManyMock.mockReset();

    getServerSessionMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    interventionFindManyMock.mockResolvedValue([]);
  });

  it('shows route A/B/C summary, shadow pass/fail, secure fast-pass, and intervention flagged counts', async () => {
    eventFindManyMock.mockResolvedValue([
      { name: 'diagnostic_route_recommended', payload: { status: 'secure' } },
      { name: 'diagnostic_route_recommended', payload: { route: 'A', status: 'route' } },
      { name: 'diagnostic_route_recommended', payload: { route: 'B', status: 'route' } },
      { name: 'diagnostic_route_recommended', payload: { route: 'B', status: 'route' } },
      { name: 'diagnostic_route_recommended', payload: { route: 'C', status: 'route' } },
      { name: 'shadow_pair_passed', payload: {} },
      { name: 'shadow_pair_passed', payload: {} },
      { name: 'shadow_pair_failed', payload: {} },
      { name: 'intervention_flagged', payload: {} },
      { name: 'intervention_flagged', payload: {} },
      { name: 'intervention_flagged', payload: {} },
    ]);

    const page = await import('@/app/admin/interventions/page');
    const jsx = await page.default();
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain('A: 1 · B: 2 · C: 1');
    expect(html).toContain('Secure fast-pass (7d)');
    expect(html).toContain('>1<');
    expect(html).toContain('Passed: 2 · Failed: 1');
    expect(html).toContain('Interventions flagged (7d)');
    expect(html).toContain('>3<');
  });
});

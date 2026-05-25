import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServerSessionMock = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock('@/features/auth/authOptions', () => ({ authOptions: {} }));

describe('API auth helper', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { requireApiUser } = await import('@/lib/api/auth');

    const result = await requireApiUser(['ADMIN']);

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(401);
  });

  it('rejects authenticated users without an allowed role', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'student-1', role: 'STUDENT' } });
    const { requireApiUser } = await import('@/lib/api/auth');

    const result = await requireApiUser(['ADMIN']);

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  it('returns the session user for an allowed role', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', email: 'a@example.com' } });
    const { requireApiUser } = await import('@/lib/api/auth');

    const result = await requireApiUser(['ADMIN']);

    expect(result.response).toBeNull();
    expect(result.user).toMatchObject({ id: 'admin-1', role: 'ADMIN', email: 'a@example.com' });
  });
});

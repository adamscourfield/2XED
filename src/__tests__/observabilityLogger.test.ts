import { describe, it, expect, vi, afterEach } from 'vitest';
import { logger, captureException } from '@/lib/observability/logger';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logger', () => {
  it('emits a structured JSON line with level, message, and timestamp', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('something happened', { userId: 'u1' });
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.level).toBe('warn');
    expect(payload.message).toBe('something happened');
    expect(payload.context).toEqual({ userId: 'u1' });
    expect(typeof payload.ts).toBe('string');
  });

  it('omits the context key when no context is given', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('plain');
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect('context' in payload).toBe(false);
  });
});

describe('captureException', () => {
  it('logs an error with name, message, and stack', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    captureException(new TypeError('boom'), { route: 'x' });
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.level).toBe('error');
    expect(payload.message).toBe('boom');
    expect(payload.context.errorName).toBe('TypeError');
    expect(payload.context.route).toBe('x');
    expect(typeof payload.context.stack).toBe('string');
  });

  it('coerces non-Error values', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    captureException('just a string');
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.message).toBe('just a string');
  });

  it('never throws, even if logging fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('console is broken');
    });
    expect(() => captureException(new Error('x'))).not.toThrow();
  });
});

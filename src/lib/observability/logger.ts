/**
 * Lightweight structured logging + a single error-capture seam.
 *
 * Today this emits structured JSON lines (which a log aggregator can parse) and
 * routes errors through one function. When you wire up an error tracker
 * (Sentry / Datadog / etc.), `captureException` is the *only* place that needs
 * to change — every error boundary and server catch block already calls it.
 */

export type LogLevel = 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const payload = {
    level,
    message,
    ts: new Date().toISOString(),
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  };
  // Structured single-line JSON so a collector can parse it; falls back to
  // readable console behaviour in dev.
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};

/**
 * Report an exception. The single integration point for an error tracker.
 * Never throws — logging must not break the path that's already failing.
 */
export function captureException(error: unknown, context?: LogContext): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    emit('error', err.message, {
      ...context,
      errorName: err.name,
      stack: err.stack,
    });
    // ── Integration seam ──────────────────────────────────────────────────
    // When an error tracker is added, forward here, e.g.:
    //   Sentry.captureException(err, { extra: context });
  } catch {
    // Swallow — observability must never crash the caller.
  }
}

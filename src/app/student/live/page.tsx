'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

interface SkillMeta {
  id: string;
  code: string;
  name: string;
}

interface SubjectMeta {
  id: string;
  title: string;
  slug: string;
}

interface JoinedSession {
  sessionId: string;
  status: string;
  subject: SubjectMeta;
  skill: SkillMeta | null;
}

interface Item {
  id: string;
  question: string;
  type: string;
  options: unknown;
}

type AppState =
  | { phase: 'join' }
  | { phase: 'waiting'; session: JoinedSession }
  | { phase: 'question'; session: JoinedSession; item: Item }
  | { phase: 'feedback'; session: JoinedSession; correct: boolean; nextItem: Item | null }
  | { phase: 'done'; session: JoinedSession };

export default function StudentLivePage() {
  const { data: authSession, status } = useSession();
  const [joinCode, setJoinCode] = useState('');
  const [appState, setAppState] = useState<AppState>({ phase: 'join' });
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'loading') return <div className="p-8" style={{ color: 'var(--anx-text-muted)' }}>Loading…</div>;
  if (status === 'unauthenticated') {
    redirect('/login');
  }

  const user = authSession?.user as { role?: string } | undefined;
  if (user?.role !== 'STUDENT') {
    redirect('/dashboard');
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/live-sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCode.toUpperCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not join session.');
        return;
      }
      const session: JoinedSession = await res.json();

      if (session.status === 'LOBBY') {
        setAppState({ phase: 'waiting', session });
      } else {
        // Session is already active — fetch first question
        await fetchFirstQuestion(session);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fetchFirstQuestion(session: JoinedSession) {
    // The item serving happens through the attempts response.
    // Show a waiting screen until the teacher starts the session.
    setAppState({ phase: 'waiting', session });
  }

  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (appState.phase !== 'question') return;
    setError(null);
    setLoading(true);

    const { session, item } = appState;
    const skillId = session.skill?.id;
    if (!skillId) {
      setError('No skill associated with this session.');
      setLoading(false);
      return;
    }

    try {
      const start = Date.now();
      const res = await fetch(`/api/live-sessions/${session.sessionId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          skillId,
          answer,
          responseTimeMs: Date.now() - start,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to submit answer.');
        return;
      }

      const result: { correct: boolean; nextItem: Item | null } = await res.json();
      setAnswer('');
      setAppState({
        phase: 'feedback',
        session,
        correct: result.correct,
        nextItem: result.nextItem,
      });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (appState.phase !== 'feedback') return;
    const { session, nextItem } = appState;
    if (!nextItem) {
      setAppState({ phase: 'done', session });
    } else {
      setAppState({ phase: 'question', session, item: nextItem });
    }
  }

  // Render join screen
  if (appState.phase === 'join') {
    return (
      <main className="anx-shell flex items-center justify-center">
        <div className="anx-panel w-full max-w-sm p-8">
          <h1 className="mb-6 text-center text-2xl font-bold" style={{ color: 'var(--anx-text)' }}>Join Live Session</h1>
          {error && (
            <div className="anx-callout-danger mb-4">{error}</div>
          )}
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="joinCode" className="mb-1 block text-sm font-medium" style={{ color: 'var(--anx-text-secondary)' }}>
                Session code
              </label>
              <input
                id="joinCode"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                className="anx-input text-center text-xl font-mono tracking-widest uppercase"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || joinCode.length !== 6}
              className="anx-btn-primary w-full"
            >
              {loading ? 'Joining…' : 'Join'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Waiting for session to start
  if (appState.phase === 'waiting') {
    return (
      <main className="anx-shell flex items-center justify-center">
        <div className="anx-panel w-full max-w-sm p-8 text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <h2 className="mb-2 text-xl font-semibold" style={{ color: 'var(--anx-text)' }}>Waiting for your teacher…</h2>
          <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            You&apos;ve joined <strong>{appState.session.subject.title}</strong>.
            The session will begin shortly.
          </p>
        </div>
      </main>
    );
  }

  // Question screen
  if (appState.phase === 'question') {
    const { item } = appState;
    const opts = Array.isArray(item.options) ? (item.options as string[]) : [];
    return (
      <main className="anx-shell flex items-center justify-center">
        <div className="anx-panel w-full max-w-lg p-8">
          {error && (
            <div className="anx-callout-danger mb-4">{error}</div>
          )}
          <p className="mb-6 text-lg" style={{ color: 'var(--anx-text)' }}>{item.question}</p>
          <form onSubmit={handleAnswer} className="space-y-3">
            {opts.length > 0 ? (
              opts.map((opt) => (
                <label
                  key={opt}
                  className={`anx-option flex cursor-pointer items-center gap-3 ${
                    answer === opt ? 'anx-option-selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={opt}
                    checked={answer === opt}
                    onChange={() => setAnswer(opt)}
                    className="accent-[var(--anx-primary)]"
                  />
                  {opt}
                </label>
              ))
            ) : (
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Your answer…"
                className="anx-input"
                required
              />
            )}
            <button
              type="submit"
              disabled={loading || !answer}
              className="anx-btn-primary mt-2 w-full"
            >
              {loading ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Feedback screen
  if (appState.phase === 'feedback') {
    return (
      <main className="anx-shell flex items-center justify-center">
        <div className="anx-panel w-full max-w-sm p-8 text-center">
          <div className="mb-4 text-5xl">
            {appState.correct ? '✅' : '❌'}
          </div>
          <h2 className="mb-4 text-xl font-bold" style={{ color: appState.correct ? 'var(--anx-success)' : 'var(--anx-danger)' }}>
            {appState.correct ? 'Correct!' : 'Not quite…'}
          </h2>
          <button
            onClick={handleNext}
            className="anx-btn-primary px-6 py-2"
          >
            {appState.nextItem ? 'Next question →' : 'Finish'}
          </button>
        </div>
      </main>
    );
  }

  // Done screen
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-5xl">🎉</div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">All done!</h2>
        <p className="text-sm text-gray-500">You&apos;ve completed all questions for this session.</p>
      </div>
    </main>
  );
}

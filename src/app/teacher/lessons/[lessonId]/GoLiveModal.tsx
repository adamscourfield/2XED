'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TeacherClassroomItem } from '@/app/api/teacher/classrooms/route';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GoLiveModalProps {
  lessonId: string;
  lessonTitle: string;
  subjectId: string;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pluralise(n: number, singular: string) {
  return `${n} ${singular}${n !== 1 ? 's' : ''}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GoLiveModal({ lessonId, lessonTitle, subjectId, onClose }: GoLiveModalProps) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [classrooms, setClassrooms] = useState<TeacherClassroomItem[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Fetch classrooms on mount
  useEffect(() => {
    fetch('/api/teacher/classrooms')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ classrooms: TeacherClassroomItem[] }>;
      })
      .then((data) => {
        setClassrooms(data.classrooms);
        if (data.classrooms.length === 1) {
          setSelectedClassroomId(data.classrooms[0].id);
        }
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoadingClassrooms(false));
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleLaunch = async () => {
    if (!selectedClassroomId) return;
    setLaunching(true);
    setLaunchError(null);

    try {
      const res = await fetch('/api/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: selectedClassroomId,
          subjectId,
          lessonId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const session = await res.json() as { id: string; joinCode: string };
      router.push(`/teacher/live/${session.id}`);
    } catch (e) {
      setLaunchError(e instanceof Error ? e.message : 'Launch failed');
      setLaunching(false);
    }
  };

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="go-live-title"
    >
      {/* Panel */}
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-4 bg-[#10b981] px-6 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M13 10V3L4 14h7v7l9-11h-7Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="go-live-title" className="font-bold text-white">
              Launch live session
            </h2>
            <p className="mt-0.5 truncate text-sm text-white/80">{lessonTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-white/70 transition hover:text-white"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Classroom picker */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Choose a class
            </p>

            {loadingClassrooms && (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-[#f3f4f6]" />
                ))}
              </div>
            )}

            {loadError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                Failed to load classes: {loadError}
              </p>
            )}

            {!loadingClassrooms && !loadError && classrooms.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#e5e7eb] px-4 py-6 text-center">
                <p className="text-sm font-medium text-[#374151]">No classes found</p>
                <p className="mt-1 text-xs text-[#6b7280]">
                  Add a class in Settings to launch live sessions.
                </p>
              </div>
            )}

            {!loadingClassrooms && classrooms.length > 0 && (
              <div className="space-y-2">
                {classrooms.map((cls) => {
                  const selected = selectedClassroomId === cls.id;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClassroomId(cls.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                        selected
                          ? 'border-[#10b981] bg-[#f0fdf4] ring-1 ring-[#10b981]'
                          : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
                      }`}
                    >
                      {/* Radio dot */}
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          selected ? 'border-[#10b981] bg-[#10b981]' : 'border-[#d1d5db]'
                        }`}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#111827]">{cls.name}</p>
                        <p className="text-xs text-[#6b7280]">
                          {cls.yearGroup ? `Year ${cls.yearGroup} · ` : ''}
                          {pluralise(cls.studentCount, 'student')}
                        </p>
                      </div>

                      {selected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#10b981]" aria-hidden>
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* What happens next hint */}
          {selectedClassroomId && !launchError && (
            <div className="flex items-start gap-2 rounded-xl bg-[#f0fdf4] px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-[#059669]" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-xs text-[#065f46]">
                A lobby will open. Students join with the code shown on screen — no app install needed.
              </p>
            </div>
          )}

          {launchError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {launchError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={launching}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6b7280] transition hover:bg-[#f3f4f6] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLaunch}
            disabled={!selectedClassroomId || launching}
            className="inline-flex items-center gap-2 rounded-lg bg-[#10b981] px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#059669] disabled:opacity-50"
          >
            {launching ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                  <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Launching…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M13 10V3L4 14h7v7l9-11h-7Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Launch session
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TeacherClassroomItem } from '@/app/api/teacher/classrooms/route';
import type { LessonBlock } from './LessonBuilder';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GoLiveModalProps {
  lessonId: string;
  lessonTitle: string;
  subjectId: string;
  blocks: LessonBlock[];
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pluralise(n: number, singular: string) {
  return `${n} ${singular}${n !== 1 ? 's' : ''}`;
}

// ─── Pre-flight validation ───────────────────────────────────────────────────

interface CheckItem {
  label: string;
  pass: boolean;
  blocking: boolean; // true = hard block, false = warning only
}

function runValidation(blocks: LessonBlock[]): CheckItem[] {
  const checks: CheckItem[] = [];

  // Must have at least one block with at least one item
  const hasContent = blocks.some((b) => b.items.length > 0);
  checks.push({
    label: 'Lesson has at least one block with content',
    pass: hasContent,
    blocking: true,
  });

  // All CHECK blocks must have a question with a correct answer set
  const checkBlocks = blocks.filter((b) => b.type === 'CHECK');
  const allCheckQuestionsValid = checkBlocks.every((b) => {
    const item = b.items[0];
    if (!item) return false;
    const c = item.content as Record<string, unknown> | null;
    if (!c) return false;
    if (item.answerMode === 'MCQ') {
      // Critical #4: accept both new correctIndex format AND legacy answer text format
      if (c.correctIndex !== undefined && c.correctIndex !== null) return true;
      if (typeof c.answer === 'string' && (c.answer as string).trim() !== '' &&
          Array.isArray(c.options) && (c.options as string[]).includes(c.answer as string)) return true;
      return false;
    }
    if (item.answerMode === 'SHORT_ANSWER') return typeof c.answer === 'string' && (c.answer as string).trim() !== '';
    if (item.answerMode === 'PICK') return Array.isArray(c.correctIndices) && (c.correctIndices as unknown[]).length > 0;
    return true;
  });
  if (checkBlocks.length > 0) {
    checks.push({
      label: 'All Check questions have a correct answer set',
      pass: allCheckQuestionsValid,
      blocking: true,
    });
  }

  // All PRACTICE items must have a correct answer set
  const practiceBlocks = blocks.filter((b) => b.type === 'PRACTICE');
  const allPracticeQuestionsValid = practiceBlocks.every((b) =>
    b.items.every((item) => {
      const c = item.content as Record<string, unknown> | null;
      if (!c) return false;
      if (item.answerMode === 'MCQ') {
        // Critical #4: accept both correctIndex and legacy answer text
        if (c.correctIndex !== undefined && c.correctIndex !== null) return true;
        if (typeof c.answer === 'string' && (c.answer as string).trim() !== '' &&
            Array.isArray(c.options) && (c.options as string[]).includes(c.answer as string)) return true;
        return false;
      }
      if (item.answerMode === 'SHORT_ANSWER') return typeof c.answer === 'string' && (c.answer as string).trim() !== '';
      if (item.answerMode === 'PICK') return Array.isArray(c.correctIndices) && (c.correctIndices as unknown[]).length > 0;
      return true;
    })
  );
  if (practiceBlocks.some((b) => b.items.length > 0)) {
    checks.push({
      label: 'All Practice questions have a correct answer set',
      pass: allPracticeQuestionsValid,
      blocking: true,
    });
  }

  // Warnings (non-blocking): EXPLAIN/MODEL blocks with no items
  const emptyExplainOrModel = blocks.filter(
    (b) => (b.type === 'EXPLAIN' || b.type === 'MODEL') && b.items.length === 0
  );
  if (emptyExplainOrModel.length > 0) {
    checks.push({
      label: `${emptyExplainOrModel.length} Explain/Model block${emptyExplainOrModel.length > 1 ? 's have' : ' has'} no slides yet`,
      pass: false,
      blocking: false,
    });
  }

  return checks;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GoLiveModal({ lessonId, lessonTitle, subjectId, blocks, onClose }: GoLiveModalProps) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [classrooms, setClassrooms] = useState<TeacherClassroomItem[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // UX-1: pre-flight
  const validationChecks = runValidation(blocks);
  const hasBlockingErrors = validationChecks.some((c) => !c.pass && c.blocking);
  const hasWarnings = validationChecks.some((c) => !c.pass && !c.blocking);
  const [overrideWarnings, setOverrideWarnings] = useState(false);
  const showChecklist = validationChecks.length > 0;

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

  const canLaunch =
    !!selectedClassroomId &&
    !launching &&
    !hasBlockingErrors &&
    (!hasWarnings || overrideWarnings);

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
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">

          {/* UX-1: Pre-flight checklist */}
          {showChecklist && (
            <div className="rounded-xl border border-[#e5e7eb] overflow-hidden">
              <div className="border-b border-[#e5e7eb] bg-[#f9fafb] px-4 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Lesson readiness</p>
              </div>
              <ul className="divide-y divide-[#f3f4f6]">
                {validationChecks.map((check, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                    {check.pass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-[#10b981]" aria-hidden>
                        <circle cx="12" cy="12" r="9" fill="#10b981" />
                        <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : check.blocking ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-red-500" aria-hidden>
                        <circle cx="12" cy="12" r="9" fill="#ef4444" />
                        <path d="M12 8v4M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-amber-500" aria-hidden>
                        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <p className={`text-xs ${check.pass ? 'text-[#374151]' : check.blocking ? 'font-medium text-red-700' : 'text-amber-700'}`}>
                      {check.label}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Hard block message */}
              {hasBlockingErrors && (
                <div className="border-t border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-xs font-medium text-red-700">Fix the errors above before launching.</p>
                </div>
              )}

              {/* Warning override */}
              {!hasBlockingErrors && hasWarnings && (
                <div className="border-t border-amber-100 bg-amber-50 px-4 py-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={overrideWarnings}
                      onChange={(e) => setOverrideWarnings(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-400 text-amber-600"
                    />
                    <span className="text-xs font-medium text-amber-800">Launch anyway (some blocks are incomplete)</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Classroom picker — only show once errors are resolved */}
          {!hasBlockingErrors && (
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
          )}

          {/* What happens next hint */}
          {selectedClassroomId && !launchError && !hasBlockingErrors && (
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
            onClick={() => void handleLaunch()}
            disabled={!canLaunch}
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

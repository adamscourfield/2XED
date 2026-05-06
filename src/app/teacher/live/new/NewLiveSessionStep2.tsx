'use client';

import type { Skill, NewLiveSessionState, SkillPlanConfig, CheckSlotDraft, BankItem } from './useNewLiveSession';

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 }) {
  const steps = [
    { n: 1 as const, label: 'Class & skills' },
    { n: 2 as const, label: 'Your lesson' },
  ];
  return (
    <div className="mb-6 flex items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => {
        const active = s.n === current;
        const done   = s.n < current;
        return (
          <div key={s.n} className="flex min-w-0 flex-1 items-center gap-2">
            {i > 0 && <div className="h-px flex-1 bg-[var(--anx-surface-container-high)]" aria-hidden />}
            <div className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
              active ? 'bg-[var(--anx-primary-soft)] text-[var(--anx-primary)] ring-1 ring-[var(--anx-primary)]/25'
              : done  ? 'bg-[var(--anx-success-soft)] text-[var(--anx-success)]'
              :         'bg-[var(--anx-surface-container-low)] text-[var(--anx-text-muted)]'
            }`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: active || done ? 'currentColor' : 'var(--anx-surface-container-high)', color: active || done ? '#fff' : 'var(--anx-text-muted)' }}>
                {done ? '✓' : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Phase toggle button ───────────────────────────────────────────────────────

const PHASE_COLOURS: Record<string, { on: string; off: string }> = {
  blue:    { on: 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm',       off: 'border-[var(--anx-outline-variant)] bg-white text-[var(--anx-text-muted)]' },
  violet:  { on: 'bg-violet-100 border-violet-300 text-violet-800 shadow-sm', off: 'border-[var(--anx-outline-variant)] bg-white text-[var(--anx-text-muted)]' },
  emerald: { on: 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-sm', off: 'border-[var(--anx-outline-variant)] bg-white text-[var(--anx-text-muted)]' },
};

function PhaseToggle({ active, label, sub, colour, onClick }: {
  active: boolean; label: string; sub: string; colour: string; onClick: () => void;
}) {
  const c = PHASE_COLOURS[colour]!;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center rounded-lg border px-2 py-2 text-center text-xs transition-all ${
        active ? `${c.on} font-semibold` : `${c.off} opacity-50 hover:opacity-80`
      }`}
    >
      <span className="font-semibold">{label}</span>
      <span className={`mt-0.5 text-[10px] ${active ? 'opacity-60' : 'opacity-50'}`}>{sub}</span>
    </button>
  );
}

// ── Recommendation badge config ───────────────────────────────────────────────

import type { SkillRecommendation } from '@/components/teacher/ClassSkillDiagnostic';

const REC_BADGE: Record<SkillRecommendation, { label: string; cls: string }> = {
  recap_needed: { label: 'Recap needed', cls: 'bg-red-50 text-red-700' },
  in_progress:  { label: 'In progress',  cls: 'bg-amber-50 text-amber-700' },
  mastered:     { label: 'Mastered',     cls: 'bg-emerald-50 text-emerald-700' },
  not_started:  { label: 'Not started',  cls: 'bg-gray-100 text-gray-500' },
};

// ── Skill plan card ───────────────────────────────────────────────────────────

function SkillPlanCard({ plan, isFirst, isLast, onChange, onMove }: {
  plan: SkillPlanConfig;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<SkillPlanConfig>) => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const badge  = plan.recommendation ? REC_BADGE[plan.recommendation] : null;
  const hasAny = plan.hasExplanation || plan.hasCheck || plan.hasPractice;

  return (
    <div className={`rounded-xl border transition-all ${
      hasAny
        ? 'border-[var(--anx-outline-variant)] bg-[var(--anx-surface-container-low)]'
        : 'border-dashed border-red-200 bg-red-50/40'
    }`}>
      <div className="px-4 py-3.5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 font-mono text-xs font-bold" style={{ color: 'var(--anx-text-muted)' }}>
                {plan.skillCode}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>
                {plan.skillName}
              </span>
            </div>
            {badge && (
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={() => onMove(-1)} disabled={isFirst}
              className="rounded p-1 text-xs disabled:opacity-20 hover:bg-[var(--anx-surface-container-high)]"
              aria-label="Move skill up">↑</button>
            <button type="button" onClick={() => onMove(1)} disabled={isLast}
              className="rounded p-1 text-xs disabled:opacity-20 hover:bg-[var(--anx-surface-container-high)]"
              aria-label="Move skill down">↓</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <PhaseToggle active={plan.hasExplanation} label="Explain"  sub="I Do"    colour="blue"    onClick={() => onChange({ hasExplanation: !plan.hasExplanation })} />
          <PhaseToggle active={plan.hasCheck}       label="Check"    sub="We Do"   colour="violet"  onClick={() => onChange({ hasCheck: !plan.hasCheck })} />
          <PhaseToggle active={plan.hasPractice}    label="Practice" sub="You Do"  colour="emerald" onClick={() => onChange({ hasPractice: !plan.hasPractice })} />
        </div>

        {!hasAny && (
          <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--anx-danger-text)' }}>
            Enable at least one phase for this skill.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Bank item button ──────────────────────────────────────────────────────────

function BankItemButton({ item, skillId, skillsForSubject, onAdd }: {
  item: BankItem;
  skillId: string;
  skillsForSubject: Skill[];
  onAdd: (slot: CheckSlotDraft) => void;
}) {
  return (
    <button type="button"
      onClick={() => onAdd({
        skillId,
        itemId: item.id,
        stemPreview: item.question.slice(0, 80) + (item.question.length > 80 ? '…' : ''),
      })}
      className="max-w-full rounded-lg border px-2 py-1 text-left text-[11px] leading-snug transition hover:bg-[var(--anx-primary-soft)]"
      style={{ borderColor: 'var(--anx-outline-variant)', color: 'var(--anx-text-secondary)' }}
      title={item.question}>
      {item.question.slice(0, 56)}{item.question.length > 56 ? '…' : ''}
    </button>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

interface Props {
  skillsBySubject: Skill[];
  data: NewLiveSessionState;
}

export function NewLiveSessionStep2({ skillsBySubject, data }: Props) {
  const {
    stepEnterClass, setStep, error, loading,
    skillPlans, hasInvalidPlan, updatePlan, moveSkill, handleLaunch,
    doNowShared, doNowSeeding, doNowDifferentiated, doNowPerStudent,
    setDoNowDifferentiated, addToDoNow, removeFromDoNow,
    recentSessions, lastSessionId, setLastSessionId,
    bankBySkill, bankExpanded, bankLoading, setBankExpanded, loadFullBank,
    perStudentLoading, suggestPerStudent,
    subjectId,
  } = data;

  const skillsForSubject = skillsBySubject.filter((s) => s.subjectId === subjectId);

  return (
    <div key="new-live-step-2" className={`anx-new-session-step-enter ${stepEnterClass}`}>
    <div className="anx-card space-y-6 p-6 sm:p-8">
      <StepIndicator current={2} />
      <div>
        <p className="anx-section-label mb-2" style={{ color: 'var(--anx-text-muted)' }}>Your lesson</p>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--anx-text)' }}>
          Plan the flow
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
          Toggle the phases you want for each skill. Ember has suggested a sequence based on where your class currently stands.
        </p>
      </div>

      {error && <div className="anx-callout-danger text-sm">{error}</div>}

      {/* ── Do Now ──────────────────────────────────────────────────────── */}
      <section className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--anx-outline-variant)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--anx-primary)] px-2.5 py-0.5 text-[10px] font-bold text-white tracking-wide">DO NOW</span>
              <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>5–10 min · students work independently on entry</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>
              Entry activity
            </p>
            <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
              {doNowSeeding
                ? 'Preparing questions from prior learning…'
                : doNowShared.length > 0
                  ? `${doNowShared.length} question${doNowShared.length !== 1 ? 's' : ''} queued — students see these automatically on entry.`
                  : 'No questions yet. Questions from skills needing recap will be auto-suggested, or add them below.'}
            </p>
          </div>
          {doNowSeeding && (
            <div className="shrink-0 h-4 w-4 animate-spin rounded-full border-2 border-[var(--anx-primary)] border-t-transparent" aria-hidden />
          )}
        </div>

        {doNowShared.length > 0 && (
          <ol className="m-0 list-decimal space-y-1.5 pl-5 text-sm" style={{ color: 'var(--anx-text)' }}>
            {doNowShared.map((s) => (
              <li key={s.itemId} className="flex items-start gap-2">
                <span className="min-w-0 flex-1 leading-snug">{s.stemPreview}</span>
                <button type="button" onClick={() => removeFromDoNow(s.itemId)}
                  className="shrink-0 text-xs font-medium" style={{ color: 'var(--anx-danger-text)' }}>
                  Remove
                </button>
              </li>
            ))}
          </ol>
        )}

        {recentSessions.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="lastSess" style={{ color: 'var(--anx-text-secondary)' }}>
              Reference last lesson (refines question selection)
            </label>
            <select id="lastSess" value={lastSessionId} onChange={(e) => setLastSessionId(e.target.value)}
              className="anx-input text-sm">
              <option value="">None</option>
              {recentSessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button"
              onClick={() => {
                setBankExpanded((v) => !v);
                if (!bankBySkill.length && !bankLoading) void loadFullBank();
              }}
              className="anx-btn-secondary px-3 py-1.5 text-xs">
              {bankExpanded ? 'Hide question bank' : 'Swap / add questions'}
            </button>
            <button type="button" onClick={() => void suggestPerStudent()}
              disabled={perStudentLoading}
              className="anx-btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
              {perStudentLoading ? 'Building…' : 'Personalise per student'}
            </button>
          </div>

          {doNowDifferentiated && Object.keys(doNowPerStudent).length > 0 && (
            <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              {Object.keys(doNowPerStudent).length} students have a personalised Do Now.
              Others use the shared list above.
            </p>
          )}

          {doNowDifferentiated && (
            <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: 'var(--anx-text-secondary)' }}>
              <input type="checkbox" checked={doNowDifferentiated} onChange={(e) => setDoNowDifferentiated(e.target.checked)} className="accent-[var(--anx-primary)]" />
              Use personalised lists where available
            </label>
          )}
        </div>

        {bankExpanded && (
          <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-low)' }}>
            {bankLoading ? (
              <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>Loading questions…</p>
            ) : bankBySkill.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>No questions found for these skills yet.</p>
            ) : (
              <div className="max-h-48 space-y-3 overflow-y-auto pr-1">
                {bankBySkill.map((row) => {
                  const sk = skillsForSubject.find((s) => s.id === row.skillId);
                  return (
                    <div key={row.skillId}>
                      <p className="mb-1 text-[10px] font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>
                        {sk ? `${sk.code} · ${sk.name}` : row.skillId}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {row.items.map((it) => (
                          <BankItemButton
                            key={it.id}
                            item={it}
                            skillId={row.skillId}
                            skillsForSubject={skillsForSubject}
                            onAdd={addToDoNow}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Lesson body ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>Lesson plan</p>
            <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
              Toggle phases for each skill. Explain → Check → Practice is the suggested sequence.
            </p>
          </div>
          <div className="hidden flex-wrap items-center gap-3 sm:flex">
            {[
              { label: 'Explain',  sub: 'I Do',    colour: 'text-blue-700' },
              { label: 'Check',    sub: 'We Do',   colour: 'text-violet-700' },
              { label: 'Practice', sub: 'You Do',  colour: 'text-emerald-700' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1 text-[10px]">
                <span className={`font-semibold ${l.colour}`}>{l.label}</span>
                <span style={{ color: 'var(--anx-text-muted)' }}>{l.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {skillPlans.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            No skills selected. Go back to choose skills.
          </p>
        ) : (
          <div className="space-y-2">
            {skillPlans
              .slice()
              .sort((a, b) => a.sortIndex - b.sortIndex)
              .map((plan, i) => (
                <SkillPlanCard
                  key={plan.skillId}
                  plan={plan}
                  isFirst={i === 0}
                  isLast={i === skillPlans.length - 1}
                  onChange={(patch) => updatePlan(plan.skillId, patch)}
                  onMove={(dir) => moveSkill(i, dir)}
                />
              ))}
          </div>
        )}

        {hasInvalidPlan && (
          <p className="text-xs" style={{ color: 'var(--anx-danger-text)' }}>
            One or more skills have no phases enabled. Enable at least one phase per skill before launching.
          </p>
        )}
      </section>

      {/* ── Footer actions ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => setStep(1)}
          className="anx-btn-secondary order-2 flex-1 py-3 sm:order-1">
          ← Back to setup
        </button>
        <button type="button" onClick={() => void handleLaunch()}
          disabled={loading || skillPlans.length === 0 || hasInvalidPlan}
          className="anx-btn-primary order-1 flex-1 py-3.5 disabled:opacity-40 sm:order-2">
          {loading ? 'Launching…' : 'Launch lesson →'}
        </button>
      </div>
    </div>
    </div>
  );
}

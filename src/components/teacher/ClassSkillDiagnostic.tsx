'use client';

export type SkillRecommendation = 'recap_needed' | 'in_progress' | 'mastered' | 'not_started';

export type SkillDiagnosticRow = {
  skillId: string;
  code: string;
  name: string;
  strand: string;
  sortOrder: number;
  totalStudents: number;
  studentsWithData: number;
  atRisk: number;
  developing: number;
  durable: number;
  avgMastery: number | null;
  wrongAttemptsLast60Days: number;
  daysSinceLastAttempt: number | null;
  recommendation: SkillRecommendation;
};

interface Props {
  skills: SkillDiagnosticRow[];
  totalStudents: number;
  selectedSkillIds: string[];
  onToggle: (skillId: string) => void;
}

const REC_CONFIG: Record<
  SkillRecommendation,
  { label: string; bg: string; text: string; dot: string; priority: number }
> = {
  recap_needed: {
    label: 'Recap needed',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
    priority: 0,
  },
  in_progress: {
    label: 'In progress',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    priority: 1,
  },
  mastered: {
    label: 'Mastered',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    priority: 3,
  },
  not_started: {
    label: 'Not started',
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-500',
    dot: 'bg-gray-300',
    priority: 2,
  },
};

function MasteryBar({ row }: { row: SkillDiagnosticRow }) {
  const { totalStudents, studentsWithData, atRisk, developing, durable } = row;

  if (totalStudents === 0) {
    return (
      <div className="h-2 w-full rounded-full bg-gray-100" title="No students enrolled" />
    );
  }

  const noData = totalStudents - studentsWithData;
  const toPercent = (n: number) => `${Math.round((n / totalStudents) * 100)}%`;

  return (
    <div className="group relative">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
        {atRisk > 0 && (
          <div
            className="h-full bg-red-400 transition-all"
            style={{ width: toPercent(atRisk) }}
          />
        )}
        {developing > 0 && (
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: toPercent(developing) }}
          />
        )}
        {durable > 0 && (
          <div
            className="h-full bg-emerald-400 transition-all"
            style={{ width: toPercent(durable) }}
          />
        )}
        {noData > 0 && (
          <div
            className="h-full bg-gray-200 transition-all"
            style={{ width: toPercent(noData) }}
          />
        )}
      </div>
      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-44 rounded-lg border border-gray-200 bg-white p-2.5 shadow-lg group-hover:block">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Class breakdown
        </p>
        {[
          { label: 'At risk', count: atRisk, colour: 'bg-red-400' },
          { label: 'Developing', count: developing, colour: 'bg-amber-400' },
          { label: 'Durable', count: durable, colour: 'bg-emerald-400' },
          { label: 'No data', count: noData, colour: 'bg-gray-200' },
        ]
          .filter((r) => r.count > 0)
          .map((r) => (
            <div key={r.label} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className={`inline-block h-2 w-2 rounded-full ${r.colour}`} />
                {r.label}
              </span>
              <span className="font-semibold text-gray-800">
                {r.count}/{totalStudents}
              </span>
            </div>
          ))}
        {row.avgMastery !== null && (
          <p className="mt-1.5 border-t border-gray-100 pt-1.5 text-[11px] text-gray-500">
            Avg mastery:{' '}
            <span className="font-semibold text-gray-700">
              {Math.round(row.avgMastery * 100)}%
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function RecencyBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  if (days <= 7)
    return (
      <span className="text-[10px] text-gray-400" title={`Last attempted ${days}d ago`}>
        {days}d ago
      </span>
    );
  if (days <= 21)
    return (
      <span className="text-[10px] text-amber-500" title={`Last attempted ${days}d ago`}>
        {days}d ago
      </span>
    );
  return (
    <span className="text-[10px] text-red-400" title={`Last attempted ${days}d ago`}>
      {days}d ago
    </span>
  );
}

export function ClassSkillDiagnostic({ skills, totalStudents, selectedSkillIds, onToggle }: Props) {
  if (skills.length === 0) {
    return (
      <p className="py-3 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
        No skills found for this subject.
      </p>
    );
  }

  // Group by strand, preserving strand order from first occurrence
  const strandOrder: string[] = [];
  const byStrand = new Map<string, SkillDiagnosticRow[]>();
  for (const skill of skills) {
    const s = skill.strand || 'General';
    if (!byStrand.has(s)) {
      byStrand.set(s, []);
      strandOrder.push(s);
    }
    byStrand.get(s)!.push(skill);
  }

  // Within each strand sort: recap_needed first, then in_progress, not_started, mastered
  for (const [, rows] of byStrand) {
    rows.sort(
      (a, b) =>
        REC_CONFIG[a.recommendation].priority - REC_CONFIG[b.recommendation].priority,
    );
  }

  // Class-level summary counts
  const recapCount = skills.filter((s) => s.recommendation === 'recap_needed').length;
  const inProgressCount = skills.filter((s) => s.recommendation === 'in_progress').length;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      {totalStudents > 0 && (
        <div className="flex flex-wrap gap-3 rounded-xl border px-4 py-3" style={{ borderColor: 'var(--anx-outline-variant)', background: 'var(--anx-surface-container-low)' }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--anx-text-secondary)' }}>
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            <span className="font-medium" style={{ color: 'var(--anx-text)' }}>{totalStudents}</span> students
          </div>
          {recapCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="font-medium">{recapCount}</span> skill{recapCount !== 1 ? 's' : ''} need recap
            </div>
          )}
          {inProgressCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="font-medium">{inProgressCount}</span> in progress
            </div>
          )}
          {recapCount === 0 && inProgressCount === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Class is in good shape across these skills
            </div>
          )}
        </div>
      )}

      {/* Per-strand skill rows */}
      <div className="max-h-[26rem] space-y-4 overflow-y-auto pr-1">
        {strandOrder.map((strand) => {
          const rows = byStrand.get(strand)!;
          return (
            <div key={strand}>
              <p
                className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--anx-text-muted)' }}
              >
                {strand}
              </p>
              <div className="space-y-1">
                {rows.map((skill) => {
                  const selected = selectedSkillIds.includes(skill.skillId);
                  const rec = REC_CONFIG[skill.recommendation];
                  return (
                    <label
                      key={skill.skillId}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                        selected
                          ? 'border-[var(--anx-primary)] bg-[var(--anx-primary-soft)] ring-1 ring-[var(--anx-primary)]/20'
                          : `border-transparent ${rec.bg} hover:border-[var(--anx-outline-variant)]`
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggle(skill.skillId)}
                        className="mt-0.5 accent-[var(--anx-primary)]"
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-baseline gap-2">
                            <span
                              className="shrink-0 font-mono text-xs font-bold"
                              style={{ color: selected ? 'var(--anx-primary)' : 'var(--anx-text-muted)' }}
                            >
                              {skill.code}
                            </span>
                            <span
                              className="truncate text-sm font-medium"
                              style={{ color: selected ? 'var(--anx-primary)' : 'var(--anx-text)' }}
                            >
                              {skill.name}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <RecencyBadge days={skill.daysSinceLastAttempt} />
                            <span
                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${rec.text}`}
                              style={{
                                background: selected ? 'rgba(255,255,255,0.5)' : undefined,
                              }}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${rec.dot}`} />
                              {rec.label}
                            </span>
                          </div>
                        </div>
                        {skill.totalStudents > 0 ? (
                          <MasteryBar row={skill} />
                        ) : null}
                        {skill.wrongAttemptsLast60Days > 0 && (
                          <p className="text-[10px]" style={{ color: 'var(--anx-text-muted)' }}>
                            {skill.wrongAttemptsLast60Days} wrong attempt{skill.wrongAttemptsLast60Days !== 1 ? 's' : ''} in class (last 60 days)
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  subject: { id: string; title: string; slug: string };
  skill: { id: string; code: string; name: string; strand: string };
  item: { id: string; question: string; options: string[] };
  sessionId: string;
  itemsSeen: number;
  maxItems: number;
  subjectSlug: string;
}

export function DiagnosticRunClient({ subject, skill, item, sessionId, itemsSeen, maxItems, subjectSlug }: Props) {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function submitAnswer() {
    if (!selectedAnswer || submitting) return;
    setSubmitting(true);

    await fetch(`/api/diagnostic/${subjectSlug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        itemId: item.id,
        skillId: skill.id,
        subjectId: subject.id,
        skillCode: skill.code,
        strand: skill.strand,
        answer: selectedAnswer,
      }),
    });

    router.refresh();
    router.push(`/diagnostic/${subjectSlug}/run`);
  }

  return (
    <main className="anx-shell flex items-center justify-center">
      <div className="anx-panel w-full max-w-2xl space-y-6 p-7 sm:p-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Diagnostic · <span className="font-medium text-slate-700">{skill.strand}</span>
          </p>
          <span className="text-sm text-slate-500">
            {itemsSeen + 1} / {maxItems} max
          </span>
        </div>

        <div className="anx-progress-track">
          <div className="anx-progress-bar" style={{ width: `${((itemsSeen + 1) / maxItems) * 100}%` }} />
        </div>

        <h2 className="text-xl font-semibold leading-snug text-slate-900">{item.question}</h2>
        <p className="text-xs text-slate-500">
          {subject.title} · {skill.code} {skill.name ? `· ${skill.name}` : ''}
        </p>

        <div className="space-y-3">
          {item.options.map((option, i) => (
            <button
              key={i}
              onClick={() => setSelectedAnswer(option)}
              className={`anx-option ${selectedAnswer === option ? 'anx-option-selected' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>

        <button onClick={submitAnswer} disabled={!selectedAnswer || submitting} className="anx-btn-primary w-full">
          {submitting ? 'Submitting…' : 'Next'}
        </button>
      </div>
    </main>
  );
}

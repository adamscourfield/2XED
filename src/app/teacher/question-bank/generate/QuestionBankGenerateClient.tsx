'use client';

import { useState } from 'react';

export function QuestionBankGenerateClient() {
  const [prompt, setPrompt] = useState('');
  const [yearGroup, setYearGroup] = useState('7');
  const [style, setStyle] = useState('mixed');

  return (
    <div className="anx-card space-y-5 p-6">
      <div className="space-y-2">
        <label htmlFor="ai-topic" className="text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
          Topic or learning objective
        </label>
        <textarea
          id="ai-topic"
          className="anx-input min-h-[120px] w-full resize-y text-sm"
          placeholder="e.g. Year 7 — expanding single brackets with a negative coefficient"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <p className="m-0 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
          You can draft your prompt here now; the server will use it once generation is connected.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
            Year group
          </span>
          <select className="anx-input w-full cursor-pointer text-sm" value={yearGroup} onChange={(e) => setYearGroup(e.target.value)}>
            <option value="7">Year 7</option>
            <option value="8">Year 8</option>
            <option value="9">Year 9</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium" style={{ color: 'var(--anx-text)' }}>
            Question style
          </span>
          <select className="anx-input w-full cursor-pointer text-sm" value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="mixed">Mixed types</option>
            <option value="mc">Multiple choice</option>
            <option value="short">Short answer</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="button" className="anx-btn-primary px-5 py-2.5 text-sm opacity-60" disabled aria-disabled="true">
          Generate questions
        </button>
        <p className="m-0 self-center text-sm" style={{ color: 'var(--anx-text-muted)' }}>
          Generation is not connected yet.
        </p>
      </div>
    </div>
  );
}

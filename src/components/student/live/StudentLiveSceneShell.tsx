'use client';

import type { ReactNode } from 'react';

/** Wraps one student live “scene” so top-level phase swaps share fade + slide enter (`globals.css`). */
export function StudentLiveSceneShell({ sceneKey, children }: { sceneKey: string; children: ReactNode }) {
  return (
    <div key={sceneKey} className="anx-student-live-scene flex min-h-0 flex-1 flex-col overflow-auto">
      {children}
    </div>
  );
}

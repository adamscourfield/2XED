'use client';

import { ClearIcon, DotsIcon, LockIcon, PauseIcon, PlayIcon, ScreensIcon } from './icons';

interface Props {
  paused: boolean;
  onTogglePause: () => void;
  onStudentsView: () => void;
  onLockScreens: () => void;
  onClearBoard: () => void;
  onMore?: () => void;
  screensLocked?: boolean;
}

export function TeacherBottomBar({
  paused,
  onTogglePause,
  onStudentsView,
  onLockScreens,
  onClearBoard,
  onMore,
  screensLocked,
}: Props) {
  return (
    <div className={`anx-workspace-bottombar${paused ? ' anx-workspace-bottombar--paused' : ''}`}>
      <button type="button" className="anx-workspace-bottombar-btn" onClick={onTogglePause}>
        {paused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button type="button" className="anx-workspace-bottombar-btn" onClick={onStudentsView}>
        <ScreensIcon size={16} />
        Students view
      </button>
      <button
        type="button"
        className="anx-workspace-bottombar-btn"
        onClick={onLockScreens}
        aria-pressed={screensLocked}
      >
        <LockIcon size={16} />
        {screensLocked ? 'Unlock screens' : 'Lock screens'}
      </button>
      <button
        type="button"
        className="anx-workspace-bottombar-btn"
        onClick={onClearBoard}
        data-tone="danger"
      >
        <ClearIcon size={16} />
        Clear board
      </button>
      <button type="button" className="anx-workspace-bottombar-btn ml-auto" onClick={onMore}>
        <DotsIcon size={16} />
        More
      </button>
    </div>
  );
}

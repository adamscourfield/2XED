import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

const base = (children: ReactNode, { size = 18, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {children}
  </svg>
);

export const PenIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M16.5 3.5l4 4-12 12H4.5v-4l12-12z" />
      <path d="M14 6l4 4" />
    </>,
    p,
  );

export const HighlighterIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M9 14l6-6 4 4-6 6H7l-1-2 3-2z" />
      <path d="M5 21h14" />
    </>,
    p,
  );

export const EraserIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M3 17l8-8 7 7-5 5H6z" />
      <path d="M9 21h12" />
    </>,
    p,
  );

export const ShapeIcon = (p: IconProps = {}) =>
  base(
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <circle cx="17" cy="17" r="4.5" />
    </>,
    p,
  );

export const TextIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M5 5h14" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </>,
    p,
  );

export const ImageIcon = (p: IconProps = {}) =>
  base(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-7 7" />
    </>,
    p,
  );

export const PointerIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M5 3l6 16 2.5-6.5L20 10z" />
    </>,
    p,
  );

export const SelectIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M5 3v4M5 17v4M3 5h4M3 19h4M17 3v4M17 17v4M19 5h2M19 19h2" />
      <path d="M9 9h6v6H9z" strokeDasharray="2 2" />
    </>,
    p,
  );

export const UndoIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M9 14l-5-5 5-5" />
      <path d="M4 9h9a6 6 0 0 1 0 12h-3" />
    </>,
    p,
  );

export const RedoIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9h-9a6 6 0 0 0 0 12h3" />
    </>,
    p,
  );

export const PauseIcon = (p: IconProps = {}) =>
  base(
    <>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </>,
    p,
  );

export const PlayIcon = (p: IconProps = {}) =>
  base(<path d="M7 4l13 8-13 8z" />, p);

export const ScreensIcon = (p: IconProps = {}) =>
  base(
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>,
    p,
  );

export const LockIcon = (p: IconProps = {}) =>
  base(
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>,
    p,
  );

export const ClearIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
    </>,
    p,
  );

export const DotsIcon = (p: IconProps = {}) =>
  base(
    <>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </>,
    p,
  );

export const InviteIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M16 11V7a4 4 0 0 0-8 0v4" />
      <path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      <path d="M19 6v6M16 9h6" />
    </>,
    p,
  );

export const SettingsIcon = (p: IconProps = {}) =>
  base(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
    p,
  );

export const CheckIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="9" />
    </>,
    p,
  );

export const ModelIcon = (p: IconProps = {}) =>
  base(
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>,
    p,
  );

export const ExplainIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M12 3a7 7 0 0 0-4 12.7V18h8v-2.3A7 7 0 0 0 12 3z" />
      <path d="M9 21h6" />
    </>,
    p,
  );

export const PracticeIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M4 19l6-6 4 4 6-8" />
      <path d="M14 17l4 0M18 17v-4" />
    </>,
    p,
  );

export const SparkleIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8" />
    </>,
    p,
  );

export const ChevronRightIcon = (p: IconProps = {}) =>
  base(<path d="M9 6l6 6-6 6" />, p);

export const HelpIcon = (p: IconProps = {}) =>
  base(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </>,
    p,
  );

export const SmileyOkIcon = (p: IconProps = {}) =>
  base(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14h8" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" />
    </>,
    p,
  );

export const SmileyHappyIcon = (p: IconProps = {}) =>
  base(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 13a4 4 0 0 0 8 0" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" />
    </>,
    p,
  );

export const SmileySadIcon = (p: IconProps = {}) =>
  base(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 15a4 4 0 0 1 8 0" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" />
    </>,
    p,
  );

export const MessageIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M4 5h16v11H8l-4 4z" />
    </>,
    p,
  );

export const TipIcon = (p: IconProps = {}) =>
  base(
    <>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10c1 1 1.5 2 1.5 4h5c0-2 .5-3 1.5-4a6 6 0 0 0-4-10z" />
    </>,
    p,
  );

export const PeopleIcon = (p: IconProps = {}) =>
  base(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20a7 7 0 0 1 14 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M22 19a5 5 0 0 0-5-5" />
    </>,
    p,
  );

import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  /** Visual emphasis. 'plain' drops the card chrome for a bare container. */
  as?: 'section' | 'div' | 'article';
}

/**
 * The standard surface container. Wraps the `.anx-card` token so card chrome
 * lives in one place instead of being hand-rolled across 30+ components.
 */
export function Card({ children, className = '', as = 'div' }: Props) {
  const Tag = as;
  return <Tag className={`anx-card ${className}`.trim()}>{children}</Tag>;
}

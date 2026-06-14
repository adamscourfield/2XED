import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'anx-btn-primary',
  secondary: 'anx-btn-secondary',
};

/**
 * Standard button wrapping the `.anx-btn-*` tokens, so the variant + disabled
 * handling lives in one place. Spreads through native button props (onClick,
 * type, disabled, aria-*).
 */
export function Button({ variant = 'primary', className = '', type = 'button', children, ...rest }: Props) {
  return (
    <button type={type} className={`${VARIANT_CLASS[variant]} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

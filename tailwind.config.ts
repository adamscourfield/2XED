import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        /* CSS variable aliases (aligned with Anaxi) */
        bg:           'var(--anx-bg)',
        surface:      'var(--anx-surface)',
        text:         'var(--anx-text)',
        muted:        'var(--anx-text-muted)',
        border:       'var(--anx-border)',
        divider:      'var(--anx-divider)',
        accent:       'var(--anx-primary)',
        accentHover:  'var(--anx-primary-hover)',
        success:      'var(--anx-success)',
        warning:      'var(--anx-warning)',
        error:        'var(--anx-danger)',
        borderHover:  'var(--anx-border-hover)',
        accentSurface:'var(--anx-primary-soft)',

        /* Brand palette — direct values (aligned with Anaxi) */
        coral:  '#fe9f9f',
        blue:   '#6366f1',
        amber:  '#fdc683',
      },
      borderRadius: {
        lg: 'var(--anx-radius)',
        md: 'var(--anx-radius-sm)',
      },
      boxShadow: {
        sm: 'var(--anx-shadow-sm)',
        md: 'var(--anx-shadow-md)',
        lg: 'var(--anx-shadow-lg)',
        xl: 'var(--anx-shadow-xl)',
      },
      transitionTimingFunction: {
        calm: 'cubic-bezier(0,0,0.2,1)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '220': '220ms',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1.4' }],
        'xs':  ['0.75rem',   { lineHeight: '1.4',  letterSpacing: '0.01em' }],
        'sm':  ['0.875rem',  { lineHeight: '1.5',  letterSpacing: '0.005em' }],
        'base':['1rem',      { lineHeight: '1.6' }],
        'lg':  ['1.125rem',  { lineHeight: '1.5',  letterSpacing: '-0.01em' }],
        'xl':  ['1.25rem',   { lineHeight: '1.4',  letterSpacing: '-0.015em' }],
        '2xl': ['1.5rem',    { lineHeight: '1.3',  letterSpacing: '-0.02em' }],
      },
    },
  },
  plugins: [],
};
export default config;

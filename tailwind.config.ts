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
        sans:      ['var(--font-manrope)', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display:   ['var(--font-jakarta)', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        /* Surface hierarchy — 2XED */
        surface:                   'var(--anx-surface)',
        'surface-bright':          'var(--anx-surface-bright)',
        'surface-container-low':   'var(--anx-surface-container-low)',
        'surface-container':       'var(--anx-surface-container)',
        'surface-container-high':  'var(--anx-surface-container-high)',
        'surface-container-highest':'var(--anx-surface-container-highest)',
        'surface-container-lowest':'var(--anx-surface-container-lowest)',
        'surface-hover':           'var(--anx-surface-hover)',

        /* Primary — Electric Aura */
        primary:            'var(--anx-primary)',
        'primary-container':'var(--anx-primary-container)',
        'on-primary':       'var(--anx-on-primary)',

        /* Secondary - Energetic Pulse */
        secondary:              'var(--anx-secondary)',
        'secondary-container':  'var(--anx-secondary-container)',

        /* Tertiary — Secure/Emerald */
        tertiary:                 'var(--anx-tertiary)',
        'tertiary-container':     'var(--anx-tertiary-container)',
        'on-tertiary-container':  'var(--anx-on-tertiary-container)',

        /* Text */
        'on-surface':         'var(--anx-on-surface)',
        'on-surface-variant': 'var(--anx-on-surface-variant)',

        /* Ghost borders */
        outline:         'var(--anx-outline)',
        'outline-variant':'var(--anx-outline-variant)',

        /* Legacy aliases */
        bg:           'var(--anx-surface)',
        text:         'var(--anx-on-surface)',
        muted:        'var(--anx-text-muted)',
        border:       'var(--anx-ghost-border)',
        divider:      'var(--anx-surface-container-low)',
        accent:       'var(--anx-primary)',
        accentHover:  'var(--anx-primary-hover)',
        success:      'var(--anx-tertiary)',
        warning:      'var(--anx-warning)',
        error:        'var(--anx-danger)',
        borderHover:  'var(--anx-border-hover)',
        accentSurface:'var(--anx-primary-soft)',

        /* Status colors */
        coral: '#b41340',
        amber: '#f74b6d',
      },
      borderRadius: {
        /* Design system: xs 8 / sm 12 / lg 16 / xl 24 / full pill */
        full: '9999px',
        xl: '1.5rem',
        lg: '1rem',
        sm: '0.75rem',
        xs: '0.5rem',
      },
      boxShadow: {
        float: '0 20px 40px rgba(4, 14, 31, 0.06)',
        diffused: '0 20px 40px rgba(4, 14, 31, 0.06)',
        sm:    '0 8px 32px rgba(4, 14, 31, 0.04)',
        md:    '0 12px 36px rgba(4, 14, 31, 0.05)',
        lg:    '0 20px 40px rgba(4, 14, 31, 0.06)',
        xl:    '0 24px 48px rgba(4, 14, 31, 0.06)',
      },
      transitionTimingFunction: {
        calm: 'cubic-bezier(0,0,0.2,1)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '220': '220ms',
      },
      spacing: {
        /* Design scale: 2→8px … 8→32px; page margins via CSS vars */
        2: 'var(--anx-space-2)',
        3: 'var(--anx-space-3)',
        4: 'var(--anx-space-4)',
        6: 'var(--anx-space-6)',
        8: 'var(--anx-space-8)',
        16: 'var(--anx-spacing-16)',
        24: 'var(--anx-spacing-24)',
        'left-pg': '80px',
        'right-pg': '120px',
        '16-pg': 'var(--anx-spacing-16)',
        '24-pg': 'var(--anx-spacing-24)',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1.4' }],
        'xs':  ['0.75rem',   { lineHeight: '1.4',  letterSpacing: '0.01em' }],
        'sm':  ['0.875rem',  { lineHeight: '1.5',  letterSpacing: '0.005em' }],
        'base':['1rem',      { lineHeight: '1.6' }],
        'body-lg':['1rem',    { lineHeight: '1.6' }],
        'lg':  ['1.125rem',  { lineHeight: '1.5',  letterSpacing: '-0.01em' }],
        'xl':  ['1.25rem',   { lineHeight: '1.4',  letterSpacing: '-0.015em' }],
        '2xl': ['1.5rem',    { lineHeight: '1.3',  letterSpacing: '-0.02em' }],
        'display-sm': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        'display-lg': ['3.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'label-md': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.05em' }],
      },
    },
  },
  plugins: [],
};
export default config;

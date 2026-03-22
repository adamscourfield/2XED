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
        sans:      ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif:     ['var(--font-newsreader)', 'Newsreader', 'Georgia', 'serif'],
        newsreader:['var(--font-newsreader)', 'Newsreader', 'Georgia', 'serif'],
      },
      colors: {
        /* Surface hierarchy — Modern Academic Ledger */
        surface:                   'var(--anx-surface)',
        'surface-bright':          'var(--anx-surface-bright)',
        'surface-container-low':   'var(--anx-surface-container-low)',
        'surface-container':       'var(--anx-surface-container)',
        'surface-container-high':  'var(--anx-surface-container-high)',
        'surface-container-highest':'var(--anx-surface-container-highest)',
        'surface-container-lowest':'var(--anx-surface-container-lowest)',

        /* Primary — Deep Slate */
        primary:            'var(--anx-primary)',
        'primary-container':'var(--anx-primary-container)',
        'on-primary':       'var(--anx-on-primary)',

        /* Secondary */
        secondary:              'var(--anx-secondary)',
        'secondary-container':  'var(--anx-secondary-container)',

        /* Tertiary — Coral (surgical precision) */
        tertiary:                 'var(--anx-tertiary)',
        'tertiary-container':     'var(--anx-tertiary-container)',
        'on-tertiary-container':  'var(--anx-on-tertiary-container)',

        /* Text */
        'on-surface':         'var(--anx-on-surface)',
        'on-surface-variant': 'var(--anx-on-surface-variant)',

        /* Ghost borders */
        outline:         'var(--anx-outline)',
        'outline-variant':'var(--anx-outline-variant)',

        /* Legacy aliases (aligned with Anaxi) */
        bg:           'var(--anx-bg)',
        text:         'var(--anx-on-surface)',
        muted:        'var(--anx-text-muted)',
        border:       'var(--anx-ghost-border)',
        divider:      'var(--anx-surface-container-low)',
        accent:       'var(--anx-primary)',
        accentHover:  'var(--anx-primary-hover)',
        success:      'var(--anx-success)',
        warning:      'var(--anx-warning)',
        error:        'var(--anx-danger)',
        borderHover:  'var(--anx-border-hover)',
        accentSurface:'var(--anx-primary-soft)',

        /* Brand palette — direct values */
        coral: '#fe9f9f',
        amber: '#fdc683',
      },
      borderRadius: {
        xl: '1.5rem',   /* 24px — large containers */
        lg: '1.5rem',   /* alias */
        md: '0.75rem',  /* 12px — internal components */
        sm: '0.75rem',  /* alias */
      },
      boxShadow: {
        float: 'var(--anx-shadow-float)',
        sm:    'var(--anx-shadow-sm)',
        md:    'var(--anx-shadow-md)',
        lg:    'var(--anx-shadow-lg)',
        xl:    'var(--anx-shadow-xl)',
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
        /* Institutional Calm page margins */
        '16-pg': 'var(--anx-spacing-16)',
        '24-pg': 'var(--anx-spacing-24)',
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

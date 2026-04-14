import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg:             'rgb(var(--bg) / <alpha-value>)',
        surface:        'rgb(var(--surface) / <alpha-value>)',
        'surface-2':    'rgb(var(--surface-2) / <alpha-value>)',
        border:         'rgb(var(--border) / <alpha-value>)',
        accent:         'rgb(var(--accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        'accent-light': 'rgb(var(--accent-light) / <alpha-value>)',
        muted:          'rgb(var(--muted) / <alpha-value>)',
        text:           'rgb(var(--text) / <alpha-value>)',
        'text-sub':     'rgb(var(--text-sub) / <alpha-value>)',
        success:        'rgb(var(--success) / <alpha-value>)',
        warning:        'rgb(var(--warning) / <alpha-value>)',
        error:          'rgb(var(--error) / <alpha-value>)',
        amber:          'rgb(var(--amber) / <alpha-value>)',
        // Sidebar always dark
        sidebar:        '#111827',
        'sidebar-hover':'#1f2937',
        'sidebar-active':'#1b7a4a',
        'sidebar-text': '#9ca3af',
        'sidebar-text-active': '#ffffff',
      },
      borderRadius: {
        card: '12px',
        btn:  '8px',
        chip: '24px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        md:   '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        lg:   '0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [
    // scrollbar-none utility
    function({ addUtilities }: { addUtilities: (u: Record<string, unknown>) => void }) {
      addUtilities({
        '.scrollbar-none': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      })
    },
  ],
}
export default config

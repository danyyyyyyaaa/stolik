import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg:             'rgb(var(--bg)           / <alpha-value>)',
        surface:        'rgb(var(--surface)      / <alpha-value>)',
        'surface-2':    'rgb(var(--surface-2)    / <alpha-value>)',
        border:         'rgb(var(--border)       / <alpha-value>)',
        accent:         'rgb(var(--accent)       / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        muted:          'rgb(var(--muted)        / <alpha-value>)',
        text:           'rgb(var(--text)         / <alpha-value>)',
      },
    },
  },
  plugins: [],
}

export default config

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#131A14',
        surface: '#1C2B1E',
        border:  '#2A3D2C',
        accent:  '#2D6A35',
        'accent-hover': '#378040',
        muted:   '#6B8F6E',
        text:    '#E8F0E9',
      },
    },
  },
  plugins: [],
}

export default config

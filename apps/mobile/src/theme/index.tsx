import React, { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'

export type ThemeKey = 'dark' | 'light'

export interface ThemeColors {
  bg:             string
  bgCard:         string
  bgCardAlt:      string
  border:         string
  text:           string
  textSub:        string
  textMuted:      string
  accent:         string
  accentText:     string
  accentBg:       string
  pill:           string
  pillActive:     string
  pillActiveText: string
  navBg:          string
  navBorder:      string
  inputBg:        string
  inputBorder:    string
  success:        string
  error:          string
  statusBar:      'light-content' | 'dark-content'
}

export const themes: Record<ThemeKey, ThemeColors> = {
  dark: {
    bg:             '#0D1117',
    bgCard:         '#161B22',
    bgCardAlt:      '#21262D',
    border:         'rgba(240,246,252,0.1)',
    text:           '#E6EDF3',
    textSub:        '#8B949E',
    textMuted:      '#6E7681',
    accent:         '#238636',
    accentText:     '#3FB950',
    accentBg:       'rgba(35,134,54,0.15)',
    pill:           '#21262D',
    pillActive:     '#238636',
    pillActiveText: '#FFFFFF',
    navBg:          '#0D1117',
    navBorder:      'rgba(240,246,252,0.08)',
    inputBg:        '#0D1117',
    inputBorder:    'rgba(240,246,252,0.15)',
    success:        '#238636',
    error:          '#F85149',
    statusBar:      'light-content',
  },
  light: {
    bg:             '#F6F8FA',
    bgCard:         '#FFFFFF',
    bgCardAlt:      '#F6F8FA',
    border:         'rgba(31,35,40,0.12)',
    text:           '#1F2328',
    textSub:        '#656D76',
    textMuted:      '#9198A1',
    accent:         '#1A7F37',
    accentText:     '#1A7F37',
    accentBg:       'rgba(26,127,55,0.08)',
    pill:           '#EFF1F3',
    pillActive:     '#1A7F37',
    pillActiveText: '#FFFFFF',
    navBg:          '#FFFFFF',
    navBorder:      'rgba(31,35,40,0.08)',
    inputBg:        '#FFFFFF',
    inputBorder:    'rgba(31,35,40,0.2)',
    success:        '#1A7F37',
    error:          '#CF222E',
    statusBar:      'dark-content',
  },
}

interface ThemeCtx {
  themeKey: ThemeKey
  th:       ThemeColors
  toggle:   () => void
  setTheme: (k: ThemeKey) => void
}

const ThemeContext = createContext<ThemeCtx>({
  themeKey: 'dark',
  th:       themes.dark,
  toggle:   () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setKey] = useState<ThemeKey>('dark')

  useEffect(() => {
    SecureStore.getItemAsync('stolik_theme')
      .then(v => { if (v === 'dark' || v === 'light') setKey(v) })
      .catch(() => {})
  }, [])

  function setTheme(k: ThemeKey) {
    setKey(k)
    SecureStore.setItemAsync('stolik_theme', k).catch(() => {})
  }

  return (
    <ThemeContext.Provider value={{
      themeKey,
      th:      themes[themeKey],
      toggle:  () => setTheme(themeKey === 'dark' ? 'light' : 'dark'),
      setTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

import React, { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import { colors, fontFamilies, fontSizes, radii, shadows, spacing } from './tokens'

export type ThemeKey = 'dark' | 'light'

export interface ThemeColors {
  // Surfaces
  bg:             string
  bgCard:         string
  bgCardAlt:      string
  border:         string
  // Text
  text:           string
  textSub:        string
  textMuted:      string
  // Brand
  accent:         string
  accentLight:    string
  accentText:     string
  accentBg:       string
  secondary:      string
  // Pills / chips
  pill:           string
  pillActive:     string
  pillActiveText: string
  // Nav
  navBg:          string
  navBorder:      string
  // Inputs
  inputBg:        string
  inputBorder:    string
  // Semantic
  success:        string
  warning:        string
  error:          string
  // Status bar
  statusBar:      'light-content' | 'dark-content'
}

export const themes: Record<ThemeKey, ThemeColors> = {
  light: {
    bg:             colors.background,
    bgCard:         colors.surface,
    bgCardAlt:      colors.surfaceDark,
    border:         colors.borderLight,
    text:           colors.textPrimary,
    textSub:        colors.textSecondary,
    textMuted:      '#9CA3AF',
    accent:         colors.primary,
    accentLight:    colors.primaryLight,
    accentText:     colors.primaryAccent,
    accentBg:       'rgba(82,183,136,0.12)',
    secondary:      colors.secondary,
    pill:           colors.surfaceDark,
    pillActive:     colors.primary,
    pillActiveText: '#FFFFFF',
    navBg:          colors.surface,
    navBorder:      'rgba(0,0,0,0)',
    inputBg:        colors.surface,
    inputBorder:    colors.borderLight,
    success:        colors.success,
    warning:        colors.warning,
    error:          colors.error,
    statusBar:      'dark-content',
  },
  dark: {
    bg:             colors.backgroundDark,
    bgCard:         colors.surfaceDarkMode,
    bgCardAlt:      colors.surfaceDark2,
    border:         colors.borderDark,
    text:           colors.textInverse,
    textSub:        '#9CA3AF',
    textMuted:      '#6B7280',
    accent:         colors.primaryAccent,
    accentLight:    colors.primaryLight,
    accentText:     colors.primaryAccent,
    accentBg:       'rgba(82,183,136,0.15)',
    secondary:      colors.secondary,
    pill:           colors.surfaceDark2,
    pillActive:     colors.primaryAccent,
    pillActiveText: '#0F1410',
    navBg:          '#0A0F0B',
    navBorder:      'rgba(0,0,0,0)',
    inputBg:        colors.surfaceDarkMode,
    inputBorder:    colors.borderDark,
    success:        colors.success,
    warning:        colors.warning,
    error:          colors.error,
    statusBar:      'light-content',
  },
}

// Re-export tokens so consumers import everything from theme
export { colors, fontFamilies, fontSizes, radii, shadows, spacing }

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

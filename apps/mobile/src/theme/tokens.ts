// ─── Stolik Design Tokens ────────────────────────────────────────────────────
// "Warm minimalism" — clean forms + warm palette + restaurant atmosphere

export const colors = {
  // Brand
  primary:        '#1B4332',
  primaryLight:   '#2D6A4F',
  primaryAccent:  '#52B788',
  secondary:      '#D4A574',

  // Light mode surfaces
  background:     '#FAFAF7',
  surface:        '#FFFFFF',
  surfaceDark:    '#F5F2ED',

  // Dark mode surfaces
  backgroundDark: '#0F1410',
  surfaceDarkMode: '#1A2420',
  surfaceDark2:   '#243020',

  // Text
  textPrimary:    '#1A1A1A',
  textSecondary:  '#6B7280',
  textInverse:    '#F5F2ED',

  // Semantic
  success:        '#059669',
  warning:        '#D97706',
  error:          '#DC2626',

  // Borders
  borderLight:    '#F0EDE8',
  borderDark:     'rgba(255,255,255,0.08)',

  // Overlay
  overlay:        'rgba(0,0,0,0.4)',
} as const

export const shadows = {
  sm: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius:  3,
    elevation:     1,
  },
  md: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     3,
  },
  lg: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius:  16,
    elevation:     6,
  },
  xl: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius:  24,
    elevation:     10,
  },
} as const

export const radii = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
} as const

export const fontSizes = {
  h1:      28,
  h2:      20,
  h3:      16,
  body:    14,
  caption: 12,
  tiny:    10,
} as const

// Font family names — loaded via @expo-google-fonts
export const fontFamilies = {
  serif:         'DMSerifDisplay_400Regular',
  sans:          'PlusJakartaSans_400Regular',
  sansMedium:    'PlusJakartaSans_500Medium',
  sansSemiBold:  'PlusJakartaSans_600SemiBold',
  sansBold:      'PlusJakartaSans_700Bold',
} as const

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const

# Rules for apps/mobile/**/*.tsx

## Navigation
- Expo Router file-based routing
- Auth group: `/(auth)/` — auth-choice, login, register, onboarding
- Main group: `/(tabs)/` — home, search, map, bookings, profile
- Modal routes: `/restaurant/[id]`, `/booking/[restaurantId]`, `/confirmed`

## State management
- Zustand for app state (auth, bookings, settings)
- SecureStore for JWT tokens (NEVER AsyncStorage for tokens)
- AsyncStorage for non-sensitive preferences (language, onboardingCompleted)

## API calls
- Base URL from env: `process.env.EXPO_PUBLIC_API_URL`
- Always include `Authorization: Bearer ${token}` header
- Handle 401 → attempt refresh → if fail → logout → auth-choice

## i18n
- Default language: English (NOT device locale)
- Languages: EN, PL, RU, UA
- All user-facing strings via t('key') function
- Language selection in onboarding and settings

## Styling
- StyleSheet.create for all styles
- Dark theme via useColorScheme hook
- No inline styles except trivial ones (marginTop, flex)

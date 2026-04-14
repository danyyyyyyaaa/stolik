# DINTO — Phase 4: Polish & UX Quality
## Полная спецификация для AI-driven разработки

---

# 1. Обзор фазы

**Цель:** довести Web Dashboard и Mobile App до production-quality уровня — визуальная полировка, анимации, микроинтеракции, navigation routing (универсальная кнопка маршрута), App Store readiness.

**Результат:** дашборд, который выглядит как продукт уровня Resy/SevenRooms, и мобилка, готовая к публикации в App Store / Google Play.

**Стек (без изменений):**
- Mobile: React Native / Expo (Hermes engine)
- Dashboard: Next.js + Tailwind CSS
- Backend: Node.js / Express / Prisma / PostgreSQL (Railway)
- Fonts: DM Serif Display (заголовки), Plus Jakarta Sans (body)
- Тема: Warm Minimalism, light/dark mode

---

# 2. Модули Phase 4

## Модуль A — Universal Navigation Routing (Mobile)

### User Stories

1. Как гость, я хочу нажать одну кнопку «Проложить маршрут» на экране ресторана, чтобы открылась навигация к ресторану.
2. Как гость, у которого нет навигатора по умолчанию, я хочу увидеть список доступных приложений (Google Maps, Apple Maps, Waze, Bolt, Uber, Citymapper), чтобы выбрать удобное.
3. Как гость с навигатором по умолчанию, я хочу чтобы маршрут открылся сразу без лишних шагов.
4. Как гость на Android, я хочу увидеть Android-нативный chooser если нет предпочтения.
5. Как гость на iOS, я хочу увидеть ActionSheet со списком установленных навигаторов.

### Модель данных

Новых таблиц не требуется. Используются существующие поля:
- `Restaurant.latitude` (float)
- `Restaurant.longitude` (float)
- `Restaurant.address` (text)
- `Restaurant.name` (text)

### Логика выбора навигатора

```
Кнопка «Проложить маршрут» нажата
  → Собрать координаты ресторана (lat, lng)
  → Собрать название ресторана (для label)
  → Проверить платформу (iOS / Android)

  iOS:
    → Проверить доступность deeplink-схем:
       - comgooglemaps:// → Google Maps
       - waze:// → Waze  
       - bolt:// → Bolt
       - uber:// → Uber
       - citymapper:// → Citymapper
    → Apple Maps всегда доступен (maps://)
    → Если доступно > 1 приложение → показать ActionSheet
    → Если только Apple Maps → открыть сразу
    
  Android:
    → Сформировать geo: intent
    → Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${encodedName})`)
    → Android покажет нативный chooser автоматически
    → Если ни одно приложение не обработает → fallback на Google Maps web URL
```

### UI компоненты

**Кнопка «Проложить маршрут»**
- Расположение: экран ресторана, под адресом, full-width
- Иконка: Navigation/Route icon (Lucide `navigation-2` или `map-pin`)
- Текст: «Проложить маршрут» / «Get Directions» / «Wyznacz trasę» / «Прокласти маршрут»
- Стиль: primary button, высота 48px, border-radius 12px
- Цвет: accent color из темы (warm tone)
- i18n: 4 языка (EN/PL/RU/UK)

**ActionSheet (iOS) — NavigationPickerSheet**
- Заголовок: «Выбрать приложение» / «Choose App»
- Список: иконка приложения + название
- Только установленные приложения
- Кнопка «Отмена» внизу
- Анимация: slide-up, spring animation

**Fallback**
- Если ни одно приложение не доступно → открыть Google Maps в браузере
- URL: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

### Deeplink URLs по приложениям

| Приложение | iOS URL scheme | URL |
|---|---|---|
| Google Maps | comgooglemaps:// | comgooglemaps://?daddr={lat},{lng}&directionsmode=driving |
| Apple Maps | maps:// | maps://?daddr={lat},{lng}&dirflg=d |
| Waze | waze:// | waze://?ll={lat},{lng}&navigate=yes |
| Uber | uber:// | uber://?action=setPickup&dropoff[latitude]={lat}&dropoff[longitude]={lng}&dropoff[nickname]={name} |
| Bolt | bolt:// | bolt://r?dest_lat={lat}&dest_lng={lng} |
| Citymapper | citymapper:// | citymapper://directions?endcoord={lat},{lng}&endname={name} |

| Приложение | Android |
|---|---|
| Все | geo:{lat},{lng}?q={lat},{lng}({name}) — Android chooser |
| Google Maps fallback | https://www.google.com/maps/dir/?api=1&destination={lat},{lng} |

### Edge Cases

1. Координаты ресторана null → кнопка скрыта, показать только текстовый адрес
2. Пользователь отменил ActionSheet → ничего не происходит
3. Deeplink не открылся (приложение удалено между проверкой и открытием) → fallback на Google Maps web
4. Название ресторана содержит спецсимволы → encodeURIComponent
5. Нет интернета → показать toast «Нет подключения»

### Файлы для создания/изменения

- `apps/mobile/src/utils/navigation.ts` — утилита openDirections(lat, lng, name, platform)
- `apps/mobile/src/components/DirectionsButton.tsx` — кнопка
- `apps/mobile/src/components/NavigationPickerSheet.tsx` — ActionSheet для iOS
- `apps/mobile/src/screens/RestaurantDetailScreen.tsx` — интеграция кнопки
- `apps/mobile/src/i18n/[lang]/restaurant.json` — переводы

---

## Модуль B — Web Dashboard Visual Polish

### User Stories

1. Как владелец ресторана, я хочу видеть профессионально выглядящий дашборд, чтобы доверять платформе.
2. Как менеджер, я хочу плавные переходы между страницами, чтобы интерфейс ощущался как native app.
3. Как пользователь, я хочу видеть loading states с скелетонами вместо спиннеров, чтобы понимать структуру страницы до загрузки.
4. Как пользователь dark mode, я хочу корректные контрасты и отсутствие белых «вспышек» при загрузке.

### Компоненты и улучшения

#### B1. Типографика и spacing система

**Текущая проблема:** inconsistent spacing, разные font-sizes без системы.

**Решение — Design Tokens (Tailwind config расширение):**

```
fontFamily:
  heading: ['DM Serif Display', 'serif']
  body: ['Plus Jakarta Sans', 'sans-serif']

fontSize (semantic):
  'display-lg': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em' }]
  'display': ['30px', { lineHeight: '38px', letterSpacing: '-0.01em' }]
  'heading-lg': ['24px', { lineHeight: '32px' }]
  'heading': ['20px', { lineHeight: '28px' }]
  'body-lg': ['16px', { lineHeight: '24px' }]
  'body': ['14px', { lineHeight: '20px' }]
  'caption': ['12px', { lineHeight: '16px' }]

spacing (semantic):
  'section': '32px'   — между секциями
  'group': '24px'     — между группами элементов  
  'element': '16px'   — между элементами
  'tight': '8px'      — внутри компонентов
  'micro': '4px'      — минимальный
```

#### B2. Skeleton Loaders

**Текущее:** spinner или ничего при загрузке.

**Решение:** skeleton компоненты для каждого типа контента.

Компоненты:
- `SkeletonCard` — карточка с заголовком и 3 строками
- `SkeletonTable` — 5 строк таблицы с 4 колонками
- `SkeletonChart` — прямоугольник с пульсацией
- `SkeletonCalendar` — сетка 7x5 ячеек
- `SkeletonStat` — число + подпись

Стиль:
- Цвет: `bg-gray-200 dark:bg-gray-700`
- Анимация: `animate-pulse` (Tailwind built-in)
- Border-radius: matching реальному компоненту
- Высота/ширина: matching реальному компоненту

Где использовать:
- Calendar page → SkeletonCalendar
- Bookings list → SkeletonTable
- Analytics → SkeletonChart × 4 + SkeletonStat × 6
- CRM guest list → SkeletonTable
- Menu editor → SkeletonCard × 6

#### B3. Анимации переходов

**Текущее:** резкое появление контента.

**Решение — Framer Motion (уже в Next.js экосистеме):**

```
Установить: framer-motion

Page transitions:
  - Все страницы оборачиваются в <AnimatePresence>
  - initial: { opacity: 0, y: 8 }
  - animate: { opacity: 1, y: 0 }
  - transition: { duration: 0.2, ease: 'easeOut' }
  - exit: { opacity: 0, y: -4 }

Component animations:
  - Cards: stagger появление (delay: index * 0.05)
  - Modal open: scale 0.95 → 1.0, opacity 0 → 1
  - Modal close: scale 1.0 → 0.95, opacity 1 → 0
  - Sidebar collapse: width transition 240px → 64px (0.2s ease)
  - Toast: slide-in from right + fade
  - Dropdown: scaleY 0 → 1, transform-origin top
  - Tab switch: crossfade content (0.15s)
```

**Правило:** максимальная длительность анимации — 300ms. Никаких bouncy/elastic — только easeOut. Warm Minimalism = subtle.

#### B4. Hover/Focus/Active States

**Текущее:** базовые hover без системы.

**Решение — Interactive States система:**

```
Buttons:
  hover: translateY(-1px) + shadow-md + brightness 1.05
  active: translateY(0) + shadow-sm + brightness 0.95
  focus-visible: ring-2 ring-offset-2 ring-accent
  disabled: opacity-50 cursor-not-allowed

Cards:
  hover: shadow-md → shadow-lg + translateY(-2px) (0.15s ease)
  active: shadow-sm

Table rows:
  hover: bg-gray-50 dark:bg-gray-800/50
  selected: bg-accent/10

Sidebar items:
  hover: bg-gray-100 dark:bg-gray-800
  active (current page): bg-accent/10 + left border accent 3px

Inputs:
  focus: ring-2 ring-accent/50 + border-accent
  error: ring-2 ring-red-500/50 + border-red-500
  
Links:
  hover: underline + color accent-dark
```

#### B5. Empty States

**Текущее:** пустая таблица или текст «Нет данных».

**Решение — Illustrated Empty States:**

| Страница | Иллюстрация (SVG inline) | Заголовок | Описание | CTA |
|---|---|---|---|---|
| Bookings | Пустой календарь | «Нет бронирований» | «Бронирования появятся здесь» | — |
| Analytics | Пустой график | «Недостаточно данных» | «Статистика начнёт отображаться после первых бронирований» | — |
| Menu | Тарелка с приборами | «Меню пусто» | «Добавьте первую категорию» | «Добавить категорию» |
| Reviews | Звезда | «Нет отзывов» | «Подключите Google Reviews» | «Подключить» |
| CRM | Контакты | «Нет гостей» | «Гости появятся после первого бронирования» | — |

Стиль SVG: monochrome, accent color, 120x120px, stroke-based (не fill).

#### B6. Dark Mode Polish

**Текущее:** базовый dark mode, возможны контрастные проблемы.

**Чеклист:**
- Все фоны: gray-900/gray-800 (не чисто чёрный #000)
- Текст: gray-100 (не чисто белый #fff) для основного, gray-400 для secondary
- Borders: gray-700 (видимые, но не резкие)
- Charts (Recharts): цвета адаптированы — более яркие на тёмном фоне
- Shadows: отключены в dark mode (заменить на border или lighter bg)
- Images/avatars: без инверсии
- Карты: серый/тёмный map style (уже есть silver-retro — проверить dark вариант)
- Toast/notifications: dark bg с light text (не инвертированные)
- Code/pre blocks: gray-800 bg
- Акцентный цвет: проверить WCAG AA contrast ratio (min 4.5:1 для текста)

#### B7. Responsive Breakpoints Polish

**Breakpoints:**
- Mobile: < 640px (sm)
- Tablet: 640px–1024px (md)  
- Desktop: > 1024px (lg)
- Wide: > 1280px (xl)

**Критичные страницы для проверки:**
- Calendar: на mobile → список вместо сетки
- Analytics: на mobile → карточки в 1 колонку, графики full-width с горизонтальным скроллом
- Bookings table: на mobile → card view вместо таблицы
- Sidebar: на mobile → bottom sheet или overlay
- Settings: на mobile → single column

---

## Модуль C — Mobile App Visual Polish (App Store Quality)

### User Stories

1. Как гость, я хочу плавные анимации при скролле списка ресторанов, чтобы приложение ощущалось premium.
2. Как гость, я хочу haptic feedback при ключевых действиях (бронирование, лайк), чтобы чувствовать отклик.
3. Как гость, я хочу красивые переходы между экранами, а не резкие переключения.
4. Как гость на iPhone, я хочу чтобы приложение поддерживало Dynamic Island / Safe Areas корректно.

### Компоненты и улучшения

#### C1. Navigation Transitions

**Текущее:** стандартные React Navigation transitions.

**Решение:**

```
Stack Navigator:
  animation: 'slide_from_right' (iOS default) — НЕ менять
  
Modal screens (booking, filters):
  presentation: 'modal'
  animation: 'slide_from_bottom'
  gestureEnabled: true
  gestureDirection: 'vertical'

Bottom Sheet (ActionSheet, навигатор picker):
  Использовать: @gorhom/bottom-sheet
  snapPoints: ['25%', '50%']
  backdropComponent: полупрозрачный overlay
  animateOnMount: true
  enablePanDownToClose: true
```

#### C2. List Animations (Restaurant List, Bookings)

**Решение — react-native-reanimated:**

```
Restaurant cards при скролле:
  - FadeIn при появлении в viewport
  - entering={FadeInDown.delay(index * 50).springify()}
  - Не использовать FlatList.initialScrollIndex с анимацией

Pull-to-refresh:
  - Кастомный RefreshControl с Lottie animation (опционально)
  - Или стандартный с accent color
  
Booking cards:
  - Swipe-to-cancel с LayoutAnimation
  - Левый свайп → красный фон + иконка «Отменить»
```

#### C3. Haptic Feedback

**Решение — expo-haptics:**

```
Где использовать:
  - Успешное бронирование: Haptics.notificationAsync(Success)
  - Отмена бронирования: Haptics.notificationAsync(Warning)
  - Лайк ресторана: Haptics.impactAsync(Light)
  - Pull-to-refresh trigger: Haptics.impactAsync(Light)
  - Bottom sheet snap: Haptics.impactAsync(Medium)
  - Ошибка валидации: Haptics.notificationAsync(Error)
  
Где НЕ использовать:
  - Обычная навигация
  - Скролл
  - Ввод текста
```

#### C4. Splash Screen & App Loading

**Текущее:** стандартный Expo splash screen.

**Решение:**

```
Splash screen:
  - Dinto logo (анимированное появление — opacity 0→1, scale 0.8→1)
  - Фон: warm white (#FAFAF8)
  - Длительность: 1.5s минимум (для загрузки шрифтов и данных)
  - expo-splash-screen: preventAutoHideAsync → hideAsync после загрузки

App ready check перед hide:
  1. Шрифты загружены (useFonts)
  2. Auth state определён
  3. Город определён (geolocation или кеш)
  → Только после всех трёх → hideAsync с fade transition
```

#### C5. Typography & Spacing System (Mobile)

```
Типографика (React Native StyleSheet):
  heading1: { fontFamily: 'DMSerifDisplay', fontSize: 28, lineHeight: 36 }
  heading2: { fontFamily: 'DMSerifDisplay', fontSize: 22, lineHeight: 30 }
  heading3: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 18, lineHeight: 26 }
  bodyLarge: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 16, lineHeight: 24 }
  body: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, lineHeight: 20 }
  caption: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, lineHeight: 16 }

Spacing:
  xs: 4
  sm: 8
  md: 16
  lg: 24
  xl: 32
  xxl: 48

Border radius:
  sm: 8
  md: 12
  lg: 16
  xl: 24
  full: 9999
```

#### C6. Image Optimization

```
Фото ресторанов:
  - expo-image (вместо Image из RN — кеширование, blurhash)
  - placeholder: blurhash строка (генерировать при upload через backend)
  - transition: 300ms fade
  - contentFit: 'cover'
  - Lazy loading для списков (FlatList уже делает, но expo-image кеширует)

Аватары:
  - Размер: 40x40 (list), 64x64 (profile), 24x24 (inline)
  - Placeholder: инициалы на цветном фоне (генерировать по имени)
  - Border-radius: full (круг)
```

#### C7. Safe Areas & Device Adaptation

```
Safe areas:
  - Использовать react-native-safe-area-context ВЕЗДЕ
  - Bottom tab bar: учитывать home indicator (iPhone X+)
  - Status bar: light-content на тёмных экранах, dark-content на светлых
  - Dynamic Island: не перекрывать — EdgeInsets.top достаточно

Keyboard:
  - KeyboardAvoidingView для форм
  - behavior='padding' на iOS, behavior='height' на Android
  - Автоскролл к активному полю

Orientations:
  - Только portrait (app.json: "orientation": "portrait")
```

#### C8. Error States & Offline

```
Нет интернета:
  - Показать banner сверху: «Нет подключения к интернету» 
  - Цвет: amber/warning
  - Автоскрытие когда соединение восстановлено
  - Использовать: @react-native-community/netinfo

API error:
  - Retry button на экране с ошибкой
  - Иллюстрация (SVG): сломанный провод или облако с крестиком
  - Текст: «Что-то пошло не так. Попробуйте ещё раз»

Empty states (мобилка):
  - Стиль как на дашборде: SVG + заголовок + описание
  - Нет бронирований → «У вас нет предстоящих бронирований» + «Найти ресторан»
  - Нет избранного → «Добавьте рестораны в избранное» + сердечко
```

---

## Модуль D — Микроинтеракции и деталь

### Dashboard

| Элемент | Микроинтеракция |
|---|---|
| Sidebar navigation | Active page indicator slides (не прыгает) — framer-motion layoutId |
| Stats cards | Count-up animation при загрузке (0 → 142 за 0.6s) |
| Charts | Recharts animationDuration={800} animationEasing='ease-out' |
| Toggle (theme/language) | Spring animation на switch |
| Notifications bell | Badge пульсирует если есть новые |
| Search (Cmd+K) | Modal с backdrop blur, scale-in 0.95→1 |
| Table sort | Rotate chevron icon 180° при смене направления |
| Pagination | Fade transition при смене страницы |
| Form submit | Button → loading spinner → checkmark → reset |
| Toast | Slide-in from right, auto-dismiss 4s, progress bar |

### Mobile

| Элемент | Микроинтеракция |
|---|---|
| Restaurant card tap | Scale 0.98 при нажатии (Pressable style) |
| Booking confirmation | Lottie checkmark animation (или animated SVG) |
| Star rating | Sequential fill animation (★ за ★) |
| Tab bar | Icon scale bounce при переключении |
| Map markers | Drop animation при появлении |
| City selector | Fade between city cards |
| Filters | Chip select → fill color transition |
| Booking time slot | Scale + border highlight при выборе |

---

# 3. Приоритеты и зависимости

```
Порядок реализации:

1. Design Tokens (B1 + C5) — основа для всего остального
   Зависимости: нет
   
2. Skeleton Loaders (B2) — заметное улучшение perceived performance
   Зависимости: B1 (spacing)

3. Dark Mode Polish (B6) — исправление существующих багов
   Зависимости: B1 (tokens)

4. Navigation Routing (A) — новая фича
   Зависимости: нет

5. Page Transitions (B3) — анимации дашборда
   Зависимости: framer-motion установлен

6. Interactive States (B4) — hover/focus
   Зависимости: B1 (tokens)

7. Empty States (B5) — SVG иллюстрации
   Зависимости: нет

8. Mobile Transitions (C1) — навигация
   Зависимости: нет

9. List Animations (C2) — reanimated
   Зависимости: react-native-reanimated

10. Haptic Feedback (C3) — быстрая интеграция
    Зависимости: expo-haptics

11. Splash Screen (C4) — branding
    Зависимости: нет

12. Image Optimization (C6) — performance
    Зависимости: expo-image

13. Safe Areas (C7) — device adaptation
    Зависимости: нет

14. Error/Offline States (C8) — reliability
    Зависимости: @react-native-community/netinfo

15. Микроинтеракции (D) — финальный слой polish
    Зависимости: B3, C1, C2
```

---

# 4. Новые зависимости

### Dashboard (apps/web-dashboard)
```
framer-motion — page transitions, layout animations
```
(Всё остальное уже в проекте: Tailwind, Recharts, Next.js)

### Mobile (apps/mobile)
```
expo-haptics — тактильный отклик
expo-image — оптимизированные изображения с blurhash
@gorhom/bottom-sheet — bottom sheets для ActionSheet и модалок
react-native-reanimated — list animations (может уже быть)
@react-native-community/netinfo — offline detection
expo-linking — deeplinks для навигаторов (уже есть через Expo)
```

---

# 5. Критерии качества (Definition of Done)

- [ ] Lighthouse Performance Score > 90 (Dashboard)
- [ ] Все анимации < 300ms
- [ ] Нет layout shifts (CLS = 0)
- [ ] Dark mode: все компоненты проверены, contrast ratio ≥ 4.5:1
- [ ] iOS: Safe Areas корректны на iPhone 15 Pro и SE
- [ ] Android: корректно на Pixel 7 и Samsung S23
- [ ] Empty states на всех страницах
- [ ] Skeleton loaders на всех data-fetching страницах
- [ ] i18n: все новые строки в 4 языках
- [ ] Кнопка «Проложить маршрут» работает на iOS и Android
- [ ] Haptic feedback на ключевых действиях
- [ ] Нет console.log / console.warn в production build
- [ ] App Store screenshot-ready (скрины без артефактов)

---

# 6. Промпт-инструкции для Claude Code

## Промпт 1 — Design Tokens & Skeleton Loaders (Dashboard)

```
Задача: настроить design tokens в Tailwind config и создать skeleton loaders.

1. Расширить tailwind.config.ts:
   - fontFamily: heading (DM Serif Display), body (Plus Jakarta Sans)
   - fontSize: display-lg, display, heading-lg, heading, body-lg, body, caption — с lineHeight и letterSpacing
   - spacing: section (32px), group (24px), element (16px), tight (8px), micro (4px)

2. Создать компоненты скелетонов в apps/web-dashboard/src/components/ui/skeletons/:
   - SkeletonCard.tsx — карточка с анимацией pulse
   - SkeletonTable.tsx — принимает rows и columns props
   - SkeletonChart.tsx — прямоугольник под графики
   - SkeletonCalendar.tsx — сетка 7×5
   - SkeletonStat.tsx — кружок + 2 строки

3. Интегрировать скелетоны в страницы:
   - Calendar page: SkeletonCalendar при loading
   - Bookings: SkeletonTable при loading
   - Analytics: SkeletonChart × 4 + SkeletonStat × 6
   - CRM: SkeletonTable
   - Menu: SkeletonCard × 6

Стиль скелетонов: bg-gray-200 dark:bg-gray-700, animate-pulse, border-radius matching реальным компонентам.

Правила:
- Не трогать бизнес-логику и API
- Только визуальные изменения
- Все компоненты поддерживают light/dark mode
- TypeScript strict mode
```

## Промпт 2 — Page Transitions & Interactive States (Dashboard)

```
Задача: добавить анимации переходов и hover/focus/active states.

1. Установить framer-motion

2. Обернуть layout в AnimatePresence:
   - Каждая страница: initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}

3. Анимации компонентов:
   - Модалки: scale 0.95→1 + opacity + backdrop blur
   - Cards: stagger enter (delay index * 50ms)
   - Sidebar: width transition 240→64px при collapse
   - Toast: slide from right
   - Dropdown: scaleY 0→1 transform-origin top

4. Interactive states (добавить в globals.css или Tailwind utilities):
   - Buttons: hover translateY(-1px) shadow, active translateY(0), focus-visible ring
   - Cards: hover shadow-lg translateY(-2px)
   - Table rows: hover bg-gray-50/dark:bg-gray-800
   - Sidebar items: hover bg-gray-100, active left border accent
   - Inputs: focus ring-accent, error ring-red

Правила:
- Максимум 300ms на любую анимацию
- easeOut only, никаких bouncy/elastic
- Проверить dark mode для всех states
- Не ломать существующий layout
```

## Промпт 3 — Dark Mode & Empty States (Dashboard)

```
Задача: вычистить dark mode и добавить empty states.

1. Dark Mode audit — пройти по каждой странице:
   - Фоны: gray-900 основной, gray-800 карточки (не #000)
   - Текст: gray-100 primary, gray-400 secondary (не #fff)
   - Borders: gray-700
   - Charts: яркие цвета для dark bg
   - Shadows: заменить на borders в dark mode
   - Проверить все компоненты: inputs, buttons, modals, dropdowns, tables

2. Empty States — создать компонент EmptyState.tsx:
   Props: icon (ReactNode SVG), title (string), description (string), action? ({ label, onClick })
   
   Интегрировать:
   - Bookings: пустой календарь SVG + «Нет бронирований»
   - Analytics: пустой график + «Недостаточно данных»
   - Menu: тарелка + «Меню пусто» + CTA «Добавить категорию»
   - Reviews: звезда + «Нет отзывов» + CTA «Подключить»
   - CRM: контакты + «Нет гостей»

3. SVG иллюстрации:
   - Стиль: monochrome, stroke-based, accent color
   - Размер: 120×120px viewBox
   - 5 уникальных иллюстраций

Правила:
- SVG inline в React компонентах (не файлы)
- Цвета через currentColor или CSS variables для поддержки dark mode
- i18n для всех текстов
```

## Промпт 4 — Universal Navigation Routing (Mobile)

```
Задача: реализовать кнопку «Проложить маршрут» с выбором навигатора.

1. Создать apps/mobile/src/utils/navigation.ts:
   - checkAvailableApps(platform): Promise<NavigationApp[]>
   - openDirections(lat, lng, name, app): Promise<void>
   - getDeeplink(app, lat, lng, name): string
   - NavigationApp: { id, name, icon, scheme, available }
   
   iOS: проверить canOpenURL для каждой схемы (comgooglemaps://, waze://, bolt://, uber://, citymapper://)
   Apple Maps всегда доступен.
   Android: использовать geo: intent — Android chooser автоматический.
   Fallback: Google Maps web URL.

2. Создать DirectionsButton.tsx:
   - Full-width кнопка, 48px высота, border-radius 12px
   - Иконка навигации + текст
   - При нажатии: iOS → показать NavigationPickerSheet, Android → openURL geo:
   - Скрыть если lat/lng null

3. Создать NavigationPickerSheet.tsx:
   - @gorhom/bottom-sheet
   - Список установленных приложений с иконками
   - Tap → openDirections → закрыть sheet

4. Интегрировать в RestaurantDetailScreen:
   - Под блоком адреса
   - Над блоком отзывов

5. Добавить переводы в i18n (4 языка):
   - get_directions, choose_navigation_app, cancel, no_connection

Правила:
- НЕ использовать AbortSignal.timeout (Hermes не поддерживает)
- Expo Linking для canOpenURL и openURL
- expo-haptics: Light impact при открытии навигатора
- Добавить comgooglemaps в Info.plist LSApplicationQueriesSchemes (iOS)
```

## Промпт 5 — Mobile Animations & Haptics

```
Задача: добавить анимации, haptic feedback и оптимизацию изображений.

1. Haptic feedback (expo-haptics):
   - Бронирование успех: notificationAsync(Success)
   - Отмена: notificationAsync(Warning)
   - Лайк: impactAsync(Light)
   - Pull-to-refresh: impactAsync(Light)
   - Bottom sheet snap: impactAsync(Medium)
   - Ошибка: notificationAsync(Error)

2. List animations (react-native-reanimated):
   - Restaurant cards: FadeInDown.delay(index * 50).springify()
   - entering prop на каждой карточке в FlatList renderItem

3. Pressable feedback:
   - Restaurant card tap: scale 0.98 при нажатии
   - Все кнопки: opacity 0.7 при нажатии

4. Image optimization:
   - Заменить Image на expo-image во всех местах с фото ресторанов
   - placeholder='blurhash' (если есть) или цветной placeholder
   - transition={300}
   - contentFit='cover'

5. Splash screen:
   - expo-splash-screen: preventAutoHideAsync
   - Скрывать после: fonts loaded + auth state + city определён
   - Fade transition при скрытии

6. Offline detection:
   - @react-native-community/netinfo
   - Banner сверху при потере соединения
   - Автоскрытие при восстановлении

Правила:
- Тестировать на iOS и Android
- Не использовать AbortSignal.timeout
- Все анимации < 300ms (кроме stagger списков)
- Haptics только на значимых действиях
```

## Промпт 6 — Responsive Polish & Final QA (Dashboard)

```
Задача: responsive polish и финальная проверка качества.

1. Responsive breakpoints проверка:
   - Mobile (<640px): Calendar → список, Tables → card view, Sidebar → overlay/bottom sheet, Charts → full-width scroll
   - Tablet (640-1024px): 2-column layout для analytics, sidebar collapsible
   - Desktop (>1024px): full layout
   
2. Страницы для responsive fix:
   - Calendar: mobile card list view
   - Bookings table: mobile → BookingCard stack
   - Analytics: mobile → single column, графики с horizontal scroll
   - Settings: mobile → single column tabs
   - CRM: mobile → card view

3. Микроинтеракции dashboard:
   - Stats count-up animation (0→N за 600ms)
   - Sidebar active indicator layoutId transition
   - Table sort chevron rotation
   - Pagination fade transition
   - Form submit: button → spinner → check → reset
   - Notification bell badge pulse

4. Final QA checklist:
   - Lighthouse > 90
   - Нет console.log в production
   - Все страницы: loading → skeleton → content flow работает
   - Dark mode: каждый компонент проверен
   - i18n: все строки переведены
   - Нет layout shift (CLS)

Правила:
- Не менять бизнес-логику
- Только UI/UX улучшения
- Тестировать в Chrome DevTools responsive mode
```

## Промпт 7 — Mobile Final QA & App Store Prep

```
Задача: финальная полировка мобилки и подготовка к App Store.

1. Safe Areas audit:
   - Все экраны используют SafeAreaView
   - Bottom tab bar: home indicator padding
   - Status bar: правильный стиль на каждом экране
   - Проверить iPhone SE и iPhone 15 Pro Max

2. Keyboard handling:
   - Все формы: KeyboardAvoidingView
   - iOS: behavior='padding'
   - Android: behavior='height'
   - Auto-scroll к активному input

3. Performance:
   - FlatList: windowSize={5}, maxToRenderPerBatch={10}
   - Memo для тяжёлых компонентов
   - Нет re-renders при навигации (проверить React DevTools)
   - Images: все через expo-image с кешированием

4. Error boundaries:
   - App-level ErrorBoundary
   - Screen-level fallback UI
   - Crash report (если Sentry/Bugsnag подключён)

5. App Store assets:
   - App icon: 1024×1024 (уже должен быть)
   - Splash screen: корректный на всех размерах
   - Проверить app.json: name, slug, version, bundleIdentifier, package

Правила:
- Только portrait orientation
- Min iOS 15, min Android API 24
- Нет deprecated APIs
- Нет console warnings в production
```

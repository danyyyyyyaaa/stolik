# DINTO — Phase 5: Menu Sync, Promotions, Ads & Restaurant Info
## Полная спецификация для AI-driven разработки

---

# 1. Обзор фазы

**Цель:** реализовать полный цикл контента «ресторан создаёт в дашборде → гость видит в приложении» для меню, акций, рекламы и информации о ресторане (парковка и др.). Каждая фича сразу с UI polish — анимации, skeleton loaders, dark mode, empty states.

**Принцип:** ресторан управляет всем через дашборд. Мобильное приложение — read-only витрина. Единый источник правды — база данных. Real-time обновления через существующий Socket.io.

---

# 2. Модуль A — Menu Sync (Dashboard → Mobile App)

## A1. Текущее состояние

Dashboard уже имеет Menu Editor (Phase 3). Нужно:
- Убедиться что структура данных полная и консистентная
- Построить API для мобильного приложения
- Создать красивый UI отображения меню в мобилке

## A2. Модель данных

### Существующие таблицы (проверить и дополнить)

```sql
-- Категории меню
MenuCategory {
  id              String   @id @default(uuid())
  restaurantId    String
  name            String          -- "Основные блюда", "Десерты"
  nameEn          String?         -- English name (optional)
  namePl          String?         -- Polish name
  nameUk          String?         -- Ukrainian name
  position        Int             -- порядок отображения (drag-and-drop)
  isVisible       Boolean  @default(true)  -- скрыть категорию без удаления
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  restaurant      Restaurant @relation(fields: [restaurantId])
  items           MenuItem[]
}

-- Позиции меню
MenuItem {
  id              String   @id @default(uuid())
  categoryId      String
  restaurantId    String
  name            String          -- "Борщ украинский"
  nameEn          String?
  namePl          String?
  nameUk          String?
  description     String?         -- "Со сметаной и пампушками"
  descriptionEn   String?
  descriptionPl   String?
  descriptionUk   String?
  price           Decimal         -- 45.00
  currency        String   @default("PLN")  -- PLN, UAH, EUR
  imageUrl        String?         -- Cloudflare R2 URL
  position        Int             -- порядок внутри категории
  isVisible       Boolean  @default(true)
  isAvailable     Boolean  @default(true)   -- "сегодня нет в наличии"
  
  -- Дополнительные поля
  weight          String?         -- "350г", "1л"
  calories        Int?            -- опционально
  allergens       String[]        -- ["gluten", "dairy", "nuts"]
  tags            String[]        -- ["vegetarian", "spicy", "new", "popular"]
  
  -- Специальная цена (для акций типа "бизнес-ланч")
  specialPrice    Decimal?
  specialPriceLabel String?       -- "Бизнес-ланч", "Happy Hour"
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  category        MenuCategory @relation(fields: [categoryId])
  restaurant      Restaurant @relation(fields: [restaurantId])
}
```

### Миграция (если поля отсутствуют)

Добавить если нет:
- `MenuItem.isAvailable` — Boolean default true
- `MenuItem.weight` — String nullable
- `MenuItem.allergens` — String array
- `MenuItem.tags` — String array
- `MenuItem.specialPrice` — Decimal nullable
- `MenuItem.specialPriceLabel` — String nullable
- `MenuCategory.isVisible` — Boolean default true
- `MenuCategory.position` — Int
- Мультиязычные поля (`nameEn`, `namePl`, `nameUk`, etc.)

## A3. API эндпоинты

### Для мобильного приложения (public, read-only)

```
GET /api/public/restaurants/:id/menu
  Response 200:
  {
    categories: [
      {
        id: "uuid",
        name: "Основные блюда",    // на языке пользователя
        position: 1,
        items: [
          {
            id: "uuid",
            name: "Борщ украинский",
            description: "Со сметаной и пампушками",
            price: 45.00,
            currency: "PLN",
            imageUrl: "https://...",
            weight: "350г",
            allergens: ["dairy"],
            tags: ["popular"],
            isAvailable: true,
            specialPrice: null,
            specialPriceLabel: null
          }
        ]
      }
    ],
    updatedAt: "2026-04-14T10:00:00Z"  // для кеширования
  }
  
  Query params:
    lang=en|pl|ru|uk  — язык (определяет какие name/description возвращать)
  
  Логика:
    - Возвращать только isVisible=true категории
    - Возвращать только isVisible=true items
    - Сортировать по position
    - Возвращать name/description на запрошенном языке, fallback на основной name
    
  Коды ошибок:
    404 — ресторан не найден
    200 + пустой categories[] — меню не заполнено
```

### Для дашборда (authenticated, CRUD — уже должен быть)

Проверить что существуют:
```
GET    /api/restaurants/:id/menu/categories      — список категорий
POST   /api/restaurants/:id/menu/categories      — создать категорию
PUT    /api/restaurants/:id/menu/categories/:cid  — обновить
DELETE /api/restaurants/:id/menu/categories/:cid  — удалить
PATCH  /api/restaurants/:id/menu/categories/reorder — { categoryIds: [...] }

GET    /api/restaurants/:id/menu/items             — все позиции
POST   /api/restaurants/:id/menu/items             — создать
PUT    /api/restaurants/:id/menu/items/:iid        — обновить
DELETE /api/restaurants/:id/menu/items/:iid        — удалить
PATCH  /api/restaurants/:id/menu/items/reorder     — { itemIds: [...] }
POST   /api/restaurants/:id/menu/items/:iid/image  — загрузить фото → R2
```

## A4. Mobile App — UI меню ресторана

### Экран: RestaurantMenuScreen (или секция в RestaurantDetailScreen)

**Layout:**

```
┌──────────────────────────────┐
│  ← Название ресторана        │
│                              │
│  [Sticky tabs: категории]     │
│  Основные  Десерты  Напитки  │
│  ─────────────────────────── │
│                              │
│  🔥 Борщ украинский    45 zł │
│  Со сметаной и пампушк...   │
│  350г · 🌿vegetarian         │
│                     [фото]   │
│  ─────────────────────────── │
│  Вареники с вишней    38 zł  │
│  Подаются с соусом...        │
│  250г                        │
│  ─────────────────────────── │
│                              │
│  📸 [фото блюда на всю ширину│
│       если imageUrl есть]    │
│                              │
└──────────────────────────────┘
```

**Компоненты:**

1. **MenuCategoryTabs** — горизонтальный ScrollView с табами категорий
   - Sticky position при скролле (stickyHeaderIndices в SectionList)
   - Active tab: accent underline + bold text
   - При тапе на таб → scroll to section
   - При скролле контента → активный таб меняется автоматически

2. **MenuItemCard** — карточка позиции меню
   - Название (heading3, DM Serif Display)
   - Описание (body, gray-500, max 2 строки + ellipsis)
   - Цена: справа, bold, accent color
   - Если specialPrice → перечёркнутая старая цена + новая цена зелёным
   - Weight badge: маленький серый badge
   - Tags: цветные chips (🌿 vegetarian = green, 🌶 spicy = red, ⭐ new = accent, 🔥 popular = orange)
   - Allergens: иконки-кружки маленькие (tooltip по тапу)
   - Фото: если есть — thumbnail 80×80 справа с border-radius 12
   - isAvailable=false → opacity 0.5 + «Нет в наличии» badge

3. **MenuItemDetailModal** — Bottom Sheet при тапе на позицию
   - Полное фото (если есть) — full width, aspect 16:9
   - Полное описание
   - Все allergens с подписями
   - Weight, calories
   - Цена крупно
   - Кнопка «Забронировать столик» → переход к бронированию

**Анимации:**
- Category tabs: smooth scroll + underline animation (Animated.View width+translateX)
- Cards: FadeInDown.delay(index * 30) при первой загрузке
- Detail modal: slide-up bottom sheet (spring)
- Фото: expo-image с blurhash placeholder + fade transition

**Empty state:** если меню пустое → SVG тарелка с приборами + «Ресторан пока не добавил меню»

**Skeleton:** MenuSkeleton — 3 tab placeholders + 5 card placeholders с pulse animation

## A5. Dashboard — Menu Editor Polish

Существующий Editor дополнить:
- Drag-and-drop reorder для категорий и позиций (уже может быть)
- Preview кнопка: показать как меню выглядит в мобилке (mobile frame mockup)
- Bulk actions: скрыть/показать несколько позиций, «Отметить как нет в наличии»
- isAvailable toggle прямо в списке (без входа в edit modal)
- Tags selector: multi-select chips
- Allergens selector: checkboxes с иконками
- Мультиязычные поля: tabs EN/PL/RU/UK в edit modal

## A6. Edge Cases

1. Категория без видимых позиций → скрыть категорию в мобилке
2. Все позиции isAvailable=false → показать но с заглушкой
3. Позиция без фото → layout без thumbnail (текст на всю ширину)
4. Очень длинное название → ellipsis на 1 строке
5. Цена 0 → показать «Бесплатно» / «Free»
6. Смена языка приложения → перезапросить меню с новым lang
7. 100+ позиций → виртуализованный список (SectionList уже виртуализован)
8. Real-time update: если ресторан обновил меню → Socket.io event `menu:updated` → refetch

---

# 3. Модуль B — Promotions (Акции)

## B1. Концепция

Ресторан создаёт акцию в дашборде → она отображается в мобильном приложении привлекательно. Акции — главный инструмент привлечения гостей.

**Типы акций:**
1. **Скидка** — «-20% на все десерты до конца недели»
2. **Специальное предложение** — «Бизнес-ланч 49 zł: суп + основное + напиток»
3. **Happy Hour** — «Коктейли 2 по цене 1, пн-пт 16:00-18:00»
4. **Событие** — «Живая музыка каждую пятницу с 20:00»
5. **Бонус при бронировании** — «Забронируй через Dinto — бесплатный десерт»

## B2. Модель данных

```sql
Promotion {
  id              String   @id @default(uuid())
  restaurantId    String
  
  -- Контент
  title           String          -- "Happy Hour: коктейли 2=1"
  titleEn         String?
  titlePl         String?
  titleUk         String?
  description     String          -- подробности
  descriptionEn   String?
  descriptionPl   String?
  descriptionUk   String?
  imageUrl        String?         -- баннер акции (R2)
  
  -- Тип и параметры
  type            PromotionType   -- DISCOUNT, SPECIAL_OFFER, HAPPY_HOUR, EVENT, BOOKING_BONUS
  discountPercent Int?            -- для DISCOUNT: 10, 20, 30...
  discountAmount  Decimal?        -- или фикс сумма скидки
  
  -- Расписание
  startDate       DateTime        -- начало действия
  endDate         DateTime?       -- null = бессрочно
  recurringDays   Int[]           -- [1,2,3,4,5] = пн-пт (для Happy Hour)
  timeStart       String?         -- "16:00" (для Happy Hour)
  timeEnd         String?         -- "18:00"
  
  -- Статус
  status          PromotionStatus @default(DRAFT)  -- DRAFT, ACTIVE, PAUSED, EXPIRED
  isHighlighted   Boolean  @default(false)  -- показывать в карусели на главной
  
  -- Условия
  conditions      String?         -- "Минимальный заказ 100 zł"
  promoCode       String?         -- "DINTO20" (опционально)
  
  -- Метрики
  viewCount       Int      @default(0)
  clickCount      Int      @default(0)   -- кликнули "Забронировать"
  bookingCount    Int      @default(0)   -- реально забронировали
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  restaurant      Restaurant @relation(fields: [restaurantId])
}

enum PromotionType {
  DISCOUNT
  SPECIAL_OFFER
  HAPPY_HOUR
  EVENT
  BOOKING_BONUS
}

enum PromotionStatus {
  DRAFT
  ACTIVE
  PAUSED
  EXPIRED
}
```

## B3. API

### Public (мобильное приложение)

```
GET /api/public/restaurants/:id/promotions
  Response 200:
  {
    promotions: [
      {
        id, title, description, imageUrl, type,
        discountPercent, startDate, endDate,
        recurringDays, timeStart, timeEnd,
        conditions, promoCode, isHighlighted
      }
    ]
  }
  Query: lang=en|pl|ru|uk
  Логика: только status=ACTIVE, не истекшие, сортировка: isHighlighted first, потом по startDate desc

GET /api/public/promotions/featured
  Response 200:
  {
    promotions: [...top 10 highlighted акций из разных ресторанов...]
  }
  Для главного экрана приложения — карусель акций
  Логика: isHighlighted=true, status=ACTIVE, сортировка: boost score (см. модуль рекламы) + recency

POST /api/public/promotions/:id/view
  Body: { userId? }
  Инкрементирует viewCount
  
POST /api/public/promotions/:id/click  
  Body: { userId? }
  Инкрементирует clickCount
```

### Dashboard (authenticated)

```
GET    /api/restaurants/:id/promotions
POST   /api/restaurants/:id/promotions
PUT    /api/restaurants/:id/promotions/:pid
DELETE /api/restaurants/:id/promotions/:pid
PATCH  /api/restaurants/:id/promotions/:pid/status   — { status: "ACTIVE" }
POST   /api/restaurants/:id/promotions/:pid/image    — upload баннер
GET    /api/restaurants/:id/promotions/:pid/stats     — viewCount, clickCount, bookingCount
```

## B4. Mobile App — UI акций

### На экране ресторана: PromotionsSection

**Расположение:** между основной информацией и меню (или табом).

```
┌──────────────────────────────┐
│  🔥 Акции                    │
│                              │
│  ┌────────────────────────┐  │
│  │ 🏷  -20%               │  │
│  │                        │  │
│  │ [красивый баннер фото] │  │
│  │                        │  │
│  │ Happy Hour             │  │
│  │ Коктейли 2 по цене 1   │  │
│  │ Пн-Пт 16:00-18:00     │  │
│  │                        │  │
│  │ ⏰ Осталось 2ч 30мин   │  │
│  │       [Забронировать]  │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ 🎁 Бонус Dinto         │  │
│  │ Бесплатный десерт при  │  │
│  │ бронировании через app │  │
│  │       [Забронировать]  │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

**Компоненты:**

1. **PromotionCard** — карточка акции
   - Баннер фото (если есть) — full width, aspect 2:1, border-radius 16
   - Type badge в углу:
     - DISCOUNT: красный badge «-20%» или сумма
     - HAPPY_HOUR: фиолетовый badge «🍹 Happy Hour»
     - EVENT: синий badge «🎵 Событие»
     - SPECIAL_OFFER: зелёный badge «🏷 Предложение»
     - BOOKING_BONUS: accent badge «🎁 Бонус Dinto»
   - Title (heading3, DM Serif Display)
   - Description (body, 2-3 строки)
   - Schedule info: дни + время (если recurring)
   - Countdown timer: если акция заканчивается в ближайшие 24ч → живой обратный отсчёт «⏰ Осталось 5ч 23мин»
   - PromoCode: если есть → «Код: DINTO20» с кнопкой копирования
   - CTA: «Забронировать» → экран бронирования (передать promoId)
   
2. **PromotionBanner** — для карусели на главном экране
   - Компактная карточка: фото фон + gradient overlay + текст поверх
   - Название ресторана + название акции
   - Tap → переход на экран ресторана с открытой акцией

**Дизайн — Warm Minimalism:**
- Карточки: белый фон, тонкая border gray-200, shadow-sm
- Badges: полупрозрачные (bg-opacity-90), border-radius-full, маленький padding
- Countdown: моноширинный шрифт для цифр, accent color
- Без кричащих цветов — тёплые тона, мягкие тени

**Анимации:**
- Cards: FadeInUp.delay(index * 60) при появлении
- Countdown: цифры обновляются с subtle scale pulse
- Copy promo code: иконка → checkmark с haptic Light
- Карусель на главной: auto-scroll каждые 5с, dots indicator внизу

### На главном экране приложения: Featured Promotions

**Расположение:** между поиском и списком ресторанов.

```
┌──────────────────────────────┐
│  🔥 Акции рядом              │
│                              │
│  ◄ [карточка 1] [карточка 2] ►│
│     · · ●                    │
│                              │
└──────────────────────────────┘
```

- Horizontal FlatList / ScrollView с snap
- 3-5 карточек
- Каждая: фото + gradient + название ресторана + акция + badge
- Aspect ratio 3:2, border-radius 16
- Pagination dots

## B5. Dashboard — Promotions Manager

### Страница: /promotions

**Layout:**

```
Акции                         [+ Создать акцию]

[Tabs: Активные | Черновики | Завершённые | Все]

┌────────────────────────────────────────────┐
│ 🟢 Happy Hour: коктейли 2=1               │
│ Тип: Happy Hour · Пн-Пт 16:00-18:00      │
│ 👁 1,240 просмотров · 89 кликов · 23 брони│
│                    [Пауза] [Ред.] [Удалить]│
└────────────────────────────────────────────┘
```

**Create/Edit Modal:**
- Title (с табами языков)
- Description (с табами языков)
- Type selector: иконки + название для каждого типа
- Параметры по типу (dynamic form):
  - DISCOUNT → discountPercent или discountAmount
  - HAPPY_HOUR → recurringDays + timeStart + timeEnd
  - EVENT → дата + время
  - BOOKING_BONUS → описание бонуса
- Schedule: startDate + endDate (date picker)
- Image upload (drag-and-drop)
- Conditions (text)
- PromoCode (optional)
- isHighlighted toggle (+ tooltip «Показывать в карусели на главном экране»)
- Preview в mobile frame

**Статистика (в карточке или отдельная страница):**
- Views / Clicks / Bookings — числа с count-up анимацией
- Conversion funnel: views → clicks → bookings (горизонтальный bar chart)
- График по дням (Recharts LineChart)

## B6. Edge Cases

1. Акция истекла → автоматически status=EXPIRED (cron job ежечасно)
2. Акция с endDate=null → бессрочная, показывать «Постоянная акция»
3. Happy Hour: показывать «Сейчас действует» если текущее время в диапазоне
4. Нет активных акций → секция скрыта в мобилке
5. Ресторан на бесплатном плане → лимит 2 активных акции
6. 10+ акций → pagination/scroll в дашборде
7. Фото не загружено → дефолтный gradient фон по типу акции

---

# 4. Модуль C — Ads / Boost (Продвижение ресторанов)

## C1. Концепция

Ресторан платит чтобы его ресторан/акция были выше в результатах поиска и на главном экране. Не баннерная реклама — а буст позиции в листинге.

**Модель:** CPD (Cost Per Day) — ресторан покупает «буст» на N дней.

**Три уровня буста:**

| Уровень | Название | Что даёт | Цена/день |
|---|---|---|---|
| 1 | **Boost** | +50 к score в поиске, метка «Рекомендуем» | 15 PLN |
| 2 | **Boost Pro** | +150 к score, метка «Топ», карусель на главной | 35 PLN |
| 3 | **Boost Premium** | +300 к score, метка «Премиум», карусель первая позиция, выделенная карточка | 65 PLN |

## C2. Модель данных

```sql
Boost {
  id              String   @id @default(uuid())
  restaurantId    String
  
  -- Параметры
  level           BoostLevel      -- BOOST, BOOST_PRO, BOOST_PREMIUM
  startDate       DateTime
  endDate         DateTime
  dailyRate       Decimal         -- цена/день на момент покупки
  totalAmount     Decimal         -- dailyRate × days
  
  -- Статус
  status          BoostStatus  @default(PENDING)  -- PENDING, ACTIVE, EXPIRED, CANCELLED
  
  -- Оплата
  stripePaymentId String?         -- Stripe payment intent
  paidAt          DateTime?
  
  -- Метрики
  impressions     Int      @default(0)   -- сколько раз показали
  clicks          Int      @default(0)   -- сколько раз нажали
  bookings        Int      @default(0)   -- сколько бронирований
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  restaurant      Restaurant @relation(fields: [restaurantId])
}

enum BoostLevel {
  BOOST           -- базовый
  BOOST_PRO       -- продвинутый
  BOOST_PREMIUM   -- премиум
}

enum BoostStatus {
  PENDING         -- создан, ждёт оплаты
  ACTIVE          -- оплачен, действует
  EXPIRED         -- срок истёк
  CANCELLED       -- отменён
}
```

### Расширение Restaurant модели

```sql
-- Добавить вычисляемые/кешированные поля
Restaurant {
  ...existing fields...
  
  -- Score для сортировки (обновляется cron-ом)
  baseScore       Int      @default(0)   -- рейтинг + отзывы + заполненность профиля
  boostScore      Int      @default(0)   -- из активного буста
  totalScore      Int      @default(0)   -- baseScore + boostScore
  
  -- Информация
  hasParking       Boolean  @default(false)
  parkingDetails   String?         -- "Бесплатная парковка на 20 мест"
  hasWifi          Boolean  @default(false)
  hasOutdoorSeating Boolean @default(false)
  hasChildMenu     Boolean  @default(false)
  hasLiveMusic     Boolean  @default(false)
  priceRange       Int?     @default(2)  -- 1=бюджет, 2=средний, 3=дорогой, 4=люкс
}
```

## C3. Алгоритм ранжирования

```
totalScore = baseScore + boostScore

baseScore расчёт:
  + googleRating × 20              (4.5 → 90 баллов)
  + reviewCount × 0.5              (100 отзывов → 50 баллов, cap 100)
  + completeness × 50              (% заполненности профиля: фото, меню, описание, часы)
  + bookingRate × 30               (% подтверждённых бронирований за 30 дней)
  + recentActivity × 20            (обновления за 7 дней: меню, акции, фото)

boostScore:
  BOOST         → +50
  BOOST_PRO     → +150
  BOOST_PREMIUM → +300
  Нет активного буста → 0

Cron job (каждый час):
  1. Пересчитать baseScore для всех ресторанов
  2. Проверить активные бусты → обновить boostScore
  3. Истекшие бусты → status=EXPIRED, boostScore=0
  4. totalScore = baseScore + boostScore
  5. UPDATE Restaurant SET totalScore, baseScore, boostScore
```

## C4. Отображение в мобильном приложении

### Сортировка листинга

```
Список ресторанов по умолчанию:
  ORDER BY totalScore DESC, googleRating DESC

Фильтры пользователя перезаписывают:
  "По рейтингу" → ORDER BY googleRating DESC
  "По расстоянию" → ORDER BY distance ASC
  "Рекомендуемые" → ORDER BY totalScore DESC (default)
```

### Визуальные метки в карточке ресторана

```
BOOST_PREMIUM:
  - Карточка с golden border (subtle, 1px gradient gold)
  - Badge: «⭐ Премиум» (gold background)
  - В карусели на главной: первая позиция

BOOST_PRO:
  - Badge: «🔥 Топ» (accent background)  
  - В карусели на главной: после Premium

BOOST:
  - Badge: «✨ Рекомендуем» (light accent background)
  - Не попадает в карусель

Без буста:
  - Стандартная карточка, без бейджей
```

**Важно:** метки должны быть subtle, не навязчивые. Пользователь не должен чувствовать что ему «втюхивают рекламу». Warm Minimalism = деликатно.

### Главный экран: Promoted Section

```
┌──────────────────────────────┐
│  ✨ Рекомендуем               │
│                              │
│  ◄ [Premium карт.] [Pro карт.] ►│
│                              │
│  🔥 Акции рядом              │
│  ◄ [акция 1] [акция 2]     ►│
│                              │
│  Рестораны поблизости        │
│  [обычный список]            │
└──────────────────────────────┘
```

## C5. Dashboard — Boost Manager

### Страница: /boost (или секция в /settings или /billing)

```
Продвижение                    

┌─ Текущий статус ─────────────────────┐
│ 🟢 Boost Pro активен                │
│ До 20 апреля 2026 (осталось 6 дней) │
│ 👁 2,450 показов · 187 кликов · 34 брони │
│                          [Продлить]  │
└──────────────────────────────────────┘

Или если нет активного буста:

┌─ Выберите план продвижения ──────────┐
│                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │Boost │  │ Pro  │  │Premi-│       │
│  │      │  │      │  │um    │       │
│  │15 zł │  │35 zł │  │65 zł │       │
│  │/день │  │/день │  │/день │       │
│  │      │  │      │  │      │       │
│  │✨Рек. │  │🔥Топ  │  │⭐Прем│       │
│  │+50   │  │+150  │  │+300  │       │
│  │score │  │+кару-│  │+кару-│       │
│  │      │  │сель  │  │сель  │       │
│  │      │  │      │  │1 поз.│       │
│  │[Выбр]│  │[Выбр]│  │[Выбр]│       │
│  └──────┘  └──────┘  └──────┘       │
│                                      │
│  Период: [7 дней ▼]                  │
│  Итого: 245 zł                       │
│  [Оплатить через Stripe]             │
└──────────────────────────────────────┘

Статистика прошлых бустов:
  Таблица: период, уровень, потрачено, показы, клики, брони, CTR, ROI
```

## C6. Stripe интеграция

```
Процесс оплаты:
1. Ресторан выбирает level + период (7/14/30 дней)
2. POST /api/restaurants/:id/boosts → создать Boost (PENDING) + Stripe Payment Intent
3. Клиент получает clientSecret → Stripe Elements форма оплаты
4. Оплата успешна → Stripe webhook → status=ACTIVE, paidAt=now()
5. Оплата неуспешна → status остаётся PENDING → показать ошибку

Webhook:
  payment_intent.succeeded → активировать буст
  payment_intent.payment_failed → уведомить ресторан
```

## C7. API

```
POST   /api/restaurants/:id/boosts
  Body: { level, days }  // days: 7, 14, 30
  Response: { boostId, stripeClientSecret, amount }
  
GET    /api/restaurants/:id/boosts
  Response: { activeBoost?, history: [...] }

GET    /api/restaurants/:id/boosts/:bid/stats
  Response: { impressions, clicks, bookings, ctr, costPerBooking }

POST   /api/restaurants/:id/boosts/:bid/cancel
  Response: { refundAmount }  // пропорциональный возврат за оставшиеся дни

POST   /api/webhooks/stripe/boost   — обработка payment events
```

## C8. Edge Cases

1. У ресторана уже есть активный буст → показать «Продлить» или «Повысить уровень»
2. Два ресторана с одинаковым totalScore → вторичная сортировка по googleRating
3. Буст истёк ночью → cron переводит в EXPIRED, boostScore=0
4. Оплата зависла → PENDING > 30 мин → автоматически отменить
5. Ресторан отменяет буст → пропорциональный refund через Stripe
6. Нет ресторанов с бустом в городе → секция «Рекомендуем» скрыта
7. Бесплатный план ресторана → буст доступен всем (это отдельная покупка, не часть подписки)

---

# 5. Модуль D — Restaurant Info (Парковка и доп. информация)

## D1. Модель данных

Добавить в Restaurant (если нет):

```sql
Restaurant {
  ...existing...
  
  -- Удобства
  hasParking        Boolean  @default(false)
  parkingType       String?  -- "free", "paid", "street", "valet"
  parkingDetails    String?  -- "Бесплатная парковка на 20 мест за зданием"
  
  hasWifi           Boolean  @default(false)
  wifiDetails       String?  -- "Бесплатный, пароль у официанта"
  
  hasOutdoorSeating Boolean  @default(false)
  outdoorDetails    String?  -- "Терраса на 30 мест, открыта май-сентябрь"
  
  hasChildMenu      Boolean  @default(false)
  hasHighChairs     Boolean  @default(false)
  hasLiveMusic      Boolean  @default(false)
  liveMusicDetails  String?  -- "Пятница и суббота с 20:00"
  
  isSmokingAllowed  Boolean  @default(false)
  hasAirConditioning Boolean @default(false)
  hasPrivateRooms   Boolean  @default(false)
  privateRoomDetails String? -- "Зал на 20 человек, бронирование за 2 дня"
  
  wheelchairAccessible Boolean @default(false)
  petsAllowed       Boolean  @default(false)
  
  priceRange        Int      @default(2)  -- 1-4
  averageBill       Decimal?              -- средний чек
  averageBillCurrency String @default("PLN")
  
  paymentMethods    String[] -- ["cash", "card", "apple_pay", "google_pay"]
}
```

## D2. Dashboard — Settings / Restaurant Info

В существующей странице Settings или отдельной секции «Информация»:

**UI: группированные toggle-и с деталями**

```
Удобства и сервис

┌──────────────────────────────────────┐
│ 🅿️ Парковка                    [🔘] │
│   ├ Тип: [Бесплатная ▼]            │
│   └ Детали: [Бесплатная на 20 мест] │
│                                      │
│ 📶 Wi-Fi                       [🔘] │
│   └ Детали: [Бесплатный]            │
│                                      │
│ 🌿 Терраса                     [🔘] │
│   └ Детали: [30 мест, май-сентябрь]  │
│                                      │
│ 👶 Детское меню                [🔘] │
│ 🪑 Детские стулья              [🔘] │
│ 🎵 Живая музыка                [🔘] │
│   └ Детали: [Пт и Сб с 20:00]      │
│                                      │
│ ♿ Доступность                  [🔘] │
│ 🐾 С питомцами                 [🔘] │
│ 🚬 Курение                     [🔘] │
│ ❄️ Кондиционер                 [🔘] │
│ 🚪 Приватные залы              [🔘] │
│   └ Детали: [Зал на 20 человек]    │
│                                      │
│ 💳 Способы оплаты                    │
│   [✓]Нал [✓]Карта [✓]Apple Pay      │
│                                      │
│ 💰 Средний чек: [85] [PLN ▼]        │
│ 💲 Ценовой сегмент: [💲💲 ▼]         │
│                                      │
│              [Сохранить изменения]   │
└──────────────────────────────────────┘
```

**UX:** Toggle → если ON → expand с полем деталей (animated collapse/expand). Autosave через debounce 2с или кнопка «Сохранить».

## D3. Mobile App — отображение информации

### На экране ресторана: InfoSection

**Расположение:** под адресом и рабочими часами.

```
┌──────────────────────────────┐
│  📍 ул. Маршалковская, 15    │
│  ⏰ Сегодня: 10:00 — 23:00  │
│                              │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │
│  │🅿️│ │📶│ │🌿│ │👶│ │♿│  │
│  │   │ │   │ │   │ │   │ │   │  │
│  │Парк│ │WiFi│ │Тер│ │Дет│ │Дос│  │
│  └──┘ └──┘ └──┘ └──┘ └──┘  │
│                              │
│  💲💲 · Средний чек ~85 zł   │
│  💳 Наличные, карта, Apple Pay│
│                              │
└──────────────────────────────┘
```

**Компоненты:**

1. **AmenitiesRow** — горизонтальный ряд иконок
   - Только те что true
   - Каждая: иконка (24×24) + подпись (caption, 10px)
   - При тапе: tooltip или bottom sheet с деталями
   - Если > 5 иконок → scroll + «ещё +3»

2. **ParkingBadge** — особый акцент на парковку (если есть)
   - Зелёный для бесплатной, серый для платной
   - «🅿️ Бесплатная парковка» или «🅿️ Платная парковка»
   - При тапе: детали

3. **PriceRange** — значки 💲
   - 1-4 заполненных из 4
   
4. **PaymentMethods** — иконки способов оплаты в ряд

**Дизайн:**
- Иконки: stroke, gray-600, 24×24
- Active amenity: filled icon, accent tint
- Подписи: caption, gray-500
- Section: subtle divider сверху и снизу

### В карточке ресторана (листинг)

Компактные иконки под рейтингом:
```
⭐ 4.7 (128) · 💲💲 · 🅿️ · 📶 · 🌿
```
Только иконки без подписей, 16×16, серые.

## D4. API

```
PUT /api/restaurants/:id/amenities
  Body: {
    hasParking, parkingType, parkingDetails,
    hasWifi, wifiDetails,
    hasOutdoorSeating, outdoorDetails,
    ...all amenity fields...
    paymentMethods, averageBill, priceRange
  }
  Response: 200 + updated restaurant

GET /api/public/restaurants/:id  — уже существует, добавить amenity поля в response
```

## D5. Edge Cases

1. Все amenities false → секция скрыта
2. parkingType="free" но parkingDetails пусто → показать «Бесплатная парковка»
3. priceRange не заполнен → не показывать
4. paymentMethods пустой массив → не показывать секцию оплаты

---

# 6. Модуль E — Bug Fixes & Data Consistency

## E1. Известные проблемы для проверки

```
Чеклист для QA-review (Claude Code с qa-reviewer субагентом):

1. API Response Consistency
   - Все public API: проверить что не утекают приватные поля (email владельца, stripe data)
   - Все эндпоинты: консистентный формат ошибок { error: { code, message } }
   - Мультиязычные поля: fallback если перевод отсутствует

2. Auth & Permissions
   - Restaurant owner может редактировать только свои рестораны
   - MANAGER role: проверить что не может менять billing/subscription
   - STAFF role: только read access к аналитике
   - Public API: не требует auth token

3. Data Integrity
   - Удаление категории меню → каскадное удаление позиций или block?
   - Удаление ресторана → каскад на menu, promotions, boosts, bookings?
   - Уникальность: email, restaurantSlug
   - Обязательные поля: проверить NOT NULL constraints

4. Frontend-Backend Sync
   - Dashboard отправляет обновление → мобилка получает Socket.io event → refetch
   - Timezone handling: все даты в UTC, отображение в локальном timezone
   - Currency formatting: правильные разделители и символы для PLN/UAH/EUR

5. Mobile-Specific
   - AbortSignal.timeout НЕ используется нигде (Hermes)
   - Все Expo модули установлены через npx expo install
   - Deep links: dinto://restaurant/:id работает
   - Push notifications: правильные payload для booking confirmation

6. Dashboard-Specific  
   - Vercel deployment: Root Directory = apps/web-dashboard
   - Next.js build: нет TypeScript ошибок
   - Prisma: все миграции applied на Railway
   - CORS: включает все нужные домены

7. Performance
   - API: pagination на всех list эндпоинтах (default 20, max 100)
   - Images: все через R2 CDN, не через API proxy
   - Mobile: FlatList virtualization, нет re-renders при навигации
```

## E2. Cron Jobs (новые)

```
Добавить/проверить cron jobs:

1. promotion-expiry (каждый час)
   - Найти Promotion где endDate < now() и status=ACTIVE
   - Обновить status=EXPIRED

2. boost-expiry (каждый час)
   - Найти Boost где endDate < now() и status=ACTIVE  
   - Обновить status=EXPIRED
   - Обновить Restaurant.boostScore=0

3. score-recalculation (каждые 6 часов)
   - Пересчитать baseScore для всех ресторанов
   - totalScore = baseScore + boostScore
   - UPDATE Restaurant

4. boost-impressions (каждый день в 00:00)
   - Сбросить дневные счётчики (если нужно для аналитики)
   - Записать daily snapshot в отдельную таблицу
```

---

# 7. Промпт-инструкции для Claude Code

## Промпт 1 — Database Migrations (Menu + Promotions + Boost + Amenities)

```
Задача: добавить/обновить модели в Prisma schema и создать миграции.

1. Проверить существующие модели MenuCategory и MenuItem.
   Добавить недостающие поля:
   - MenuItem: isAvailable (Boolean default true), weight (String?), allergens (String[]),
     tags (String[]), specialPrice (Decimal?), specialPriceLabel (String?),
     мультиязычные поля (nameEn, namePl, nameUk, descriptionEn, descriptionPl, descriptionUk)
   - MenuCategory: isVisible (Boolean default true), position (Int),
     мультиязычные поля (nameEn, namePl, nameUk)

2. Создать модель Promotion:
   id, restaurantId, title, titleEn/Pl/Uk, description, descriptionEn/Pl/Uk,
   imageUrl, type (enum DISCOUNT/SPECIAL_OFFER/HAPPY_HOUR/EVENT/BOOKING_BONUS),
   discountPercent (Int?), discountAmount (Decimal?), startDate, endDate?,
   recurringDays (Int[]), timeStart (String?), timeEnd (String?),
   status (enum DRAFT/ACTIVE/PAUSED/EXPIRED), isHighlighted (Boolean default false),
   conditions (String?), promoCode (String?),
   viewCount (Int default 0), clickCount (Int default 0), bookingCount (Int default 0),
   createdAt, updatedAt. Relation: restaurant.

3. Создать модель Boost:
   id, restaurantId, level (enum BOOST/BOOST_PRO/BOOST_PREMIUM),
   startDate, endDate, dailyRate (Decimal), totalAmount (Decimal),
   status (enum PENDING/ACTIVE/EXPIRED/CANCELLED),
   stripePaymentId (String?), paidAt (DateTime?),
   impressions (Int default 0), clicks (Int default 0), bookings (Int default 0),
   createdAt, updatedAt. Relation: restaurant.

4. Добавить поля в Restaurant:
   baseScore (Int default 0), boostScore (Int default 0), totalScore (Int default 0),
   hasParking (Boolean default false), parkingType (String?), parkingDetails (String?),
   hasWifi (Boolean default false), wifiDetails (String?),
   hasOutdoorSeating (Boolean default false), outdoorDetails (String?),
   hasChildMenu (Boolean default false), hasHighChairs (Boolean default false),
   hasLiveMusic (Boolean default false), liveMusicDetails (String?),
   isSmokingAllowed (Boolean default false), hasAirConditioning (Boolean default false),
   hasPrivateRooms (Boolean default false), privateRoomDetails (String?),
   wheelchairAccessible (Boolean default false), petsAllowed (Boolean default false),
   priceRange (Int default 2), averageBill (Decimal?), averageBillCurrency (String default "PLN"),
   paymentMethods (String[])

5. Создать и применить миграцию: npx prisma migrate dev --name phase5_menu_promotions_boost_amenities

6. Обновить Prisma client: npx prisma generate

Правила:
- Не удалять существующие поля
- Все новые поля с default values (чтобы не ломать существующие записи)
- Проверить что FK relations корректны
- Enums создать через Prisma enum
```

## Промпт 2 — Menu API + Mobile UI

```
Задача: создать public API для меню и UI отображения в мобильном приложении.

BACKEND:
1. Создать GET /api/public/restaurants/:id/menu
   - Принимает query param lang (en/pl/ru/uk)
   - Возвращает categories с items (только isVisible=true)
   - Сортировка по position
   - Мультиязычный: возвращать name/description на запрошенном языке, fallback на основной
   - Response: { categories: [{ id, name, position, items: [{ id, name, description, price, currency, imageUrl, weight, allergens, tags, isAvailable, specialPrice, specialPriceLabel }] }], updatedAt }

2. Добавить Socket.io event 'menu:updated' при изменении меню через dashboard

MOBILE (apps/mobile):
3. Создать экран/секцию меню с компонентами:
   
   a) MenuCategoryTabs — горизонтальный ScrollView
      - Sticky при скролле (SectionList stickyHeaderIndices)
      - Active tab: accent underline (Animated.View), bold text
      - Тап → scroll to section
      - Scroll content → auto-update active tab (onViewableItemsChanged)
   
   b) MenuItemCard — карточка позиции
      - Название: heading3, DM Serif Display
      - Описание: body, gray-500, max 2 lines + ellipsis
      - Цена: справа, bold, accent color
      - specialPrice: перечёркнутая старая + зелёная новая
      - Weight: серый badge
      - Tags chips: vegetarian=green, spicy=red, new=accent, popular=orange
      - Allergens: маленькие иконки-кружки
      - Фото: thumbnail 80×80 справа, border-radius 12 (expo-image)
      - isAvailable=false: opacity 0.5 + badge «Нет в наличии»
   
   c) MenuItemDetailSheet — @gorhom/bottom-sheet при тапе
      - Полное фото full width aspect 16:9
      - Полное описание
      - Allergens с текстовыми подписями
      - Weight, calories
      - Цена крупно
      - CTA «Забронировать столик»
   
   d) MenuSkeleton — 3 tab placeholders + 5 card placeholders, pulse animation
   
   e) MenuEmptyState — SVG тарелка + «Ресторан пока не добавил меню»

4. Интегрировать в RestaurantDetailScreen — как таб или секция

Анимации:
- Cards: FadeInDown.delay(index * 30) entering
- Category tabs: smooth scroll + underline animated width+translateX
- Detail sheet: spring slide-up
- Images: expo-image blurhash + fade transition 300ms

Стиль: Warm Minimalism. DM Serif Display для названий. Plus Jakarta Sans для body.
Цвета через тему (light/dark support).

Правила:
- SectionList для виртуализации (не ScrollView)
- expo-image для всех фото
- НЕ использовать AbortSignal.timeout
- i18n: все строки в 4 языках
- TypeScript strict
```

## Промпт 3 — Promotions (Backend + Dashboard + Mobile)

```
Задача: полный цикл акций — CRUD в дашборде, отображение в мобилке.

BACKEND:
1. CRUD API для дашборда:
   POST   /api/restaurants/:id/promotions — создать
   GET    /api/restaurants/:id/promotions — список (с фильтром по status)
   PUT    /api/restaurants/:id/promotions/:pid — обновить
   DELETE /api/restaurants/:id/promotions/:pid — удалить
   PATCH  /api/restaurants/:id/promotions/:pid/status — сменить статус
   POST   /api/restaurants/:id/promotions/:pid/image — загрузить баннер в R2
   GET    /api/restaurants/:id/promotions/:pid/stats — viewCount, clickCount, bookingCount

2. Public API для мобилки:
   GET /api/public/restaurants/:id/promotions — только ACTIVE, не истекшие, lang param
   GET /api/public/promotions/featured — top 10 highlighted из разных ресторанов, сортировка по totalScore + recency
   POST /api/public/promotions/:id/view — increment viewCount
   POST /api/public/promotions/:id/click — increment clickCount

3. Cron job: promotion-expiry (каждый час) — ACTIVE + endDate < now() → EXPIRED

DASHBOARD (apps/web-dashboard):
4. Страница /promotions:
   - Табы: Активные / Черновики / Завершённые / Все
   - Список карточек с: статус badge, название, тип, расписание, метрики (views/clicks/bookings)
   - Действия: Пауза, Редактировать, Удалить
   
5. Create/Edit Modal:
   - Title + Description с табами языков (EN/PL/RU/UK)
   - Type selector: 5 типов с иконками (radio cards)
   - Dynamic form по типу:
     DISCOUNT → discountPercent (slider 5-50%) или discountAmount
     HAPPY_HOUR → recurringDays (checkboxes пн-вс) + timeStart/timeEnd (time pickers)
     EVENT → дата + время
     BOOKING_BONUS → описание бонуса
   - startDate + endDate (date pickers, endDate optional)
   - Image upload (drag-drop, preview)
   - Conditions (textarea)
   - PromoCode (optional text input)
   - isHighlighted toggle с tooltip
   
6. Stats секция: views → clicks → bookings funnel bar + line chart по дням (Recharts)

MOBILE:
7. PromotionCard компонент:
   - Баннер фото: full width aspect 2:1, border-radius 16
   - Type badge в углу (цветной: red=discount, purple=happy_hour, blue=event, green=offer, accent=bonus)
   - Title: heading3, DM Serif Display
   - Description: 2-3 строки
   - Schedule: дни + время для recurring
   - Countdown: если endDate < 24h → живой таймер «⏰ Осталось Xч Yмин» (обновление каждую минуту)
   - PromoCode: «Код: DINTO20» + copy button
   - CTA «Забронировать» → booking screen (передать promoId)

8. PromotionsSection на экране ресторана — между инфо и меню

9. FeaturedPromotionsBanner на главном экране:
   - Horizontal FlatList с snap
   - Карточки: фото фон + gradient overlay + текст
   - Pagination dots
   - Auto-scroll 5s
   - Aspect 3:2, border-radius 16

Анимации:
- Cards: FadeInUp.delay(index * 60)
- Countdown: subtle scale pulse на цифрах
- Copy promo code: icon → checkmark + haptic Light
- Carousel: auto-scroll + snap

Стиль: Warm Minimalism. Badges полупрозрачные. Без кричащих цветов.

Правила:
- Skeleton loaders для всех loading states
- Empty states если нет акций → секция скрыта (не пустая карточка)
- Dark mode support
- i18n 4 языка
- Haptic на CTA и copy actions
```

## Промпт 4 — Boost / Ads System (Backend + Stripe + Dashboard)

```
Задача: система продвижения ресторанов с оплатой через Stripe.

BACKEND:
1. API:
   POST /api/restaurants/:id/boosts
     Body: { level: "BOOST"|"BOOST_PRO"|"BOOST_PREMIUM", days: 7|14|30 }
     Логика:
       - Вычислить dailyRate по level (BOOST=15, BOOST_PRO=35, BOOST_PREMIUM=65 PLN)
       - totalAmount = dailyRate × days
       - Создать Boost record (status=PENDING)
       - Создать Stripe PaymentIntent (amount=totalAmount, currency=pln)
       - Вернуть { boostId, stripeClientSecret, amount, currency }
   
   GET /api/restaurants/:id/boosts
     Response: { activeBoost: {...}|null, history: [{...}] }
   
   GET /api/restaurants/:id/boosts/:bid/stats
     Response: { impressions, clicks, bookings, ctr, costPerBooking, daysRemaining }
   
   POST /api/restaurants/:id/boosts/:bid/cancel
     Логика: вычислить оставшиеся дни, refund через Stripe, status=CANCELLED

2. Stripe webhook handler POST /api/webhooks/stripe/boost:
   payment_intent.succeeded → Boost status=ACTIVE, paidAt=now(), Restaurant.boostScore = level score
   payment_intent.payment_failed → уведомить (email + Socket.io)

3. Cron jobs:
   boost-expiry (каждый час):
     - Boost WHERE endDate < now() AND status=ACTIVE → status=EXPIRED
     - Restaurant.boostScore = 0 для этих ресторанов
   
   score-recalculation (каждые 6 часов):
     - Для каждого Restaurant:
       baseScore = googleRating*20 + min(reviewCount*0.5, 100) + completeness*50 + bookingRate*30 + recentActivity*20
       totalScore = baseScore + boostScore
     - UPDATE Restaurant SET baseScore, totalScore

4. Обновить GET /api/public/restaurants endpoint:
   - Default сортировка: ORDER BY totalScore DESC, googleRating DESC
   - Добавить поле boostLevel в response (для badges в мобилке)

DASHBOARD:
5. Страница /boost:
   - Если есть активный буст: карточка с уровнем, датой окончания, метриками, кнопки Продлить/Повысить
   - Если нет: три карточки выбора (Boost/Pro/Premium) с features и ценами
   - Period selector: 7/14/30 дней
   - Total display: dailyRate × days
   - Stripe Elements payment form (Card Element)
   - История бустов: таблица с метриками

6. Дизайн карточек уровней:
   Boost: простая карточка, accent border
   Pro: карточка с «Популярный» badge, thicker border
   Premium: карточка с gradient border, gold accent
   Анимация: hover scale 1.02 + shadow

MOBILE:
7. В карточке ресторана (RestaurantCard):
   BOOST_PREMIUM: subtle golden border (1px, gradient), badge «⭐ Премиум» (small, gold bg)
   BOOST_PRO: badge «🔥 Топ» (accent bg)
   BOOST: badge «✨ Рекомендуем» (light accent bg)
   Без буста: без бейджа

8. На главном экране: секция «✨ Рекомендуем» (карусель promoted ресторанов)
   - Только BOOST_PRO и BOOST_PREMIUM
   - Premium первыми
   - Горизонтальный scroll, snap
   - Если нет promoted → секция скрыта

9. Сортировка списка по totalScore desc (default)

Правила:
- Boost метки SUBTLE — не навязчивая реклама
- Stripe: использовать существующую интеграцию, добавить новый payment type
- Все суммы в минимальных единицах для Stripe (1500 = 15.00 PLN)
- Refund: пропорциональный за неиспользованные дни
- Dark mode для всех новых компонентов
- Skeleton loaders на странице boost
```

## Промпт 5 — Restaurant Amenities (Dashboard + Mobile)

```
Задача: добавить информацию о парковке и удобствах в дашборд и мобилку.

BACKEND:
1. PUT /api/restaurants/:id/amenities
   Body: все amenity поля (hasParking, parkingType, parkingDetails, hasWifi, ...)
   Валидация: parkingType in ["free", "paid", "street", "valet"] если hasParking=true
   Response: 200 + обновлённый restaurant

2. Обновить GET /api/public/restaurants/:id — добавить все amenity поля в response
3. Обновить GET /api/public/restaurants (список) — добавить краткие amenity флаги

DASHBOARD:
4. В Settings или отдельная секция «Удобства и сервис»:
   - Grouped toggles с анимированным expand для деталей
   - При toggle ON: expand animated → показать поле деталей
   - При toggle OFF: collapse → скрыть детали
   
   Группы:
   a) Парковка: hasParking toggle → parkingType dropdown + parkingDetails input
   b) Wi-Fi: hasWifi toggle → wifiDetails input
   c) Терраса: hasOutdoorSeating → outdoorDetails
   d) Для детей: hasChildMenu + hasHighChairs (два toggle)
   e) Развлечения: hasLiveMusic → liveMusicDetails
   f) Доступность: wheelchairAccessible toggle
   g) Питомцы: petsAllowed toggle
   h) Курение: isSmokingAllowed toggle
   i) Кондиционер: hasAirConditioning toggle
   j) Приватные залы: hasPrivateRooms → privateRoomDetails
   k) Способы оплаты: multi-checkbox (cash, card, apple_pay, google_pay)
   l) Ценовой сегмент: 1-4 selector (💲-💲💲💲💲)
   m) Средний чек: number input + currency dropdown

5. Autosave: debounce 2s после любого изменения ИЛИ кнопка «Сохранить»
6. Анимация: framer-motion AnimatePresence для expand/collapse деталей

MOBILE:
7. AmenitiesRow компонент — горизонтальный ряд иконок:
   - Только те amenities где значение true
   - Каждая: иконка 24×24 (stroke, gray-600) + caption подпись
   - Тап → tooltip с деталями (или маленький bottom sheet)
   - Если > 5 видимых → горизонтальный scroll + «ещё +N»

8. ParkingBadge — специальный компонент:
   - Зелёный для free, серый для paid
   - Текст: «🅿️ Бесплатная парковка» / «🅿️ Платная парковка»
   - Тап → детали

9. PriceRange — визуальные 💲 (filled/unfilled из 4)

10. PaymentMethodsRow — иконки способов оплаты

11. Расположение на экране ресторана: под адресом/часами, перед акциями и меню

12. В карточке ресторана (листинг): компактные иконки 16×16 под рейтингом
    ⭐ 4.7 (128) · 💲💲 · 🅿️ · 📶 · 🌿

Стиль:
- Иконки: Lucide icons, stroke style
- Тёплые серые тона, accent для active states
- Dark mode: icons gray-400

Правила:
- Если все amenities false → секция полностью скрыта
- i18n для всех labels
- Skeleton: ряд из 5 серых кружков при loading
```

## Промпт 6 — Bug Fixes & Data Consistency Review

```
Задача: комплексный review кода на баги и несовместимости.

Запустить qa-reviewer субагент с инструкциями:

1. API Security Review:
   - Проверить все public API эндпоинты: не утекают ли приватные поля
   - Проверить auth middleware на всех protected routes
   - Role-based access: owner > manager > staff permissions
   - Rate limiting на public endpoints

2. Data Consistency:
   - Cascade delete rules: restaurant → menu, promotions, boosts
   - Unique constraints: email, restaurant slug
   - NOT NULL constraints на обязательных полях
   - Default values для новых полей (не ломают существующие записи)

3. Frontend-Backend Sync:
   - Socket.io events: menu:updated, promotion:updated, boost:activated
   - Timezone: все даты UTC в базе, отображение в local timezone
   - Currency formatting: PLN (zł), UAH (₴), EUR (€)

4. Mobile Compatibility:
   - Grep для AbortSignal.timeout — должно быть 0 результатов
   - Все imports из expo-* установлены через npx expo install
   - Проверить app.json/app.config.js на корректность

5. Dashboard Build:
   - npx next build — нет ошибок
   - Prisma schema sync: npx prisma validate
   - Environment variables: все required vars документированы

6. Performance:
   - Все list API с pagination
   - N+1 queries: проверить Prisma includes
   - Image URLs: все через R2 CDN

Вывести список найденных проблем с приоритетом (Critical / High / Medium / Low)
и конкретными инструкциями по исправлению каждой.

Правила:
- qa-reviewer: ТОЛЬКО Read, Bash, Glob, Grep — БЕЗ Write/Edit
- Описывать проблемы, а не исправлять
- Формат: файл → строка → проблема → решение
```

## Промпт 7 — Cron Jobs & Background Tasks

```
Задача: создать cron jobs для автоматического обслуживания.

1. promotion-expiry cron (каждый час):
   - Найти: Promotion WHERE endDate < NOW() AND status = 'ACTIVE'
   - Обновить: status = 'EXPIRED'
   - Логировать: count обновлённых

2. boost-expiry cron (каждый час):
   - Найти: Boost WHERE endDate < NOW() AND status = 'ACTIVE'
   - Обновить: Boost status = 'EXPIRED'
   - Обновить: Restaurant.boostScore = 0 для этих ресторанов
   - Пересчитать: Restaurant.totalScore = baseScore + 0
   - Логировать: count обновлённых

3. score-recalculation cron (каждые 6 часов):
   - Для каждого Restaurant:
     a) googleRating × 20 (max из GoogleReview)
     b) reviewCount × 0.5 (cap 100)
     c) completeness × 50:
        - hasPhoto +10, hasMenu +15, hasDescription +10, hasHours +10, hasAddress +5
     d) bookingRate × 30: confirmed/(confirmed+cancelled) за 30 дней
     e) recentActivity × 20: обновления за 7 дней (menu/promo/photo edits)
   - baseScore = sum(a+b+c+d+e)
   - totalScore = baseScore + boostScore
   - Bulk UPDATE

4. Зарегистрировать cron jobs в существующей cron системе (проверить как текущие cron jobs запускаются — node-cron, или Railway cron, или отдельный процесс).

5. Добавить health check endpoint: GET /api/cron/health — статус последнего запуска каждого job.

Правила:
- Транзакции для bulk updates
- Error handling с retry (max 3)
- Логирование: время запуска, count обновлённых, ошибки
- Не блокировать основной API процесс
```

---

# 8. Порядок выполнения

```
Промпт 1: Migrations          ← ПЕРВЫЙ (всё зависит от схемы)
Промпт 6: Bug Fix Review      ← ВТОРОЙ (найти проблемы ДО новых фич)
Промпт 2: Menu API + Mobile   ← читает данные, не зависит от других
Промпт 5: Amenities           ← простые CRUD, быстрая реализация
Промпт 3: Promotions          ← сложнее, зависит от миграций
Промпт 7: Cron Jobs           ← нужен после promotions и boosts
Промпт 4: Boost/Ads + Stripe  ← самый сложный, последний
```

Каждый промпт копируется в Claude Code целиком. Каждый выполняется автономно.

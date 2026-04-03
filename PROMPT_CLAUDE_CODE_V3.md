# ПРОМПТ ДЛЯ CLAUDE CODE — Фаза 2 ПОЛНАЯ

Прочитай SPECIFICATION_V3.md. Все 7 модулей из Фазы 1 уже реализованы. Теперь нужно реализовать модули 8-21 — полная доводка до рабочего продукта.

## Контекст
- Backend: stolik-production.up.railway.app (Railway, auto-deploy)
- Dashboard: stolik-dashboard.vercel.app (Vercel, auto-deploy)
- Mobile: Expo + React Native (Expo Go 54)
- Admin: admin@stolik.pl / admin123
- ВАЖНО: не используй AbortSignal.timeout — Hermes не поддерживает. Используй AbortController + setTimeout

## BATCH 1: Backend Foundation (~4ч)

### 1.1 Prisma миграция
Добавь в schema.prisma:
- model PasswordReset (id, token unique, userId FK, expiresAt, usedAt, createdAt)
- model AbandonedBooking (id, userId FK, restaurantId FK, date, time, guests, notificationSent, createdAt)
- User: добавить avatarUrl String?, expoPushToken String?, lastActiveAt DateTime?
- Restaurant: добавить googlePlaceId String?, googleRating Float?, googleReviewCount Int?, googleReviewsCache Json?, googleReviewsUpdatedAt DateTime?
- Booking: добавить pushReminderSent Boolean @default(false)

Запусти: npx prisma migrate dev --name phase2_models

### 1.2 Аудит существующих API
Проверь что ВСЕ эндпоинты из SPECIFICATION_V3.md существуют и работают. Если нет — создай.
Особое внимание:
- POST /restaurants → проверить что создаёт с ownerId
- POST /api/upload → проверить multer + R2. Если R2 не настроен → добавить fallback на local /uploads/
- GET /guests?restaurantId=X → проверить
- Socket.io emit в POST/PATCH/DELETE /bookings

### 1.3 Новые эндпоинты
- POST /auth/forgot-password (email → PasswordReset → send email)
- POST /auth/reset-password (token + newPassword → update → revoke tokens)
- PATCH /auth/profile (firstName, lastName, phone, avatarUrl)
- GET /admin/users (пагинация, фильтр по role)
- GET /admin/stats (totalRestaurants, activeRestaurants, totalBookings, totalUsers, bookingsToday)
- PATCH /admin/users/:id/role
- GET /restaurants/:id/reviews (Google Places cache)
- GET /restaurants/search-google?query=X (Google Places autocomplete)
- POST /restaurants/quick-create (googlePlaceId + tables → auto-fill)
- POST /push/register-token (expoPushToken)
- POST /bookings/abandon (abandoned booking tracking)

### 1.4 Upload фикс
Проверить POST /api/upload:
- multer middleware для multipart
- R2 upload через @aws-sdk/client-s3 (S3-compatible)
- Если нет R2 env vars → fallback: save to ./uploads/, serve via express.static
- Max 5MB, только image/*
- CORS для Vercel origin

git add -A && git commit -m "feat: phase2 backend foundation — migrations, new endpoints, upload fix"

## BATCH 2: Dashboard (~4ч)

### 2.1 Admin Dashboard
/admin layout — отдельный от /dashboard, sidebar: Обзор, Рестораны, Пользователи
Middleware: role !== ADMIN → redirect /dashboard

/admin (Overview):
- 4 metric cards (GET /admin/stats)
- Таблица последних бронирований

/admin/restaurants:
- Таблица всех ресторанов с поиском и фильтром по статусу
- Кнопки Approve/Deactivate/View
- View → /admin/restaurants/[id]

/admin/restaurants/[id]:
- Re-use компонентов из /dashboard но read-only
- Banner "Viewing as Admin: {name}"
- Back button

/admin/users:
- Таблица, фильтр по роли, изменение роли

### 2.2 Owner Flow проверка
Пройди весь flow: /register (OWNER) → /onboarding (4 шага) → Go Live → /dashboard
Починить всё что сломано.

### 2.3 Forgot Password (Dashboard)
/forgot-password: поле email, кнопка отправить, success state
/reset-password?token=X: новый пароль + подтверждение

### 2.4 Google Place ID в /dashboard/profile
Добавить поле "Google Place ID" с поиском

git add -A && git commit -m "feat: admin dashboard, owner flow fix, forgot password"

## BATCH 3: Mobile Features (~4ч)

### 3.1 Forgot Password
/(auth)/forgot-password: email → отправить → success
/(auth)/reset-password: token из deep link → новый пароль
Добавить ссылку "Забыли пароль?" на login screen

### 3.2 Фильтры
SearchScreen: search bar + горизонтальные чипы (кухня, цена)
FilterModal: полный набор фильтров + "Показать N ресторанов"
Zustand store для фильтров

### 3.3 Карта
MapScreen: загрузить ВСЕ published рестораны → маркеры
Тап → bottom sheet с превью
CitySelector в header: "Warszawa ▼" → модалка с городами
Хардкод городов: Warszawa, Kraków, Wrocław, Gdańsk, Poznań
Дефолт: Warszawa, сохранять выбор в AsyncStorage

### 3.4 Фото профиля
ProfileScreen: круглый аватар сверху
Тап → expo-image-picker → upload → PATCH /auth/profile
Если нет фото → инициалы на цветном фоне

### 3.5 Меню в RestaurantDetail
Добавить таб "Меню" (между "Инфо" и "Отзывы")
GET /restaurants/:id/menu → категории + позиции
Каждая позиция: название, описание, цена, фото

### 3.6 Google Reviews
Секция "Отзывы" в RestaurantDetail
GET /restaurants/:id/reviews → звёзды + список
Кнопка "Все отзывы в Google Maps"

git add -A && git commit -m "feat: mobile — filters, map markers, profile photo, menu, reviews, forgot password"

## BATCH 4: Smart Push Notifications (~3ч)

### 4.1 Push token registration
При запуске мобилки: registerForPushNotificationsAsync → POST /push/register-token
Обновлять User.lastActiveAt при каждом запуске

### 4.2 Abandoned booking
При уходе со страницы бронирования: POST /bookings/abandon
При завершении бронирования: DELETE abandoned booking

### 4.3 Cron jobs (packages/api/src/cron/)
Установить: npm install node-cron expo-server-sdk

reminders.ts (каждые 5 мин): SMS напоминания
abandoned-bookings.ts (каждые 10 мин): push для брошенных бронирований (20 мин)
booking-reminders-push.ts (каждые 5 мин): push за 2ч до визита
re-engagement.ts (раз в день 12:00): push неактивным (7+ дней)

Подключить все cron jobs в index.ts/app.ts

### 4.4 Mobile — обработка push
Foreground: toast
Background tap: navigate по data.type (abandoned/reminder/reengagement)

git add -A && git commit -m "feat: smart push notifications — abandoned, reminders, re-engagement"

## BATCH 5: Quick Connect (~2ч)

### 5.1 Quick Onboarding
Новый /onboarding с поиском Google Places
Шаг 1: ввести название → autocomplete
Шаг 2: подтвердить данные (автозаполнение)
Шаг 3: добавить столики → Publish
Fallback: "Заполнить вручную" → старый 4-step wizard

git add -A && git commit -m "feat: quick connect — Google Places onboarding"

## BATCH 6: Testing (~1ч)

### 6.1 Обновить smoke test
Добавить тесты для: forgot-password, admin endpoints, upload, push token, quick-create

### 6.2 Запустить
npm run test:smoke → все зелёные

git add -A && git commit -m "feat: updated E2E smoke test"
git push origin master

## ПРАВИЛА
- Коммитить после каждого batch
- Читай SPECIFICATION_V3.md перед каждым модулем
- Socket.io emit при КАЖДОМ изменении бронирования
- НЕ используй AbortSignal.timeout — Hermes не поддерживает
- Все строки в мобилке через i18n t()
- Все API: Zod validation + auth middleware + error handling
- Upload: проверяй наличие R2 env vars, fallback на local

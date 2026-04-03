# SPECIFICATION v3: ПОЛНАЯ СПЕЦИФИКАЦИЯ — Фаза 2

## Содержание
- Модуль 8: Создание ресторана (Owner Flow)
- Модуль 9: Admin Dashboard
- Модуль 10: CRM гостей
- Модуль 11: SMS-напоминания (Twilio + Cron)
- Модуль 12: Forgot Password
- Модуль 13: Google Maps Reviews
- Модуль 14: Меню ресторана — публичный вид + редактор
- Модуль 15: Upload фото ресторана — фикс
- Модуль 16: Фильтры в мобилке
- Модуль 17: Карта со всеми заведениями + выбор города
- Модуль 18: Фото профиля пользователя
- Модуль 19: Quick Connect — онбординг ресторана в 3 клика
- Модуль 20: Smart Push-напоминания (Bolt-style)
- Модуль 21: Connectivity Check
- Связка и порядок реализации

---

## Модуль 8: Создание ресторана через дашборд (Owner Flow)

### User Stories
- Как новый владелец, я хочу зарегистрироваться и создать ресторан через онбординг
- Как владелец, я хочу заполнить инфо пошагово, сохраняя прогресс
- Как владелец, я хочу видеть статус Draft пока не опубликую

### API — проверить что работает
- POST /restaurants — Auth, role=OWNER, создаёт с ownerId = req.user.id
- PATCH /restaurants/:id — ownership check
- POST /api/upload — загрузка в R2
- PATCH /restaurants/:id/publish — isPublished = true

### Экраны
Onboarding 4 шага УЖЕ ЕСТЬ. Проверить:
1. Basic Info (название, адрес, тип кухни, ценовой диапазон)
2. Working Hours (по дням)
3. Photos (обложка + галерея → R2)
4. Tables & Slots
5. "Go Live" → publish → redirect /dashboard

### Бизнес-логика
- После register OWNER → redirect /onboarding
- Ресторан не виден пока isPublished = false
- Минимум для публикации: название, адрес, 1 столик, 1 слот

---

## Модуль 9: Admin Dashboard

### User Stories
- Как админ, я хочу видеть ВСЕ рестораны и переключаться между ними
- Как админ, я хочу approve/deactivate ресторан
- Как админ, я хочу видеть статистику платформы и список пользователей

### Новые API
- GET /admin/users — пагинация, фильтр по role
- GET /admin/stats — {totalRestaurants, activeRestaurants, totalBookings, totalUsers, bookingsToday}
- PATCH /admin/users/:id/role — изменить роль
- GET /admin/restaurants/:id/dashboard — полные данные ресторана для просмотра

### Экраны
/admin (Overview): 4 метрики + график 30 дней + последние бронирования
/admin/restaurants: таблица всех, поиск, фильтр, Approve/Deactivate/View
/admin/restaurants/[id]: дашборд ресторана read-only + banner "Viewing as Admin"
/admin/users: таблица, фильтр по роли, изменение роли

### Бизнес-логика
- role !== ADMIN → redirect /dashboard
- Админ не может создавать бронирования (только просмотр)
- Деактивация → isPublished = false + email владельцу

---

## Модуль 10: CRM гостей

### User Stories
- Как владелец, я хочу видеть всех гостей с историей
- Как владелец, я хочу отмечать VIP и блокировать проблемных

### API — проверить
- GET /guests?restaurantId=X
- GET /guests/:id (с историей бронирований)
- PATCH /guests/:id (VIP, block, notes, tags)

### Бизнес-логика
- GuestProfile создаётся автоматически при первом бронировании
- Заблокированный гость не может бронировать (проверка в POST /bookings)
- totalBookings и lastVisit обновляются при completed

---

## Модуль 11: SMS-напоминания (Twilio + node-cron)

### Реализация
npm install node-cron в packages/api

Файл: packages/api/src/cron/reminders.ts
- Каждые 5 мин: SELECT pending reminders WHERE scheduledAt <= NOW()
- Отправить SMS через Twilio → status = sent
- Retry 3 раза при ошибке

При POST /bookings автоматически создавать:
1. type=confirmation, scheduledAt=NOW()
2. type=reminder, scheduledAt=bookingDate - 2 hours

### SMS-шаблоны
Confirmation: "Stolik: Бронь подтверждена! {restaurant}, {date} {time}, {guests} гост. Адрес: {address}"
Reminder: "Stolik: Напоминаем о визите сегодня! {restaurant} в {time}. Адрес: {address}"

---

## Модуль 12: Forgot Password

### User Stories
- Как гость/владелец, я хочу сбросить пароль если забыл
- Как пользователь, я хочу получить email со ссылкой для сброса

### Модель данных
Новая таблица:
```prisma
model PasswordReset {
  id        String    @id @default(uuid())
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([token])
  @@index([userId])
}
```

### API

**POST /auth/forgot-password**
- Body: {email: string}
- Логика: найти user по email → создать PasswordReset (token=UUID, expiresAt=+1 hour) → отправить email
- Email содержит ссылку: {DASHBOARD_URL}/reset-password?token={token} ИЛИ deep link для мобилки
- Response: 200 всегда (не раскрываем существует ли email)
- Rate limit: 3 запроса в 15 минут на IP

**POST /auth/reset-password**
- Body: {token: string, newPassword: string}
- Логика: найти PasswordReset → проверить не expired/used → обновить пароль → revoke ALL refresh tokens → usedAt = now()
- Response: 200 | 400 (invalid token) | 410 (expired)

### Экраны

**Mobile — ForgotPasswordScreen** (/forgot-password)
- Поле email
- Кнопка "Отправить ссылку"
- Состояния: default, loading, success ("Проверьте почту"), error
- Ссылка "Вернуться к входу"

**Mobile — ResetPasswordScreen** (/reset-password?token=X)
- Поля: новый пароль, подтверждение
- Кнопка "Сменить пароль"
- Успех → redirect на login с toast "Пароль изменён"

**Dashboard — аналогичные страницы:**
- /forgot-password
- /reset-password?token=X

### Крайние случаи
- Email не существует → всё равно 200 + "Проверьте почту" (безопасность)
- Token expired → "Ссылка истекла. Запросите новую"
- Пользователь запрашивает повторно → старый token инвалидируется, новый создаётся

---

## Модуль 13: Google Maps Reviews

### User Stories
- Как гость, я хочу видеть рейтинг и отзывы ресторана с Google Maps
- Как владелец, я хочу привязать Google Place ID к своему ресторану

### Модель данных
Добавить поля в Restaurant:
```prisma
// Добавить в существующую модель Restaurant:
googlePlaceId    String?
googleRating     Float?
googleReviewCount Int?
googleReviewsCache Json?   // кэш последних 5 отзывов
googleReviewsUpdatedAt DateTime?
```

### API

**PATCH /restaurants/:id** — владелец добавляет googlePlaceId

**GET /restaurants/:id/reviews**
- Если googleReviewsUpdatedAt < 24 часа назад → вернуть кэш
- Иначе → fetch Google Places API → обновить кэш → вернуть
- Response: {rating, reviewCount, reviews: [{author, rating, text, date, photoUrl}]}

**Серверная логика:**
```javascript
// Google Places API (New)
const response = await fetch(
  `https://places.googleapis.com/v1/places/${placeId}`,
  {
    headers: {
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'rating,userRatingCount,reviews'
    }
  }
);
```

### Экраны

**Mobile — RestaurantDetail** (дополнить существующий)
- Секция "Отзывы Google" под описанием
- Звёзды + рейтинг + количество отзывов
- Список 5 последних отзывов (автор, текст, рейтинг, дата)
- Кнопка "Все отзывы в Google Maps" → открыть URL

**Dashboard — Profile** (дополнить)
- Поле "Google Place ID" с подсказкой как найти
- Кнопка "Найти мой ресторан" → поиск по названию через Places API
- После привязки → показать текущий рейтинг

### Крайние случаи
- Нет Google Places API key → скрыть секцию отзывов, показать placeholder
- Place ID неверный → "Ресторан не найден в Google Maps"
- API quota exceeded → вернуть кэш даже если старый

---

## Модуль 14: Меню — публичный вид + редактор

### User Stories
- Как гость, я хочу видеть меню ресторана в приложении перед бронированием
- Как владелец, я хочу добавлять/редактировать меню через дашборд
- Как владелец, я хочу добавлять фото блюд

### API — проверить
- GET /restaurants/:id/menu — публичный (без auth), категории + позиции
- POST /menu-categories — создать категорию (auth, ownership)
- PATCH /menu-categories/:id — обновить
- DELETE /menu-categories/:id — удалить
- POST /menu-items — создать позицию (auth, ownership)
- PATCH /menu-items/:id — обновить
- DELETE /menu-items/:id — удалить

### Экраны

**Mobile — RestaurantDetail** (добавить таб "Меню")
- Табы: "Инфо" | "Меню" | "Отзывы"
- Меню: список категорий (Закуски, Основные, Десерты, Напитки)
- Каждая категория раскрывается → список позиций: название, описание, цена, фото
- Если нет фото → placeholder иконка

**Dashboard — /dashboard/menu** (УЖЕ ЕСТЬ, проверить)
- Список категорий с drag-and-drop порядком
- Добавить категорию / позицию
- Upload фото блюда → R2
- Inline editing (название, цена, описание)
- Toggle "Доступно" для каждой позиции

### Крайние случаи
- Меню пустое → "Ресторан пока не добавил меню"
- Фото не загрузилось → placeholder, retry кнопка

---

## Модуль 15: Upload фото ресторана — фикс

### Проблема
Upload фото может не работать если R2 credentials не настроены в Railway env.

### Чеклист для фикса
1. Проверить что POST /api/upload существует и обрабатывает multipart/form-data
2. Проверить multer middleware (или аналог)
3. Проверить что R2 env vars заданы: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
4. Если R2 не настроен → fallback на local storage (/uploads/) для development
5. Проверить CORS для upload с дашборда (Vercel origin)

### API
POST /api/upload
- Content-Type: multipart/form-data
- Field: file (image/jpeg, image/png, image/webp)
- Max size: 5MB
- Response: 200 {url: "https://r2.stolik.pl/photos/uuid.jpg"} | 400 | 413 (too large)

### Места где используется upload:
- Onboarding шаг 3 (coverImage + photos gallery)
- /dashboard/profile (обновление фото)
- /dashboard/menu (фото блюд)
- Mobile — фото профиля пользователя (Модуль 18)

### Фикс
Если R2 не настроен — добавить fallback:
```javascript
if (!process.env.R2_ACCESS_KEY_ID) {
  // Save to local /uploads/ directory
  // Serve via express.static
  // URL: /uploads/filename.jpg
}
```

---

## Модуль 16: Фильтры в мобилке

### User Stories
- Как гость, я хочу фильтровать рестораны по типу кухни
- Как гость, я хочу фильтровать по ценовому диапазону
- Как гость, я хочу фильтровать по рейтингу
- Как гость, я хочу сортировать по расстоянию, рейтингу, популярности

### API
GET /restaurants — добавить query params:
- ?cuisine=italian,japanese (множественный выбор)
- ?priceRange=1,2 (1=$, 2=$$, 3=$$$, 4=$$$$)
- ?minRating=4.0
- ?sortBy=distance|rating|popular (popular = по количеству бронирований)
- ?lat=52.23&lng=21.01 (для сортировки по расстоянию)
- ?city=warsaw (фильтр по городу — см. Модуль 17)
- ?search=nazwa (поиск по названию)

### Экраны

**SearchScreen** (таб Search) — дополнить
- Search bar сверху (поиск по названию)
- Горизонтальные чипы фильтров под search bar:
  - Кухня: Итальянская, Японская, Польская, Грузинская, Американская, Мексиканская...
  - Цена: $, $$, $$$, $$$$
  - Рейтинг: 4+, 4.5+
- Кнопка "Фильтры" → модалка с полным набором
- Active filters показываются как чипы с × для удаления

**FilterModal**
- Тип кухни: multi-select чипы
- Ценовой диапазон: 1-4 кнопки
- Минимальный рейтинг: slider
- Сортировка: radio (Ближайшие / Лучший рейтинг / Популярные)
- Кнопки: "Сбросить" | "Показать N ресторанов"

### Бизнес-логика
- Фильтры сохраняются в Zustand store (не сбрасываются при навигации)
- При изменении фильтра → re-fetch с новыми params
- Показывать количество результатов: "Найдено 12 ресторанов"

---

## Модуль 17: Карта со всеми заведениями + выбор города

### User Stories
- Как гость, я хочу видеть ВСЕ рестораны на карте (не только при поиске)
- Как гость, я хочу выбрать город для поиска
- Как гость, я хочу тапнуть на метку и увидеть превью ресторана

### API
GET /restaurants — уже возвращает latitude, longitude
GET /cities — новый эндпоинт:
- Response: [{name: "Warszawa", lat: 52.23, lng: 21.01, count: 45}, {name: "Kraków", ...}]
- Или хардкод на первое время (MVP — только Варшава, но UI готов для расширения)

### Экраны

**MapScreen** (таб Map) — переделать
- При открытии: загрузить ВСЕ published рестораны
- Каждый ресторан = маркер (зелёный пин) с позицией lat/lng
- Кластеризация при zoom out (react-native-maps clustering или Leaflet.markercluster)
- Тап на маркер → bottom sheet с превью:
  - Фото, название, кухня, рейтинг, цена
  - Кнопка "Забронировать" → navigate to /restaurant/[id]

**CitySelector** (в header Map и Search)
- Текущий город показан в header: "Warszawa ▼"
- Тап → модалка со списком городов
- Выбор → карта центрируется на город + фильтр ресторанов по proximity

### MVP города (хардкод)
```javascript
const CITIES = [
  { name: 'Warszawa', lat: 52.2297, lng: 21.0122, zoom: 13 },
  { name: 'Kraków', lat: 50.0647, lng: 19.9450, zoom: 13 },
  { name: 'Wrocław', lat: 51.1079, lng: 17.0385, zoom: 13 },
  { name: 'Gdańsk', lat: 54.3520, lng: 18.6466, zoom: 13 },
  { name: 'Poznań', lat: 52.4064, lng: 16.9252, zoom: 13 },
];
```

### Бизнес-логика
- Дефолт: Warszawa (или определить по GPS если разрешено)
- Выбранный город сохраняется в AsyncStorage
- При смене города → re-fetch ресторанов + re-center карта
- Маркеры подгружаются лениво (только visible region) если > 100 ресторанов

### Крайние случаи
- GPS не разрешён → дефолт Warszawa
- Нет ресторанов в городе → "В этом городе пока нет ресторанов"
- Медленная загрузка маркеров → skeleton markers

---

## Модуль 18: Фото профиля пользователя

### User Stories
- Как гость, я хочу загрузить аватар в свой профиль
- Как гость, я хочу видеть свою фотку в табе Profile

### Модель данных
Добавить поле в User:
```prisma
// Добавить в существующую модель User:
avatarUrl    String?
```

### API
- PATCH /auth/profile — Auth required, body: {firstName?, lastName?, phone?, avatarUrl?}
- POST /api/upload (уже есть) — загрузить фото → получить URL → PATCH /auth/profile

### Экраны

**Mobile — ProfileScreen** (таб Profile)
- Аватар сверху (круглый, 80px)
- Если нет фото → инициалы (первые буквы имени) на цветном фоне
- Тап на аватар → ActionSheet: "Сделать фото" | "Выбрать из галереи" | "Удалить"
- expo-image-picker для выбора/фото
- После выбора → upload → PATCH profile → обновить UI

### Бизнес-логика
- Максимум 2MB для аватара
- Resize до 300x300 перед upload (expo-image-manipulator)
- Кэшировать аватар локально
- При удалении → avatarUrl = null → показать инициалы

---

## Модуль 19: Quick Connect — Онбординг ресторана в 3 клика

### User Stories
- Как владелец, я хочу подключить ресторан максимально быстро
- Как владелец, я хочу чтобы система сама подтянула данные из Google Maps

### Концепция
Вместо 4-шагового онбординга → "Quick Start":
1. **Клик 1**: Введи название ресторана → автопоиск через Google Places API
2. **Клик 2**: Выбери свой ресторан из результатов → автозаполнение (адрес, фото, часы работы, рейтинг, телефон)
3. **Клик 3**: Добавь столики (простой интерфейс: "Сколько столиков? На сколько гостей?") → Publish

### API
**GET /restaurants/search-google?query=nazwa+restauracji**
- Ищет через Google Places API
- Response: [{placeId, name, address, rating, photos, openingHours, phone}]

**POST /restaurants/quick-create**
- Body: {googlePlaceId, tables: [{capacity: 2, count: 5}, {capacity: 4, count: 3}]}
- Логика:
  1. Fetch данные из Google Places по placeId
  2. Создать Restaurant с автозаполненными данными
  3. Создать Table записи
  4. Создать дефолтные слоты (каждый час с 12:00 до 22:00)
  5. isPublished = true сразу
- Response: 201 {restaurant}

### Экраны

**QuickOnboardingScreen** (/onboarding — заменить дефолт)
- Шаг 1: Search bar "Найдите ваш ресторан"
  - Autocomplete при вводе (Google Places)
  - Список результатов: название + адрес + фото
- Шаг 2: Подтверждение данных
  - Показать: название, адрес, фото, часы (автозаполнено)
  - Кнопка "Это мой ресторан"
  - Ссылка "Это не тот ресторан" → вернуться к поиску
- Шаг 3: Столики
  - Простой UI: "+ Добавить тип столика"
  - Каждый тип: вместимость (2/4/6/8) × количество
  - Кнопка "Запустить!" → POST quick-create → redirect /dashboard

**Fallback**: "Не нашли? Заполните вручную" → старый 4-шаговый онбординг

### Крайние случаи
- Google Places API key отсутствует → сразу показать ручной онбординг
- Ресторан уже зарегистрирован → "Этот ресторан уже на Stolik"
- Нет фото в Google → placeholder + предложение загрузить

---

## Модуль 20: Smart Push-напоминания (Bolt-style)

### User Stories
- Как гость, если я начал бронировать но не закончил, я хочу получить push через 20 минут
- Как гость, я хочу получить push за 2 часа до визита (вместо / в дополнение к SMS)
- Как гость, если я давно не заходил, я хочу получить push "Вернитесь и забронируйте"

### Модель данных
Добавить поле в User:
```prisma
// Добавить в User:
expoPushToken    String?
lastActiveAt     DateTime?
```

Новая таблица:
```prisma
model AbandonedBooking {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  restaurantId    String
  restaurant      Restaurant @relation(fields: [restaurantId], references: [id])
  date            String?
  time            String?
  guests          Int?
  notificationSent Boolean @default(false)
  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([notificationSent, createdAt])
}
```

### API

**POST /push/register-token** — Auth required
- Body: {expoPushToken: string}
- Обновить User.expoPushToken

**POST /bookings/abandon** — Auth required
- Body: {restaurantId, date?, time?, guests?}
- Вызывается когда пользователь УХОДИТ со страницы бронирования не завершив
- Создаёт AbandonedBooking

**Серверная логика — Expo Push Notifications:**
```javascript
import { Expo } from 'expo-server-sdk';
const expo = new Expo();

async function sendPush(pushToken, title, body, data = {}) {
  if (!Expo.isExpoPushToken(pushToken)) return;
  await expo.sendPushNotificationsAsync([{
    to: pushToken,
    title,
    body,
    data,
    sound: 'default',
    badge: 1,
  }]);
}
```

### Cron Jobs (добавить в packages/api/src/cron/)

**abandoned-bookings.ts** — каждые 10 минут:
```
SELECT * FROM AbandonedBooking
WHERE notificationSent = false
  AND createdAt <= NOW() - INTERVAL '20 minutes'
  AND createdAt >= NOW() - INTERVAL '24 hours'
```
Для каждого → отправить push: "Вы не завершили бронирование в {restaurant}. Забронировать?"
→ notificationSent = true
→ Push data: {type: 'abandoned', restaurantId} → при тапе → открыть экран бронирования

**booking-reminders-push.ts** — каждые 5 минут:
```
SELECT b.*, u.expoPushToken FROM Booking b
JOIN User u ON b.guestId = u.id  
WHERE b.status = 'confirmed'
  AND b.date = CURRENT_DATE
  AND b.time - INTERVAL '2 hours' <= NOW()
  AND b.pushReminderSent = false
  AND u.expoPushToken IS NOT NULL
```
Push: "Через 2 часа у вас столик в {restaurant}!"
→ Добавить поле pushReminderSent (boolean) в Booking

**re-engagement.ts** — раз в день (12:00):
```
SELECT * FROM User
WHERE lastActiveAt <= NOW() - INTERVAL '7 days'
  AND expoPushToken IS NOT NULL
  AND role = 'GUEST'
```
Push: "Давно не заходили! Посмотрите новые рестораны в {city}"
→ Максимум 1 re-engagement push в неделю на пользователя

### Mobile — интеграция

**При запуске приложения:**
1. registerForPushNotificationsAsync() → получить token
2. POST /push/register-token
3. Обновить User.lastActiveAt

**При уходе со страницы бронирования без завершения:**
- useEffect cleanup или AppState listener
- POST /bookings/abandon с текущими данными формы

**При получении push:**
- Foreground: toast notification
- Background/killed: при тапе → navigate по data.type:
  - abandoned → /booking/[restaurantId] с предзаполненными данными
  - reminder → /bookings (список бронирований)
  - reengagement → /(tabs)/home

### Крайние случаи
- Пользователь отключил push → skip, не ломать flow
- Множественные abandoned за один ресторан → отправлять push только один раз
- Пользователь завершил бронирование после abandon → удалить AbandonedBooking
- Rate limit: максимум 3 push в день на пользователя

---

## Модуль 21: Connectivity Check + Full E2E Test

### Автоматический smoke test (обновить)

Добавить в packages/api/tests/smoke.test.ts:

```
Новые шаги:
11. POST /auth/forgot-password → 200
12. GET /admin/stats → 200 + numbers
13. GET /admin/users → 200 + array
14. GET /restaurants/:id/menu → 200
15. GET /restaurants/:id/reviews → 200 (если Google Places key есть)
16. POST /restaurants/quick-create → 201 (если Google key есть)
17. POST /push/register-token → 200
```

### Ручной тест-план

**Flow A: Quick Connect**
1. Register как OWNER → /onboarding
2. Ввести название ресторана → найти в Google
3. Выбрать → автозаполнение → добавить столики → Publish
4. Проверить: ресторан виден в мобилке

**Flow B: Guest бронирование + push**
1. Мобилка → регистрация → разрешить push
2. Найти ресторан → открыть → УЙТИ не забронировав
3. Подождать 20 мин → должен прийти push
4. Тапнуть push → вернуться к бронированию → завершить
5. Проверить: SMS confirmation + push reminder за 2 часа

**Flow C: Admin обзор**
1. admin@stolik.pl → /admin
2. Видеть все рестораны → кликнуть → видеть дашборд
3. Проверить статистику, список пользователей

---

## ПОРЯДОК РЕАЛИЗАЦИИ (для Claude Code)

### Batch 1 — Backend Foundation (~4ч)
1. Аудит и фикс всех существующих API endpoints
2. Новые endpoints: admin/users, admin/stats, forgot-password, reset-password
3. Prisma миграция: PasswordReset, AbandonedBooking, User.avatarUrl, User.expoPushToken, User.lastActiveAt, Restaurant.google* fields, Booking.pushReminderSent
4. Upload фикс (R2 fallback)

### Batch 2 — Dashboard (~4ч)
5. Admin dashboard: overview, restaurants list, restaurant view, users
6. Owner flow проверка: register → onboarding → publish → dashboard
7. Menu editor проверка
8. Google Place ID привязка в profile

### Batch 3 — Mobile Features (~4ч)
9. Forgot password screens
10. Фильтры + FilterModal
11. Карта со всеми маркерами + CitySelector
12. Фото профиля (upload + display)
13. Меню в RestaurantDetail (таб)
14. Google reviews в RestaurantDetail

### Batch 4 — Smart Notifications (~3ч)
15. Push token registration
16. Abandoned booking tracking + cron
17. Push reminders (2ч до визита) + cron
18. Re-engagement push + cron
19. SMS reminders cron

### Batch 5 — Quick Connect + Polish (~2ч)
20. Google Places search для онбординга
21. Quick-create endpoint
22. Quick onboarding UI

### Batch 6 — Testing (~1ч)
23. Обновить smoke test
24. Запустить все тесты
25. Push + commit all

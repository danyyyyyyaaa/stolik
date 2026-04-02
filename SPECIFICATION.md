# SPECIFICATION: Stolik MVP

## Статус модулей

### ✅ Готово (не трогаем)
- AUTH: register/login JWT
- CRUD: restaurants, tables, bookings, guests, menu
- Слоты бронирования с логикой доступности
- Stripe подписки (checkout, portal, webhook)
- Upload фото → R2
- SMS Twilio (эндпоинты есть)
- Socket.io (подключён)
- Admin панель (seed, approve/deactivate)
- Rate limiting, Helmet, CORS
- Dashboard: login, register, onboarding, dashboard, tables, guests, profile, settings, billing, menu, admin
- Mobile: 5 табов, детали ресторана, бронирование, подтверждение, push, карты, i18n, тёмная тема
- Widget: vanilla JS, PL/EN, слоты

### 🔴 Нужно для MVP (эта спецификация)
1. Mobile: экран регистрации + онбординг
2. Backend: refresh tokens
3. Dashboard: Socket.io toast/badge уведомления
4. Backend: email-верификация
5. Dashboard: календарный вид бронирований
6. Mobile: экран настроек
7. E2E smoke test

---

## Модуль 1: Mobile — Регистрация и онбординг

### User Stories
- Как новый гость, я хочу зарегистрироваться по email и паролю, чтобы бронировать столики
- Как новый гость, я хочу указать имя и телефон при регистрации, чтобы ресторан знал кто придёт
- Как незарегистрированный гость, я хочу видеть экран выбора login/register, чтобы понимать куда нажать
- Как новый гость, я хочу пройти мини-онбординг (выбор языка, разрешение push), чтобы приложение было настроено

### Модель данных
Существующая модель User уже содержит нужные поля:
- id (uuid PK), email (text UNIQUE NOT NULL), password (text NOT NULL)
- firstName (text), lastName (text), phone (text)
- role (enum: GUEST, OWNER, ADMIN)
- isVerified (boolean DEFAULT false)
- Новых таблиц НЕ нужно.

### API
Существующий эндпоинт:
- `POST /auth/register` — {email, password, firstName, lastName, phone} → 201 {user, token} | 400 | 409

### Экраны и компоненты

**AuthChoiceScreen** (`/auth-choice`)
- Два CTA: "Войти" и "Создать аккаунт"
- Лого Stolik сверху
- Состояния: default

**RegisterScreen** (`/register`)
- Поля: firstName, lastName, email, password, phone
- Кнопка "Создать аккаунт"
- Ссылка "Уже есть аккаунт? Войти"
- Валидация: email формат, пароль мин. 6 символов, имя обязательно
- Состояния: default, loading, error (красный текст под полем), success → redirect

**OnboardingScreen** (`/onboarding`)
- Шаг 1: Выбор языка (EN/PL/RU/UA) — сохраняет в i18n store
- Шаг 2: Разрешение push-уведомлений — Expo requestPermissionsAsync
- Шаг 3: "Готово! Найдите ресторан" — redirect на Home
- Навигация: свайп или кнопка "Далее"
- Skip доступен на каждом шаге

### Бизнес-логика
- После успешного register → сохранить token в SecureStore → navigateTo onboarding
- После onboarding → navigateTo home tabs
- Если token уже есть в SecureStore при запуске → skip auth, go to home
- Язык выбранный в онбординге перезаписывает дефолт i18n

### Крайние случаи
- Email уже зарегистрирован → 409 → показать "Этот email уже используется"
- Сеть недоступна → показать "Проверьте подключение к интернету"
- Пользователь убивает приложение на онбординге → при следующем запуске token есть → skip auth, но онбординг не пройден → показать онбординг повторно (флаг `onboardingCompleted` в AsyncStorage)

---

## Модуль 2: Backend — Refresh Tokens

### User Stories
- Как гость, я не хочу логиниться заново каждые 30 дней
- Как система, я хочу инвалидировать старые токены при смене пароля
- Как система, я хочу ротировать refresh token при каждом обновлении (rotation)

### Модель данных
Новая таблица:

```
RefreshToken {
  id          String   @id @default(uuid())
  token       String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  revokedAt   DateTime?
}
```

Индексы: token (unique), userId, expiresAt

### API

**POST /auth/login** — изменение существующего
- Response добавить: `refreshToken` (string, httpOnly cookie или body)
- Access token: JWT, 15 минут
- Refresh token: UUID v4, 30 дней, сохраняется в БД

**POST /auth/register** — аналогично login, возвращает оба токена

**POST /auth/refresh**
- Body: `{refreshToken: string}`
- Логика: найти token в БД → проверить не revoked и не expired → сгенерировать новый access + новый refresh → revoke старый refresh → вернуть оба
- Response: 200 `{accessToken, refreshToken}` | 401 `{error: "Invalid refresh token"}`

**POST /auth/logout**
- Body: `{refreshToken: string}`
- Логика: revoke refresh token (set revokedAt = now())
- Response: 200

### Бизнес-логика
- При смене пароля → revoke ALL refresh tokens пользователя (UPDATE SET revokedAt = now() WHERE userId = X AND revokedAt IS NULL)
- Refresh token rotation: каждый refresh создаёт новую пару, старый невалиден
- Cron / cleanup: удалять expired tokens старше 30 дней (опционально, не блокер)

### Крайние случаи
- Refresh token уже revoked → 401 (возможно replay attack, залогировать)
- Refresh token expired → 401
- Два одновременных refresh запроса с одним токеном → первый успешен, второй 401 (rotation предотвращает)

---

## Модуль 3: Dashboard — Real-time уведомления

### User Stories
- Как владелец ресторана, я хочу видеть toast-уведомление при новой брони, чтобы не пропустить
- Как владелец, я хочу видеть badge с количеством новых бронирований на иконке "Бронирования"
- Как владелец, я хочу слышать звук при новой брони (опционально)

### Модель данных
Нет новых таблиц. Используется существующий Socket.io.

### API / Events
Socket.io уже подключён. Нужны серверные emit'ы:

**Сервер → Клиент:**
- `booking:new` — `{bookingId, guestName, date, time, guests, tableName}`
- `booking:cancelled` — `{bookingId, guestName}`
- `booking:updated` — `{bookingId, status}`

**Сервер — когда emit'ить:**
- В POST /bookings (создание) → emit `booking:new` в room = `restaurant:${restaurantId}`
- В PATCH /bookings/:id (статус) → emit `booking:updated`
- В DELETE /bookings/:id → emit `booking:cancelled`

### Экраны и компоненты

**ToastNotification** (глобальный компонент в layout)
- Позиция: top-right, z-index 50
- Содержимое: "Новая бронь: {guestName}, {date} {time}, {guests} гост."
- Auto-dismiss: 5 секунд
- Клик → navigateTo /dashboard/bookings
- Анимация: slide-in справа

**NotificationBadge** (на навигации "Бронирования")
- Красный кружок с числом непрочитанных
- Сбрасывается при переходе на страницу бронирований
- Хранится в Zustand/React context (не в БД — MVP упрощение)

### Бизнес-логика
- При подключении к Socket.io → join room `restaurant:${user.restaurantId}`
- Счётчик badge инкрементируется при `booking:new`
- Счётчик сбрасывается при посещении /dashboard/bookings
- Toast показывается для ВСЕХ событий (new, cancelled, updated)

### Крайние случаи
- WebSocket disconnected → показать маленький индикатор "Offline" в footer дашборда
- Множество одновременных бронирований → toast queue (показывать по одному с задержкой 500ms)
- Страница неактивна (tab в фоне) → копить badge, не показывать toast

---

## Модуль 4: Backend — Email-верификация

### User Stories
- Как система, я хочу верифицировать email владельца ресторана при регистрации
- Как владелец, я хочу получить письмо с ссылкой для подтверждения email
- Как владелец с неподтверждённым email, я могу пользоваться дашбордом, но вижу баннер "Подтвердите email"

### Модель данных
Новая таблица:

```
EmailVerification {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token       String   @unique
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime @default(now())
}
```

Существующее поле `User.isVerified` (boolean) — уже есть, логики нет.

### API

**POST /auth/register** — после создания пользователя:
1. Создать EmailVerification с token = UUID v4, expiresAt = now + 24h
2. Отправить email через Twilio SendGrid (или Resend — дешевле)
3. Письмо содержит ссылку: `{DASHBOARD_URL}/verify-email?token={token}`

**GET /auth/verify-email?token={token}**
- Найти EmailVerification → проверить не expired и не used
- Обновить User.isVerified = true
- Обновить EmailVerification.usedAt = now()
- Response: 200 → redirect на /dashboard с toast "Email подтверждён!"
- Ошибки: 400 (invalid token), 410 (expired)

**POST /auth/resend-verification**
- Auth required
- Создать новый EmailVerification, отправить email
- Rate limit: 1 запрос в 5 минут
- Response: 200 | 429

### Экраны

**VerifyEmailBanner** (в layout дашборда)
- Показывается если `user.isVerified === false`
- Текст: "Подтвердите ваш email. Проверьте {email} или [отправить повторно]"
- Жёлтый баннер вверху страницы
- Кнопка "Отправить повторно" → POST /auth/resend-verification

### Бизнес-логика
- Неподтверждённый email НЕ блокирует работу дашборда (MVP — не хотим терять юзеров)
- В будущем: гейтинг фич для неподтверждённых (SMS отправка, публикация профиля)

### Крайние случаи
- Юзер кликает expired ссылку → "Ссылка истекла. Запросите новую"
- Юзер кликает ссылку повторно (уже verified) → redirect на /dashboard, без ошибки
- Email не доходит → кнопка "Отправить повторно" + проверить spam

---

## Модуль 5: Dashboard — Календарный вид бронирований

### User Stories
- Как владелец, я хочу видеть бронирования в календаре (день/неделя), а не только список "сегодня"
- Как владелец, я хочу кликнуть на бронирование в календаре и увидеть детали
- Как владелец, я хочу переключаться между видами: "Список" и "Календарь"

### Модель данных
Нет новых таблиц. Используется существующий Booking.

### API
Существующий:
- `GET /bookings?restaurantId={id}&date={date}` — бронирования за день
- Нужно добавить: `GET /bookings?restaurantId={id}&from={date}&to={date}` — диапазон дат для недельного вида

### Экраны

**BookingsCalendarView** (новый таб на странице /dashboard/bookings)
- Toggle: "Список" | "Календарь" (сверху страницы)
- Дневной вид: таймлайн 10:00-23:00, бронирования как блоки
- Недельный вид: 7 колонок, бронирования как компактные чипы
- Цвет блока по статусу: pending=жёлтый, confirmed=зелёный, cancelled=серый
- Клик на блок → модалка с деталями бронирования (имя, телефон, статус, комментарий)
- Навигация: ← Пред. день/неделя | Сегодня | След. день/неделя →

**Библиотека:** `@fullcalendar/react` или кастомный grid (для MVP — кастомный проще, меньше зависимостей)

### Бизнес-логика
- Дефолтный вид: "Список" (не ломаем текущий UX)
- При переключении на "Календарь" → fetch бронирований за видимый диапазон
- Фильтр по статусу работает в обоих видах

### Крайние случаи
- Нет бронирований за выбранный период → "Нет бронирований" с иллюстрацией
- Много бронирований на один слот → scroll внутри ячейки или "+N ещё"
- Мобильный дашборд (маленький экран) → показывать только дневной вид

---

## Модуль 6: Mobile — Экран настроек

### User Stories
- Как гость, я хочу сменить язык приложения
- Как гость, я хочу включить/выключить push-уведомления
- Как гость, я хочу сменить пароль
- Как гость, я хочу выйти из аккаунта
- Как гость, я хочу удалить аккаунт

### Модель данных
Нет новых таблиц.

### API
Нужен новый:
- `PATCH /auth/change-password` — Auth required, `{currentPassword, newPassword}` → 200 | 400 | 401
- `DELETE /auth/account` — Auth required → 200 (soft delete или hard delete)

### Экраны

**SettingsScreen** (таб Profile → кнопка ⚙️ или секция внизу)
- Секция "Профиль": имя, email (read-only), телефон → редактирование
- Секция "Приложение": язык (picker EN/PL/RU/UA), уведомления (toggle)
- Секция "Безопасность": сменить пароль → модалка
- Секция "Аккаунт": выйти (красная кнопка), удалить аккаунт (серая, с подтверждением)
- Версия приложения внизу

**ChangePasswordModal**
- Поля: текущий пароль, новый пароль, подтверждение
- Валидация: мин. 6 символов, совпадение
- Успех → "Пароль изменён" + revoke all refresh tokens

### Бизнес-логика
- Смена языка → обновить i18n store + AsyncStorage
- Toggle уведомлений → Expo Notifications.getPermissionsAsync / requestPermissionsAsync
- Выход → очистить SecureStore (token) + AsyncStorage + navigateTo auth-choice
- Удаление аккаунта → confirmation alert → DELETE /auth/account → очистить всё → auth-choice

### Крайние случаи
- Неверный текущий пароль → "Неверный пароль"
- Удаление аккаунта с активными бронированиями → cancel all pending bookings before delete
- Push permissions denied на уровне ОС → показать "Включите в настройках телефона" + кнопка openSettings

---

## Модуль 7: E2E Smoke Test

### User Stories
- Как разработчик, я хочу запустить один тест и убедиться, что основной flow работает
- Как разработчик, я хочу видеть где именно сломалось

### Тестовый сценарий (ручной чеклист + автоматизация)

**Полный happy path:**
1. POST /auth/register → создать тестового гостя → 201 + tokens ✓
2. POST /auth/login → логин → 200 + tokens ✓
3. POST /auth/refresh → обновить токен → 200 ✓
4. GET /restaurants → список ресторанов → 200 + массив ✓
5. GET /restaurants/:id → детали ресторана (Różana) → 200 ✓
6. GET /restaurants/:id/slots?date=...&guests=2 → доступные слоты → 200 + массив ✓
7. POST /bookings → создать бронь → 201 ✓
8. GET /bookings?restaurantId=...&date=... → бронь видна в списке ✓
9. PATCH /bookings/:id → подтвердить (status=confirmed) → 200 ✓
10. DELETE /auth/account → удалить тестового гостя → 200 ✓

**Инструмент:** скрипт на Node.js (`packages/api/tests/smoke.test.ts`) с использованием `fetch` + `assert`. Запуск: `npm run test:smoke` против production API.

### Крайние случаи для теста
- API недоступен → timeout 10s → fail с понятным сообщением
- Seed data отсутствует → тест создаёт свои данные и чистит за собой
- Rate limiting срабатывает → добавить задержки между запросами

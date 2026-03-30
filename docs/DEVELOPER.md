# 👨‍💻 Stolik — Гайд для разработчика

## С чего начать (первый день)

### 1. Клонировать репозиторий
```bash
git clone https://github.com/yourorg/stolik.git
cd stolik
```

### 2. Установить зависимости
```bash
npm install
```

### 3. Создать базу данных
Зарегистрироваться на [railway.app](https://railway.app), создать PostgreSQL, скопировать `DATABASE_URL`.

### 4. Настроить переменные
```bash
cp packages/api/.env.example packages/api/.env
# Заполнить DATABASE_URL и JWT_SECRET (остальное — позже)
```

### 5. Применить схему БД
```bash
cd packages/api
npm run db:generate
npm run db:migrate
```

### 6. Запустить backend
```bash
npm run dev:api
# → http://localhost:3001
# → http://localhost:3001/health — должен вернуть { status: 'ok' }
```
 
---

## Что уже сделано

| Файл | Что там |
|------|---------|
| `packages/api/prisma/schema.prisma` | Полная схема БД: рестораны, столы, брони, CRM, отзывы |
| `packages/api/src/routes/auth.ts` | Регистрация + логин (JWT) |
| `packages/api/src/routes/bookings.ts` | Создание брони, слоты, мои брони, дашборд |
| `packages/api/src/routes/widget.ts` | Публичный API для JS-виджета |
| `apps/widget/stolik.js` | Готовый embed-виджет (вставить 1 строку на сайт ресторана) |
| `apps/mobile/` | React Native (Expo) — структура готова, нужно добавить экраны |
| `apps/web-dashboard/` | Next.js — структура готова, нужно добавить страницы |

---

## Что нужно сделать (по приоритету)

### 🔴 Must — Неделя 1-2
- [ ] Реализовать `packages/api/src/routes/restaurants.ts` — CRUD ресторанов
- [ ] Реализовать `packages/api/src/routes/tables.ts` — управление столами
- [ ] Добавить Google OAuth (`passport.js` или `next-auth`)
- [ ] Деплой на Railway

### 🔴 Must — Неделя 3-4  
- [ ] `apps/web-dashboard` — страница логина ресторана
- [ ] `apps/web-dashboard` — дашборд: брони сегодня (список + статус)
- [ ] `apps/web-dashboard` — создание брони вручную
- [ ] Email-уведомления (Nodemailer / Resend)

### 🔴 Must — Неделя 5-6
- [ ] Финализировать `apps/widget/stolik.js` — подключить к реальному API
- [ ] SMS через Twilio — подтверждение + напоминание 24ч
- [ ] Страница "Моя бронь" (публичная, по ID)

### 🟡 Nice — Неделя 7-8
- [ ] `apps/mobile` — подключить к API (React Query + Zustand)
- [ ] Google Maps на карточке ресторана
- [ ] Push-уведомления (Expo Notifications)

### 🟡 Nice — Неделя 9-10
- [ ] Stripe — подписки Pro/Business для ресторанов
- [ ] Przelewy24 — депозиты при бронировании
- [ ] `apps/web-dashboard` — CRM гостей
- [ ] `apps/web-dashboard` — аналитика (no-show rate, заполняемость)

### 🟢 Later — Неделя 11-12
- [ ] Floor plan (drag&drop расстановка столов)
- [ ] Waitlist — лист ожидания
- [ ] Верифицированные отзывы
- [ ] Instagram-бронирование

---

## API Endpoints

```
POST   /api/auth/register          # Регистрация
POST   /api/auth/login             # Логин

GET    /api/restaurants            # Список ресторанов (публичный)
GET    /api/restaurants/:id        # Карточка ресторана
POST   /api/restaurants            # Создать ресторан (owner)
PATCH  /api/restaurants/:id        # Обновить ресторан (owner)

GET    /api/bookings/slots         # Доступные слоты (?restaurantId=&date=)
POST   /api/bookings               # Создать бронь (публичный)
GET    /api/bookings/my            # Мои брони (auth)
GET    /api/bookings/today/:restId # Брони сегодня (owner)
PATCH  /api/bookings/:id/status    # Изменить статус (owner)

GET    /api/widget/:slug           # Инфо для виджета (публичный)
GET    /api/widget/:slug/slots     # Слоты для виджета (публичный)

GET    /api/guests/:restaurantId   # CRM гостей (owner)

POST   /api/upload                 # Загрузка изображений в R2 (auth, max 5MB, jpeg/png/webp)
```

---

## Переменные окружения (`packages/api/.env`)

| Переменная | Описание |
|------------|----------|
| `PORT` | Порт API сервера (по умолчанию `3001`) |
| `DATABASE_URL` | PostgreSQL connection string (Railway) |
| `JWT_SECRET` | Секрет для подписи JWT токенов |
| `DASHBOARD_URL` | URL веб-дашборда (например `https://stolik-dashboard.vercel.app`, default: `http://localhost:3000`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_…` или `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_…`) |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_FROM_NUMBER` | Twilio номер отправителя SMS (например `+48XXXXXXXXX`) |
| `R2_ACCOUNT_ID` | Cloudflare Account ID (найти в Cloudflare Dashboard → правый sidebar) |
| `R2_ACCESS_KEY_ID` | R2 API Token Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API Token Secret Access Key |
| `R2_BUCKET_NAME` | Название R2 bucket (например `stolik-uploads`) |
| `R2_PUBLIC_URL` | Публичный домен bucket (например `https://pub-xxx.r2.dev` или кастомный домен) |

### Как получить R2 credentials

1. Cloudflare Dashboard → **R2** → создать bucket (`stolik-uploads`)
2. R2 → **Manage R2 API Tokens** → Create API Token
   - Permissions: Object Read & Write
   - Scope: конкретный bucket
3. Скопировать Access Key ID и Secret Access Key в `.env`
4. В настройках bucket включить **Public Access** или добавить кастомный домен → скопировать URL в `R2_PUBLIC_URL`

### Endpoint загрузки файлов

```
POST /api/upload
Authorization: Bearer <JWT>
Content-Type: multipart/form-data
Body: file (field name: "file", max 5 MB, типы: jpeg/png/webp)

Response: { "url": "https://pub-xxx.r2.dev/uploads/<uuid>.jpg" }
```

---

## Деплой

| Сервис | Что | Стоимость |
|--------|-----|-----------|
| Railway | Backend API + PostgreSQL | ~$5/мес |
| Vercel | Web-дашборд (Next.js) | бесплатно |
| Expo EAS | Сборка мобильного приложения | бесплатно |

---

## Вопросы?

Писать в Slack / Telegram. Дизайн-файлы — в папке `/docs/design/`.

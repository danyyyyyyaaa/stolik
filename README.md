# 🍽️ Stolik — Polish Restaurant Booking Platform

> Польский маркетплейс для бронирования столиков. Гость находит ресторан и бронирует столик за 30 секунд.

---

## Структура монорепозитория

```
stolik/
├── apps/
│   ├── mobile/          # React Native (Expo) — мобильное приложение для гостей
│   ├── web-dashboard/   # Next.js — веб-дашборд для ресторанов
│   └── widget/          # Vanilla JS — embed-виджет бронирования на сайт ресторана
├── packages/
│   └── api/             # Node.js + TypeScript + Express + Prisma — backend API
├── docs/                # Документация, дизайн-система, API-спека
└── README.md
```

---

## Быстрый старт

### Требования
- Node.js 20+
- npm 10+ или yarn
- PostgreSQL 15+ (или Railway)

### 1. Клонировать и установить зависимости
```bash
git clone https://github.com/yourorg/stolik.git
cd stolik
npm install
```

### 2. Настроить переменные окружения
```bash
cp packages/api/.env.example packages/api/.env
# Заполнить DATABASE_URL, JWT_SECRET, TWILIO_*, STRIPE_*
```

### 3. Запустить backend
```bash
cd packages/api
npm run dev
# API запустится на http://localhost:3001
```

### 4. Запустить мобильное приложение
```bash
cd apps/mobile
npm install
npx expo start
# Открыть в Expo Go на телефоне
```

### 5. Запустить веб-дашборд
```bash
cd apps/web-dashboard
npm install
npm run dev
# Откроется на http://localhost:3000
```

---

## Технический стек

| Часть | Технология |
|-------|-----------|
| Backend API | Node.js + TypeScript + Express + Prisma |
| База данных | PostgreSQL (Railway) |
| Веб-дашборд | Next.js 14 + Tailwind CSS (Vercel) |
| Мобильное приложение | React Native (Expo) |
| Embed-виджет | Vanilla JS (без зависимостей) |
| Realtime | Socket.io |
| SMS/WhatsApp | Twilio |
| Платежи | Stripe + Przelewy24 |
| Файлы/фото | Cloudflare R2 |
| Деплой backend | Railway |
| Деплой веб | Vercel |

---

## Роадмап MVP (12 недель)

| Недели | Что делаем |
|--------|-----------|
| 1–2 | Фундамент: БД, API, авторизация, деплой |
| 3–4 | Онбординг ресторана, управление столами |
| 5–6 | JS-виджет, гостевой поток бронирования, SMS |
| 7–8 | Каталог ресторанов, мобильное приложение |
| 9–10 | Монетизация: Stripe, подписки, депозиты |
| 11–12 | Полировка, пилот с 10 ресторанами, запуск |

---

## Цвета и дизайн-система

```
Accent Green:     #2D6A35  (кнопки, акценты — светлая тема)
Accent Green:     #3D8B4E  (кнопки, акценты — тёмная тема)
Accent Text:      #5DBF72  (рейтинги, badges)
Background Dark:  #131A14
Background Light: #F4F7F4
Card Dark:        #1E2620
Card Light:       #FFFFFF
```

---

## Контакты команды

- Product: [имя]
- Dev Lead: [имя]  
- Design: [имя]

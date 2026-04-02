# ПРОМПТ ДЛЯ CLAUDE CODE — Скопируй целиком и вставь

Создай следующую структуру файлов в корне проекта Stolik. Каждый файл создай с точным содержимым ниже.

## Задача
Настроить проект по Spec-First методологии: CLAUDE.md, субагенты, rules, skills, шаблоны. После создания файлов — начать реализацию MVP модулей по приоритету.

## Структура файлов для создания

```
CLAUDE.md                              — главный конфиг (скопируй из stolik-spec/CLAUDE.md)
SPECIFICATION.md                       — спецификация MVP модулей (скопируй из stolik-spec/SPECIFICATION.md)
SPEC_TEMPLATE.md                       — шаблон для будущих фич
.claude/agents/backend-engineer.md     — субагент бэкенда
.claude/agents/frontend-developer.md   — субагент фронтенда
.claude/agents/database-architect.md   — субагент БД
.claude/agents/qa-reviewer.md          — субагент QA (только чтение!)
.claude/rules/api-routes.md            — правила для API
.claude/rules/mobile-app.md            — правила для мобилки
.claude/rules/dashboard.md             — правила для дашборда
.claude/skills/implement-feature.md    — скилл реализации фичи
```

## После создания файлов — начинай реализацию

### Порядок реализации (строго по очереди):

**1. Mobile Register + Onboarding** (субагент: frontend-developer)
- Создать AuthChoiceScreen, RegisterScreen, OnboardingScreen
- Интегрировать с POST /auth/register
- Сохранение token в SecureStore
- Онбординг: выбор языка, push permissions, ready screen

**2. Refresh Tokens** (субагенты: database-architect → backend-engineer)
- Добавить модель RefreshToken в Prisma schema
- Создать миграцию
- Изменить POST /auth/login и /auth/register — возвращать оба токена
- Создать POST /auth/refresh и POST /auth/logout
- При смене пароля — revoke all tokens

**3. Socket.io Notifications** (субагенты: backend-engineer → frontend-developer)
- Добавить emit в POST/PATCH/DELETE /bookings
- Создать ToastNotification компонент в dashboard layout
- Создать NotificationBadge на навигации

**4. Email Verification** (субагенты: database-architect → backend-engineer → frontend-developer)
- Добавить модель EmailVerification
- Создать GET /auth/verify-email и POST /auth/resend-verification
- Добавить VerifyEmailBanner в dashboard layout

**5. Calendar View** (субагент: frontend-developer)
- Добавить GET /bookings с параметрами from/to
- Создать BookingsCalendarView с day/week видами
- Toggle между "Список" и "Календарь"

**6. Mobile Settings** (субагенты: backend-engineer → frontend-developer)
- Создать PATCH /auth/change-password и DELETE /auth/account
- Создать SettingsScreen с секциями: профиль, приложение, безопасность, аккаунт

**7. E2E Smoke Test** (субагент: qa-reviewer → backend-engineer)
- Создать packages/api/tests/smoke.test.ts
- Тестировать полный flow: register → login → refresh → list restaurants → book → confirm → cleanup

## Правила
- Читай SPECIFICATION.md перед каждым модулем
- Следуй правилам из .claude/rules/
- После каждого модуля — qa-reviewer проверяет
- Коммитить после каждого завершённого модуля: `git add -A && git commit -m "feat: [описание]"`

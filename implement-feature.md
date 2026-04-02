# Skill: Implement Feature

## Когда использовать
Когда нужно реализовать новую фичу из SPECIFICATION.md

## Workflow

### 1. Прочитай спецификацию
```bash
cat SPECIFICATION.md | grep -A 100 "Модуль N:"
```
Извлеки: user stories, модель данных, API, экраны, бизнес-логику, edge cases.

### 2. База данных (если нужны новые модели)
Вызови субагент `database-architect`:
- Обнови prisma/schema.prisma
- Создай миграцию: `npx prisma migrate dev --name feature_name`
- Обнови seed если нужно

### 3. Backend (если нужны новые эндпоинты)
Вызови субагент `backend-engineer`:
- Создай route file в packages/api/routes/
- Добавь Zod-валидацию
- Подключи route в index.ts / app.ts
- Добавь Socket.io emit если нужно

### 4. Frontend
Вызови субагент `frontend-developer`:
- Dashboard: создай страницу в apps/web-dashboard/app/
- Mobile: создай экран в apps/mobile/app/
- Обработай все состояния (loading, error, empty, success)

### 5. Review
Вызови субагент `qa-reviewer`:
- Проверь реализацию против спецификации
- Проверь безопасность
- Проверь edge cases

### 6. Тест
Обнови smoke test в packages/api/tests/smoke.test.ts если добавлен новый эндпоинт.

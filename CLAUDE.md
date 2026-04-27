# Podcast Stats — агрегатор статистики подкастов

## О проекте
Веб-приложение для сбора статистики подкастов с разных платформ в единый дашборд. RSS + CSV-загрузка из Яндекс Музыки, Spotify, ВК, Mave. AI-инсайты через Claude.

## Стек
- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4**
- **Zustand** (стейт, persist в localStorage)
- **Recharts** (графики, D3-based)
- **Anthropic Claude SDK** (haiku-4-5, для AI-инсайтов)
- **PapaParse** (CSV) + @xmldom/xmldom (RSS)
- **Деплой:** Vercel (проект `podcast-stats`)

## Структура
```
app/
  page.tsx                — главная (список подкастов, добавление)
  [podcastId]/
    setup/page.tsx        — мастер загрузки CSV по платформам
    dashboard/page.tsx    — аналитический дашборд с графиками
  compare/page.tsx        — сравнение подкастов
  api/
    rss/route.ts          — парсинг RSS-ленты
    ai/route.ts           — генерация инсайтов через Claude
    youtube/
      auth/route.ts       — YouTube OAuth redirect
      callback/route.ts   — OAuth callback, обмен code на token
      videos/route.ts     — получение видео с канала через API

lib/
  store.ts                — Zustand (добавление подкастов, загрузка прослушиваний)
  demoData.ts             — демо-подкасты (Совет Директоров, Скоро 30, НЖО)
  matcher.ts              — мэтчинг эпизодов, нормализация данных
  parsers/
    yandex.ts, spotify.ts, vk.ts, mave.ts — парсеры CSV для каждой платформы
```

## Ключевое
- Данные хранятся в localStorage (нет БД)
- Демо-режим с предзагруженными данными
- AI-инсайты на русском (топ-5 эпизодов, аутлаеры, 4-5 рекомендаций)

## Env-переменные (`.env.local`)
- `ANTHROPIC_API_KEY` - Claude AI инсайты
- `GOOGLE_CLIENT_ID` - YouTube OAuth 2.0
- `GOOGLE_CLIENT_SECRET` - YouTube OAuth 2.0
- `GOOGLE_REDIRECT_URI` - `http://localhost:3000/api/youtube/callback`

## YouTube интеграция
- OAuth 2.0 через Google (scope: `youtube.readonly`)
- Тестовый режим (до 100 пользователей в Google Cloud Console)
- Токен хранится в httpOnly cookie (5 мин TTL), не в localStorage
- API роуты: `app/api/youtube/{auth,callback,videos}/route.ts`
- Refresh token не сохраняется - каждый импорт = новый логин

## Текущий статус
- Основной функционал работает: RSS, загрузка CSV, YouTube OAuth, дашборд, сравнение, AI-инсайты
- 5 платформ: Mave, Яндекс Музыка, Spotify, VK (CSV), YouTube (OAuth)

## Vercel guardrails (чтобы не путать аккаунты/проекты)
- Аккаунты:
  - `alexmladinov` — основной Vercel (используется по умолчанию, там почти все проекты). CLI scope: `amladinovs-projects`
  - `store` — клиентский Vercel (используется только для одного проекта)
- Правило по умолчанию: если не указано иное, деплой всегда в `alexmladinov` (scope `amladinovs-projects`).
- Деплой запускать только через safe-скрипт:
  - `npm run deploy:preview:safe`
  - `npm run deploy:prod:safe`
- Быстрое переключение Vercel scope:
  - `npm run use-vercel-main` — переключить линковку на основной scope `amladinovs-projects`
  - `npm run use-vercel-store` — переключить линковку на клиентский scope `store`
- Перед запуском обязательно задать переменные окружения:
  - `VERCEL_SCOPE` — нужный team/user scope (`amladinovs-projects` по умолчанию)
  - `VERCEL_PROJECT=podcast-stats`
  - `VERCEL_PROD_DOMAIN=podcast-stats.vercel.app` (для prod)

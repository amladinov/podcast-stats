# Podcast Stats — агрегатор статистики подкастов

## О проекте
Веб-приложение для сбора статистики подкастов с разных платформ в единый дашборд. RSS + CSV-загрузка из Mave, Яндекс Музыки, Spotify, ВК и VK Video, YouTube через OAuth. AI-инсайты через Claude, экспорт отчёта в PDF.

## Стек
- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4**
- **Zustand** (стейт, persist в localStorage)
- **Recharts** (графики, D3-based)
- **Anthropic Claude SDK** (haiku-4-5, для AI-инсайтов)
- **PapaParse** (CSV) + @xmldom/xmldom (RSS)
- **puppeteer-core + @sparticuz/chromium-min** (серверная сборка PDF)
- **Деплой:** Vercel (проект `podcast-stats`)

## Структура
```
app/
  page.tsx                — главная (список подкастов, добавление)
  [podcastId]/
    setup/page.tsx        — мастер загрузки: оркестратор (state, хуки, раскладка); UI в components/setup
    dashboard/page.tsx    — дашборд: оркестратор (state, хуки, раскладка); UI в components/dashboard
  compare/page.tsx        — сравнение подкастов
  api/
    rss/route.ts          — парсинг RSS-ленты
    ai/route.ts           — генерация инсайтов через Claude
    export-pdf/route.ts   — сборка PDF из HTML через headless Chromium
    youtube/
      auth/route.ts       — YouTube OAuth redirect
      callback/route.ts   — OAuth callback, обмен code на token
      videos/route.ts     — получение видео с канала через API

components/
  setup/                  — мастер загрузки: PlatformCard, MavePasteSection, AudienceCards, YouTubeCard,
                            SetupMobileShell, platformGuides.ts (инструкции по платформам), хуки use*.ts
                            Компоненты принимают layout='mobile'|'desktop' и воспроизводят обе вёрстки
  dashboard/              — блоки дашборда (StatCards, графики, таблица, фильтры, AI)
    DashboardHeader.tsx, RefreshPanel.tsx — шапка и панели «обновить»
    use*.ts               — хуки дашборда (PDF-экспорт, обновление YouTube/RSS, фильтр платформ)
    mobile/               — мобильные сцены и оболочка со свайпом
    print/                — печатный отчёт (PDF)

lib/
  store.ts                — Zustand (добавление подкастов, загрузка прослушиваний, обновление выпусков)
  storePersist.ts         — сжатый формат хранения в localStorage (версия 2); демо-подкасты не сохраняются
  episodeRefresh.ts       — обновление списка выпусков из RSS с переносом данных платформ
  podcastRss.ts           — повторная загрузка RSS с клиента в обход кеша
  podcastMetrics.ts       — суммы прослушиваний по платформам
  platformPeriods.ts      — период данных по каждой платформе
  youtubeImport.ts        — преобразование видео YouTube в записи прослушиваний
  pdfExport.ts            — клиентская часть PDF-экспорта (собирает HTML и шлёт в /api/export-pdf)
  dashboardMetrics.ts     — сортировка эпизодов, подписи периодов, данные диаграмм аудитории
  hooks/useMobileScenes.ts — полноэкранные мобильные сцены со свайпом (общий хук)
  demoData.ts             — демо-подкасты (Совет Директоров, Скоро 30, НЖО)
  platforms.ts            — единый справочник платформ (ключ, имя, цвет); новая платформа добавляется здесь + в тип Platform
  matcher.ts              — мэтчинг эпизодов, нормализация данных
  parsers/
    mave.ts, yandex.ts, spotify.ts, vk.ts, vkVideo.ts — парсеры CSV для каждой платформы
    mavePaste.ts          — разбор текста, вставленного из кабинета Mave (альтернатива CSV)
    yandexGender.ts, yandexAge.ts, yandexCities.ts — CSV аудитории Яндекса (общее в yandexCommon.ts)

tests/                    — тесты парсеров, мэтчера, хранения и обновления выпусков (`npm run test:matcher`)
docs/specs/               — спецификации форматов импорта и UX мастера загрузки
lessons.md                — грабли, читать в начале сессии
tasks.md                  — бэклог
```

## Ключевое
- Данные хранятся в localStorage (нет БД)
- Демо-режим с предзагруженными данными
- AI-инсайты на русском (топ-5 эпизодов, аутлаеры, 4-5 рекомендаций)
- Инвариант: `normalized.id` всегда равен `guid` соответствующего выпуска из `episodes`. На нём держится слияние данных платформ в `uploadPlays`; при пересборке списка выпусков данные переносить по ключу «заголовок + дата», а id брать из свежего guid
- `rawPlays` не сохраняется в localStorage, после перезагрузки страницы остаются только `normalized`
- Mave: CSV даёт динамику по дням, вставка текста даёт актуальные итоги; источники не суммируются дважды
- PDF: на десктопе системная печать браузера, на мобильных серверная сборка через `/api/export-pdf`
- `/api/export-pdf` рендерит присланный HTML с выключенным JavaScript и грузит ресурсы только со своего домена. Если в печатный отчёт добавляется картинка или шрифт с другого хоста, его нужно явно разрешить в роуте, иначе в PDF он не попадёт
- `/api/rss` кешируется на CDN на час (`s-maxage=3600`); запрос с `fresh=1` идёт в обход кеша
- Серверные функции работают во Франкфурте (`vercel.json`, регион `fra1`)
- `eslint-config-next` и `eslint-plugin-react-hooks` закреплены на старых версиях (16.1.7 и 7.0.1): новые ругаются на setState в эффекте в `app/page.tsx` и `components/setup/useMavePaste.ts`. Перед обновлением линтера поправить эти два места

## Env-переменные (`.env.local`)
- `ANTHROPIC_API_KEY` - Claude AI инсайты
- `GOOGLE_CLIENT_ID` - YouTube OAuth 2.0
- `GOOGLE_CLIENT_SECRET` - YouTube OAuth 2.0
- `GOOGLE_REDIRECT_URI` - `http://localhost:3000/api/youtube/callback`
- `PUPPETEER_EXECUTABLE_PATH` - необязательно, путь к Chrome для локального PDF-экспорта (по умолчанию системный Google Chrome)

## YouTube интеграция
- OAuth 2.0 через Google (scope: `youtube.readonly`)
- Тестовый режим (до 100 пользователей в Google Cloud Console)
- Токен хранится в httpOnly cookie (5 мин TTL), не в localStorage
- API роуты: `app/api/youtube/{auth,callback,videos}/route.ts`
- Refresh token не сохраняется - каждый импорт = новый логин

## Текущий статус
- Основной функционал работает: RSS, загрузка CSV, YouTube OAuth, дашборд (десктоп и мобильный), сравнение, AI-инсайты, PDF-отчёт, обновление выпусков из RSS
- 6 платформ: Mave (CSV или вставка текста), Яндекс Музыка, Spotify, VK, VK Video (CSV), YouTube (OAuth)
- В работе: полировка импорта Mave по вставленному тексту (см. `tasks.md`)
- Автосбор статистики «Хакни мозг»: ранбук в `.claude/skills/hackni-mozg-stats/SKILL.md`

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

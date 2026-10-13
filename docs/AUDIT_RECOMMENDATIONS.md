# Podcast Stats Audit Status

Дата первого аудита: 2026-04-01
Последнее обновление: 2026-04-01
Проект: `podcast-stats`
Фокус: безопасность, производительность, эффективность, оптимизация

## Current Status

Все обязательные пункты из текущего аудита закрыты.

Сделано:

1. Защищён `app/api/rss/route.ts`
2. Защищён `app/api/ai/route.ts`
3. Сужен allowlist внешних изображений
4. Оптимизирован `lib/matcher.ts`
5. Добавлены локальные тесты на matcher
6. Убраны тяжёлые повторные UI-агрегации
7. Сужены Zustand-подписки на главной
8. Обновлены уязвимые зависимости, `npm audit` чистый

Осталось только необязательное усиление production-hardening для AI route, если проекту понадобится более жёсткая эксплуатационная защита.

## Completed Fixes

### Done. RSS route hardening

Файл: `app/api/rss/route.ts`

Что сделано:

- добавлена валидация URL
- разрешены только `http/https`
- запрещены `localhost`, loopback, private/local IP ranges
- добавлена DNS-проверка хоста
- ограничено число редиректов
- добавлен таймаут загрузки
- добавлен лимит на размер RSS-ответа
- добавлена проверка `content-type`

Результат:

- закрыт основной SSRF-path
- снижен риск DoS через большие RSS-ответы

### Done. AI route hardening

Файл: `app/api/ai/route.ts`

Что сделано:

- ограничен размер request body
- добавлен in-memory rate limiting
- добавлена валидация и санация входных данных
- ограничено число эпизодов в запросе
- добавлено server-side сокращение и нормализация входа
- клиенту больше не возвращается сырая внутренняя ошибка провайдера

Результат:

- закрыт базовый abuse-path для публичного AI endpoint
- уменьшен риск лишних расходов на inference

### Done. Safe external images

Файлы:

- `next.config.ts`
- `lib/imageHosts.ts`
- `components/SafePodcastImage.tsx`

Что сделано:

- глобальный `hostname: '**'` убран
- введён явный allowlist допустимых image-hosts
- неизвестные внешние обложки больше не идут через Next image optimizer
- карточки и экраны переведены на безопасный wrapper

Результат:

- уменьшена поверхность SSRF/bandwidth abuse через image optimizer

### Done. Matcher performance refactor

Файл: `lib/matcher.ts`

Что сделано:

- эпизоды индексируются один раз на вызов `normalizePodcastData()`
- добавлены exact title и exact date map-индексы
- нормализация title больше не пересчитывается внутри горячего цикла
- токены заголовков предвычисляются заранее
- fuzzy matching работает по суженному candidate pool
- для YouTube сохранён fallback `title -> date`
- для VK сохранён `date-only` matching

Результат:

- снижена стоимость импорта больших CSV и YouTube-выгрузок
- уменьшен риск фризов браузера на больших объёмах данных

### Done. Matcher tests

Файлы:

- `tests/matcher.test.ts`
- `tsconfig.matcher-test.json`
- `package.json` (`test:matcher`)

Что покрыто:

- exact title match
- match при отличиях в пунктуации/регистре
- fuzzy partial title match
- отсутствие match для несвязанных title
- exact and nearest date matching
- no-match вне окна ±2 дня
- интеграционный сценарий для mixed imports

### Done. UI aggregation cleanup

Файлы:

- `lib/podcastMetrics.ts`
- `components/dashboard/StatCards.tsx`
- `components/dashboard/PlatformChart.tsx`
- `app/compare/page.tsx`

Что сделано:

- общие totals вынесены в отдельный helper
- агрегаты по платформам считаются единообразно
- `compare` больше не пересчитывает одни и те же суммы по нескольку раз на рендер
- top lists и summary-данные готовятся заранее

Результат:

- уменьшена стоимость ререндеров в dashboard и compare
- поведение UI сохранено

### Done. Narrower Zustand subscriptions

Файлы:

- `app/page.tsx`
- `eslint.config.mjs`

Что сделано:

- главная переведена с широкой подписки на отдельные селекторы
- временная директория `.tmp` исключена из lint

Результат:

- меньше лишних ререндеров главной страницы
- тестовый output не ломает `eslint`

### Done. Dependency updates

Файлы:

- `package.json`
- `package-lock.json`

Что сделано:

- обновлён `@xmldom/xmldom`
- выполнен `npm audit fix`
- подтянуты совместимые patched transitives

Результат:

- `npm audit --json` показывает `0` уязвимостей

## Optional Future Work

### Optional. Stronger AI production hardening

Статус: базовый уровень уже сделан

Что можно усилить дальше:

1. persistent rate limiting вместо in-memory
2. auth/session gating
3. мониторинг 429/500 и abuse patterns
4. более компактный server-side summary DTO вместо текущего полного входного набора

## Latest Checks

Успешно:

- `npm audit --json`
- `npm run test:matcher`
- `npm run lint`
- `npm run build`

## Recommended Next Step

Если продолжать не аудит, а развитие продукта, следующий шаг уже не технический долг, а продуктовая задача:

1. улучшения UX импорта
2. более наглядная аналитика
3. усиление AI-инсайтов

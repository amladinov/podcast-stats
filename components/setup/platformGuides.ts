import type { Platform, PlayRecord } from '@/types'
import { PLATFORMS as PLATFORM_META, PLATFORM_BY_KEY, PLATFORM_KEYS, type PlatformMeta } from '@/lib/platforms'
import { parseMave } from '@/lib/parsers/mave'
import { parseSpotify } from '@/lib/parsers/spotify'
import { parseYandex } from '@/lib/parsers/yandex'
import { parseVK } from '@/lib/parsers/vk'
import { parseVKVideo } from '@/lib/parsers/vkVideo'

export type GuidePart = { t: 'text'; v: string } | { t: 'link'; label: string; url: string }
export type GuideStep = GuidePart[]

export type CsvPlatform = Exclude<Platform, 'youtube'>

export type PlatformGuide = { desc: string; guide: GuideStep[]; note?: string }

// Инструкции по выгрузке CSV. Имена и цвета платформ берутся из lib/platforms.
export const PLATFORM_GUIDES: Record<CsvPlatform, PlatformGuide> = {
  mave: {
    desc: 'CSV с ежедневной статистикой или вставка списка выпусков из ЛК Mave',
    guide: [
      [{ t: 'text' as const, v: 'В личном кабинете mave.digital перейди в раздел «Аналитика»' }],
      [{ t: 'text' as const, v: 'Выбери нужный период, например «Год»' }],
      [{ t: 'text' as const, v: 'Нажми иконку файла со стрелкой вниз (под фильтром периода)' }],
      [{ t: 'text' as const, v: 'Выбери формат CSV и нажми «Скачать файл»' }],
    ] as GuideStep[],
    note: '⚠ Для экспорта нужна платная подписка Mave+',
  },
  yandex: {
    desc: 'CSV из DataLens (разделитель — точка с запятой)',
    guide: [
      [
        { t: 'text' as const, v: 'Открой ' },
        { t: 'link' as const, label: 'Личный кабинет Яндекс Музыки', url: 'https://datalens.ru/dzmgxub2lsve5-analitika-podkastov-na-yandeks-muzyke' },
        { t: 'text' as const, v: ' — если не подключён, настрой по ' },
        { t: 'link' as const, label: 'инструкции', url: 'https://yandex.cloud/ru/docs/tutorials/datalens/data-from-podcasts#configure-connection' },
      ],
      [{ t: 'text' as const, v: 'Выбери нужный подкаст в разделе «Подкасты»' }],
      [{ t: 'text' as const, v: 'Выбери период в разделе «Даты»' }],
      [{ t: 'text' as const, v: 'В разделе «Статистика прослушиваний эпизодов» нажми «…» в углу' }],
      [{ t: 'text' as const, v: 'Выбери «Сохранить как» → CSV, не меняй настройки → «Сохранить»' }],
    ] as GuideStep[],
  },
  spotify: {
    desc: 'CSV из Spotify for Podcasters',
    guide: [
      [
        { t: 'text' as const, v: 'Открой ' },
        { t: 'link' as const, label: 'Spotify for Podcasters', url: 'https://creators.spotify.com/' },
        { t: 'text' as const, v: ' — зарегистрируйся, если ещё нет' },
      ],
      [{ t: 'text' as const, v: 'Добавь подкаст через RSS-ленту (если не добавлен)' }],
      [{ t: 'text' as const, v: 'В меню слева выбери свой подкаст → раздел «Episodes»' }],
      [{ t: 'text' as const, v: 'Справа над списком эпизодов выбери нужный период' }],
      [{ t: 'text' as const, v: 'Нажми кружок со стрелкой рядом с фильтром периода — скачается CSV' }],
    ] as GuideStep[],
  },
  vk: {
    desc: 'CSV из статистики VK (разделитель — точка с запятой)',
    guide: [
      [{ t: 'text' as const, v: 'Зайди в сообщество, к которому привязан подкаст' }],
      [{ t: 'text' as const, v: 'Перейди в «Статистика» → «Подкасты» → «Эпизоды»' }],
      [{ t: 'text' as const, v: 'В правом верхнем углу нажми кнопку скачивания' }],
      [{ t: 'text' as const, v: 'Формат файла: CSV, «Данные для экспорта»: Подкасты' }],
      [{ t: 'text' as const, v: 'Выбери нужный период и нажми «Экспортировать»' }],
    ] as GuideStep[],
  },
  vkvideo: {
    desc: 'CSV из статистики VK Video (разделитель — точка с запятой)',
    guide: [
      [{ t: 'text' as const, v: 'Зайди в сообщество, к которому привязан канал VK Video' }],
      [{ t: 'text' as const, v: 'Перейди в «Статистика» → «Видео» → «Контент»' }],
      [{ t: 'text' as const, v: 'В правом верхнем углу нажми кнопку скачивания' }],
      [{ t: 'text' as const, v: 'Выбери период и формат CSV — нажми «Экспортировать»' }],
    ] as GuideStep[],
  },
}

/** CSV-платформы мастера: имя/цвет из справочника + инструкция */
export const SETUP_PLATFORMS = PLATFORM_META
  .filter((platform): platform is PlatformMeta & { key: CsvPlatform } => platform.key !== 'youtube')
  .map(platform => ({
    key: platform.key,
    label: platform.fullLabel,
    dot: platform.color,
    ...PLATFORM_GUIDES[platform.key],
  }))

export const YOUTUBE_PLATFORM = {
  key: 'youtube' as const,
  label: PLATFORM_BY_KEY.youtube.fullLabel,
  desc: 'Подключи канал через Google-аккаунт',
  dot: PLATFORM_BY_KEY.youtube.color,
}

export const MOBILE_SETUP_PLATFORM_ORDER = PLATFORM_KEYS

export const MOBILE_SETUP_SCENES: ReadonlyArray<{ id: Platform | 'done'; label: string }> = [
  ...PLATFORM_META.map(platform => ({ id: platform.key, label: platform.label })),
  { id: 'done', label: 'Готово' },
]

export type SetupPlatform = (typeof SETUP_PLATFORMS)[number]

export function parsePlatform(platform: CsvPlatform, text: string): PlayRecord[] {
  if (platform === 'mave') return parseMave(text)
  if (platform === 'yandex') return parseYandex(text)
  if (platform === 'spotify') return parseSpotify(text)
  if (platform === 'vk') return parseVK(text)
  if (platform === 'vkvideo') return parseVKVideo(text)
  return []
}

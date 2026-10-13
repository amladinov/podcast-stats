'use client'

import type { MavePasteEpisode } from '@/types'
import { getCtaClasses } from '@/lib/ctaStyles'
import type { SetupLayout } from './AudienceCards'

export interface MavePasteState {
  text: string
  preview: MavePasteEpisode[]
  warnings: string[]
  error: string
  tutorialOpen: boolean
  alternativeOpen: boolean
  onTextChange: (value: string) => void
  onToggleTutorial: () => void
  onToggleAlternative: () => void
  onPreview: () => void
  onImport: () => void
}

interface Props {
  layout: SetupLayout
  state: MavePasteState
  anyUploading: boolean
}

const TUTORIAL_STEPS = [
  'Открой раздел «Выпуски» в Mave и прокрути до видимых карточек эпизодов.',
  'Мышкой выдели только список выпусков и скопируй его через Cmd/Ctrl + C.',
  'Вернись в Podcast Stats, вставь текст в поле и нажми «Распознать вставку».',
]

const INTRO_TEXT = 'Скопируй список выпусков со страницы Mave. Этот способ обновит актуальные накопленные значения на дату импорта, а если CSV уже был загружен, сохранит его историческую динамику.'

/**
 * Альтернативный импорт Mave без подписки: вставка текста, видео-туториал, превью, импорт.
 * На мобильном секция сворачивается кнопкой, на десктопе открыта всегда.
 */
export function MavePasteSection({ layout, state, anyUploading }: Props) {
  const desktop = layout === 'desktop'
  const canPreview = Boolean(state.text.trim()) && !anyUploading
  const canImport = state.preview.length > 0 && state.warnings.length === 0 && !anyUploading

  const tutorial = (
    <>
      <button
        onClick={state.onToggleTutorial}
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/80 bg-white/80 px-4 py-3 text-left transition-colors hover:bg-white"
      >
        <div>
          <p className="text-[13px] font-medium text-[#1d1d1f]">Как быстро скопировать данные из Mave</p>
          <p className="mt-0.5 text-[12px] text-[#6e6e73]">Короткое видео и 3 шага прямо в карточке импорта</p>
        </div>
        <span
          className="inline-block text-[#7b57c8] transition-transform duration-300"
          style={{ transform: state.tutorialOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ↓
        </span>
      </button>

      <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{ maxHeight: state.tutorialOpen ? (desktop ? '700px' : '720px') : '0px', opacity: state.tutorialOpen ? 1 : 0 }}
      >
        <div className={`mt-4 rounded-[24px] border border-[#e7e2f3] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(246,241,255,0.86))] ${desktop ? 'p-3 sm:p-4' : 'p-3'} shadow-[0_20px_50px_rgba(177,80,226,0.10)]`}>
          <div className={desktop ? 'grid gap-4 xl:grid-cols-[1.35fr_0.9fr]' : 'grid gap-4'}>
            <div className="relative overflow-hidden rounded-2xl border border-[#ebe7f5] bg-[linear-gradient(135deg,#f6f1ff,#eef5ff)] p-4 shadow-sm">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-8 left-6 h-24 w-24 rounded-full bg-[#b150e2]/15 blur-2xl" />
                <div className="absolute bottom-0 right-6 h-24 w-24 rounded-full bg-[#0a84ff]/12 blur-2xl" />
              </div>
              <div className="relative">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#7b57c8]">
                    Видео-туториал
                  </span>
                  <span className="text-[11px] text-[#6e6e73]">ручное выделение + copy</span>
                </div>
                <div className="overflow-hidden rounded-[20px] border border-white/70 bg-white/70 shadow-[0_10px_30px_rgba(29,29,31,0.08)]">
                  <video
                    className="block aspect-[16/9] w-full bg-white object-cover"
                    src="/mave-paste-tutorial.fixed.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                  />
                </div>
                {desktop && (
                  <p className="mt-3 text-[12px] text-[#6e6e73]">
                    Короткий ролик без звука показывает реальный жест: выделение нужного блока выпусков, копирование и вставку в сервис.
                  </p>
                )}
              </div>
            </div>

            <div className={`rounded-2xl border border-[#ebe7f5] bg-white ${desktop ? 'p-5 sm:p-6' : 'p-5'} shadow-sm`}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8e8e93]">Сценарий</p>
              <div className="mt-3 space-y-3">
                {TUTORIAL_STEPS.map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#b150e2] text-[11px] font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="text-[14px] leading-relaxed text-[#3d3d3f]">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  const form = (
    <>
      <textarea
        value={state.text}
        onChange={event => state.onTextChange(event.target.value)}
        placeholder="Вставь сюда скопированный текст со страницы выпусков Mave"
        className={`mt-3 ${desktop ? 'min-h-[180px]' : 'min-h-[160px]'} w-full rounded-xl border border-[#e5e5ea] bg-white px-4 py-3 text-[13px] text-[#1d1d1f] placeholder-[#aeaeb2] focus:border-[#b150e2] focus:outline-none focus:ring-2 focus:ring-[#b150e2]/15`}
      />

      <div className={desktop ? 'mt-3 flex flex-col gap-2 sm:flex-row sm:items-center' : 'mt-3 flex flex-col gap-2'}>
        <button
          onClick={state.onPreview}
          disabled={!canPreview}
          className={getCtaClasses({
            tone: 'secondary',
            size: 'compact',
            fullWidth: !desktop,
            disabled: !canPreview,
          })}
        >
          Распознать вставку
        </button>
        <button
          onClick={state.onImport}
          disabled={!canImport}
          className={getCtaClasses({
            tone: 'primary',
            size: 'compact',
            fullWidth: !desktop,
            disabled: !canImport,
          })}
        >
          Импортировать в Mave
        </button>
        {state.preview.length > 0 && (
          <span className="text-[12px] text-[#6e6e73]">
            Распознано {state.preview.length.toLocaleString('ru')} выпусков
          </span>
        )}
      </div>

      {state.error && (
        <p className="mt-3 text-[12px] text-red-500">{state.error}</p>
      )}

      {state.warnings.length > 0 && (
        <p className="mt-3 text-[12px] text-[#8e8e93]">
          Нераспознанные блоки: {state.warnings.length}. Импорт отключён, пока текст не будет распознан полностью.
        </p>
      )}

      {state.preview.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-[#ebe7f5] bg-white">
          <div className="border-b border-[#f3f0fa] px-4 py-2 text-[12px] font-medium text-[#6e6e73]">
            Preview перед импортом
          </div>
          <div className={desktop ? 'max-h-[280px] overflow-y-auto' : 'max-h-[260px] overflow-y-auto'}>
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-[#8e8e93]">
                  <th className="px-4 py-2 font-medium">Дата</th>
                  <th className="px-4 py-2 font-medium">Выпуск</th>
                  <th className="px-4 py-2 font-medium">Просл.</th>
                  <th className="px-4 py-2 font-medium">Видео</th>
                </tr>
              </thead>
              <tbody>
                {state.preview.slice(0, 12).map(episode => (
                  <tr key={`${episode.publishDate}-${episode.title}`} className="border-t border-[#f5f5f7] align-top">
                    <td className="px-4 py-2 whitespace-nowrap text-[#6e6e73]">{episode.publishDate}</td>
                    <td className="px-4 py-2 text-[#1d1d1f]">
                      <div>{episode.title}</div>
                      <div className="mt-0.5 text-[11px] text-[#8e8e93]">
                        {[episode.seasonLabel, episode.episodeNumber ? `${episode.episodeNumber} выпуск` : null, episode.durationLabel].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-[#1d1d1f]">{episode.plays.toLocaleString('ru')}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-[#6e6e73]">{episode.videoViews.toLocaleString('ru')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.preview.length > 12 && (
            <p className="border-t border-[#f3f0fa] px-4 py-2 text-[11px] text-[#8e8e93]">
              И ещё {state.preview.length - 12} выпусков будут импортированы.
            </p>
          )}
        </div>
      )}
    </>
  )

  if (desktop) {
    return (
      <div className="mt-4 rounded-xl border border-[#e5e5ea] bg-[#faf8ff] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-[13px] font-semibold text-[#1d1d1f]">Альтернатива без подписки: вставка текста</h4>
              <span className="text-[10px] text-[#7b57c8] bg-white px-2 py-1 rounded-full border border-[#e5e5ea] whitespace-nowrap">
                Альтернатива
              </span>
            </div>
            <p className="text-[12px] text-[#6e6e73] mt-1 leading-relaxed">{INTRO_TEXT}</p>
          </div>
        </div>

        {tutorial}
        {form}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#e5e5ea] bg-[#faf8ff] p-4">
      <button
        type="button"
        onClick={state.onToggleAlternative}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/80 px-4 py-3 text-left transition-colors hover:bg-white"
        aria-expanded={state.alternativeOpen}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[13px] font-semibold text-[#1d1d1f]">Альтернатива без подписки: вставка текста</h4>
            <span className="whitespace-nowrap rounded-full border border-[#e5e5ea] bg-white px-2 py-1 text-[10px] text-[#7b57c8]">
              Альтернатива
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-[#6e6e73]">
            Вторичный сценарий. Нажми, чтобы раскрыть ручную вставку из Mave.
          </p>
        </div>
        <span
          className="inline-block flex-shrink-0 text-[#7b57c8] transition-transform duration-300"
          style={{ transform: state.alternativeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ↓
        </span>
      </button>

      <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{ maxHeight: state.alternativeOpen ? '2200px' : '0px', opacity: state.alternativeOpen ? 1 : 0 }}
      >
        <div className="mt-3">
          <p className="text-[12px] leading-relaxed text-[#6e6e73]">{INTRO_TEXT}</p>
          {tutorial}
          {form}
        </div>
      </div>
    </div>
  )
}

'use client'

import { getCtaClasses } from '@/lib/ctaStyles'

export interface PlatformStatus {
  key: string
  label: string
  isDone: boolean
}

interface Props {
  statuses: PlatformStatus[]
  canOpenDashboard: boolean
  onOpenDashboard: () => void
}

/** Последняя мобильная сцена мастера: что подключено и кнопка в дашборд. */
export function SetupFinishScene({ statuses, canOpenDashboard, onOpenDashboard }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea] shadow-sm">
        <h3 className="text-[16px] font-semibold text-[#1d1d1f]">Готово к просмотру</h3>
        <p className="mt-1 text-[13px] text-[#6e6e73]">
          Проверь, какие платформы уже подключены, и переходи в дашборд. Остальные источники можно добавить позже.
        </p>
      </div>

      <div className="space-y-2">
        {statuses.map(status => (
          <div key={status.key} className="flex items-center justify-between rounded-xl border border-[#e5e5ea] bg-white px-4 py-3 shadow-sm">
            <span className="text-[14px] font-medium text-[#1d1d1f]">{status.label}</span>
            <span className={`text-[12px] font-medium ${status.isDone ? 'text-green-600' : 'text-[#8e8e93]'}`}>
              {status.isDone ? 'Готово' : 'Не добавлено'}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-[#aeaeb2] text-center">
        💡 Для точной статистики выгружай данные за одинаковый период со всех платформ
      </p>

      <button
        onClick={onOpenDashboard}
        disabled={!canOpenDashboard}
        className={getCtaClasses({
          tone: 'primary',
          fullWidth: true,
          disabled: !canOpenDashboard,
        })}
      >
        Открыть дашборд
      </button>
    </div>
  )
}

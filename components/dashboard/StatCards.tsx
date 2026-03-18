import type { NormalizedEpisode, PlayRecord } from '@/types'

interface Props {
  episodes: NormalizedEpisode[]
  rawPlays: PlayRecord[]
}

export function StatCards({ episodes, rawPlays }: Props) {
  // Use rawPlays for platform totals — includes unmatched episodes too
  const sum = (platform: PlayRecord['platform']) =>
    rawPlays.filter(r => r.platform === platform).reduce((s, r) => s + r.plays, 0)

  const mave = sum('mave')
  const yandex = sum('yandex')
  const spotify = sum('spotify')
  const vk = sum('vk')
  const total = mave + yandex + spotify + vk
  const avg = episodes.length > 0 ? Math.round(total / episodes.length) : 0

  const fmt = (n: number) => n.toLocaleString('ru')
  const pct = (n: number) => total > 0 ? `${Math.round(n / total * 100)}%` : '—'

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      <div className="bg-[#b150e2] rounded-2xl p-5 text-white col-span-2 md:col-span-1 shadow-sm">
        <p className="text-white/70 text-[12px] font-medium uppercase tracking-wide mb-2">Всего</p>
        <p className="text-[28px] font-bold leading-none mb-1">{fmt(total)}</p>
        <p className="text-white/60 text-[12px]">ср. {fmt(avg)} / эп.</p>
      </div>

      {[
        { label: 'Mave', value: mave },
        { label: 'Яндекс', value: yandex },
        { label: 'Spotify', value: spotify },
        { label: 'VK', value: vk },
      ].filter(c => c.value > 0).map(c => (
        <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-[#e5e5ea]">
          <p className="text-[#6e6e73] text-[12px] font-medium uppercase tracking-wide mb-2">{c.label}</p>
          <p className="text-[22px] font-bold text-[#1d1d1f] leading-none mb-1">{fmt(c.value)}</p>
          <p className="text-[#aeaeb2] text-[12px]">{pct(c.value)}</p>
        </div>
      ))}
    </div>
  )
}

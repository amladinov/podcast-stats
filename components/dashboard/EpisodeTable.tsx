'use client'

import { useState, useRef, useEffect } from 'react'
import type { NormalizedEpisode } from '@/types'

interface Props {
  episodes: NormalizedEpisode[]
}

type SortKey = 'total' | 'mave' | 'yandex' | 'spotify' | 'vk' | 'youtube' | 'publishDate'

interface SortHeaderProps {
  active: boolean
  desc: boolean
  label: string
  onClick: () => void
}

function SortHeader({ active, desc, label, onClick }: SortHeaderProps) {
  return (
    <th
      onClick={onClick}
      className={`text-left text-[11px] font-semibold uppercase tracking-wide px-4 py-3 cursor-pointer select-none whitespace-nowrap transition-colors ${
        active ? 'text-[#b150e2]' : 'text-[#aeaeb2] hover:text-[#6e6e73]'
      }`}
    >
      {label}
      {active && (
        <span className="ml-1 text-[#b150e2]">{desc ? '↓' : '↑'}</span>
      )}
    </th>
  )
}

export function EpisodeTable({ episodes }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [desc, setDesc] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function check() {
      if (!el) return
      setCanScrollRight(el.scrollWidth > el.clientWidth + 2)
    }
    check()
    el.addEventListener('scroll', check)
    window.addEventListener('resize', check)
    return () => {
      el.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [episodes])

  const sorted = [...episodes].sort((a, b) => {
    let av: number, bv: number
    if (sortKey === 'publishDate') {
      av = new Date(a.publishDate).getTime()
      bv = new Date(b.publishDate).getTime()
    } else {
      av = a.plays[sortKey]
      bv = b.plays[sortKey]
    }
    return desc ? bv - av : av - bv
  })

  const visible = showAll ? sorted : sorted.slice(0, 20)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setDesc(d => !d)
    else { setSortKey(key); setDesc(true) }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] shadow-sm overflow-hidden print:break-inside-auto print:shadow-none">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between print:pb-4">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Эпизоды</h2>
        <span className="text-[12px] text-[#aeaeb2]">{episodes.length} эп.</span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-x-auto relative print:overflow-visible"
        style={canScrollRight ? {
          maskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)',
        } : undefined}
      >
        <table className="w-full">
          <thead className="border-b border-[#f0f0f0]">
            <tr>
              <th className="text-left text-[11px] text-[#aeaeb2] font-semibold uppercase tracking-wide px-5 py-3 w-full">Название</th>
              <SortHeader active={sortKey === 'publishDate'} desc={desc} label="Дата" onClick={() => toggleSort('publishDate')} />
              <SortHeader active={sortKey === 'total'} desc={desc} label="Итого" onClick={() => toggleSort('total')} />
              <SortHeader active={sortKey === 'mave'} desc={desc} label="Mave" onClick={() => toggleSort('mave')} />
              <SortHeader active={sortKey === 'yandex'} desc={desc} label="Яндекс" onClick={() => toggleSort('yandex')} />
              <SortHeader active={sortKey === 'spotify'} desc={desc} label="Spotify" onClick={() => toggleSort('spotify')} />
              <SortHeader active={sortKey === 'vk'} desc={desc} label="VK" onClick={() => toggleSort('vk')} />
              <SortHeader active={sortKey === 'youtube'} desc={desc} label="YouTube" onClick={() => toggleSort('youtube')} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((ep, i) => {
              const hiddenOnScreen = !showAll && i >= visible.length
              return (
              <tr
                key={ep.id}
                className={`border-b border-[#f5f5f7] hover:bg-[#fafafa] transition-colors ${i === sorted.length - 1 ? 'border-0' : ''} ${hiddenOnScreen ? 'hidden print:table-row' : ''}`}
              >
                <td className="px-5 py-3 max-w-xs">
                  <p className="text-[14px] text-[#1d1d1f] truncate" title={ep.title}>{ep.title}</p>
                </td>
                <td className="px-4 py-3 text-[13px] text-[#aeaeb2] whitespace-nowrap">
                  {ep.publishDate
                    ? new Date(ep.publishDate).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: '2-digit' })
                    : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-[14px] font-semibold text-[#b150e2]">{ep.plays.total.toLocaleString('ru')}</span>
                </td>
                <td className="px-4 py-3 text-[13px] text-[#6e6e73] whitespace-nowrap">{ep.plays.mave ? ep.plays.mave.toLocaleString('ru') : <span className="text-[#d2d2d7]">—</span>}</td>
                <td className="px-4 py-3 text-[13px] text-[#6e6e73] whitespace-nowrap">{ep.plays.yandex ? ep.plays.yandex.toLocaleString('ru') : <span className="text-[#d2d2d7]">—</span>}</td>
                <td className="px-4 py-3 text-[13px] text-[#6e6e73] whitespace-nowrap">{ep.plays.spotify ? ep.plays.spotify.toLocaleString('ru') : <span className="text-[#d2d2d7]">—</span>}</td>
                <td className="px-4 py-3 text-[13px] text-[#6e6e73] whitespace-nowrap">{ep.plays.vk ? ep.plays.vk.toLocaleString('ru') : <span className="text-[#d2d2d7]">—</span>}</td>
                <td className="px-4 py-3 text-[13px] text-[#6e6e73] whitespace-nowrap">{ep.plays.youtube ? ep.plays.youtube.toLocaleString('ru') : <span className="text-[#d2d2d7]">—</span>}</td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      {episodes.length > 20 && (
        <div className="px-5 py-3 text-center border-t border-[#f0f0f0] print:hidden">
          <button onClick={() => setShowAll(v => !v)} className="text-[13px] text-[#b150e2] hover:opacity-70 transition-opacity font-medium">
            {showAll ? 'Свернуть' : `Показать все ${episodes.length} эпизодов`}
          </button>
        </div>
      )}
    </div>
  )
}

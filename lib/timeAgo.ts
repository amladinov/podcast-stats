// Format ISO timestamp as Russian relative time: "только что", "вчера", "12 дней назад", "2 мес. назад"

export function formatTimeAgo(iso: string, now: Date = new Date()): string {
  const past = new Date(iso)
  if (Number.isNaN(past.getTime())) return ''

  const diffMs = now.getTime() - past.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'только что'

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} ${pluralRu(diffMin, 'минуту', 'минуты', 'минут')} назад`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} ${pluralRu(diffHour, 'час', 'часа', 'часов')} назад`

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay === 1) return 'вчера'
  if (diffDay < 30) return `${diffDay} ${pluralRu(diffDay, 'день', 'дня', 'дней')} назад`

  const diffMonth = Math.floor(diffDay / 30)
  if (diffMonth < 12) return `${diffMonth} мес. назад`

  const diffYear = Math.floor(diffMonth / 12)
  return `${diffYear} ${pluralRu(diffYear, 'год', 'года', 'лет')} назад`
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

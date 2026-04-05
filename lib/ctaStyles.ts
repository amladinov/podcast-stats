type CtaTone = 'primary' | 'secondary' | 'dark'
type CtaSize = 'default' | 'compact'

type CtaStyleOptions = {
  tone: CtaTone
  size?: CtaSize
  fullWidth?: boolean
  disabled?: boolean
}

export function getCtaClasses({
  tone,
  size = 'default',
  fullWidth = false,
  disabled = false,
}: CtaStyleOptions) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-[32px] font-medium transition-all border'
  const sizeClass =
    size === 'compact'
      ? 'h-[40px] px-4 text-[13px]'
      : 'h-[44px] px-5 text-[14px]'
  const widthClass = fullWidth ? 'w-full sm:w-auto' : ''
  const disabledClass = disabled ? 'cursor-not-allowed opacity-50' : ''

  const toneClass =
    tone === 'primary'
      ? 'border-transparent bg-[#b150e2] text-white shadow-[0_10px_22px_rgba(177,80,226,0.2)] hover:bg-[#9a3fd1]'
      : tone === 'dark'
        ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white shadow-[0_10px_22px_rgba(29,29,31,0.12)] hover:opacity-90'
        : 'border-[#e5e5ea] bg-white text-[#1d1d1f] shadow-[0_10px_22px_rgba(123,87,200,0.08)] hover:bg-[#f5f5f7]'

  return [base, sizeClass, widthClass, toneClass, disabledClass].filter(Boolean).join(' ')
}

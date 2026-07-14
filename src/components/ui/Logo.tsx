import { Languages } from 'lucide-react'

const SIZE_CLASSES = {
  sm: { mark: 'h-7 w-7', icon: 14, text: 'text-base' },
  md: { mark: 'h-9 w-9', icon: 18, text: 'text-lg' },
  lg: { mark: 'h-12 w-12', icon: 24, text: 'text-2xl' },
} as const

interface LogoProps {
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

/** Marca do app: mostrada no topo das telas de auth e na navegação — puramente decorativa (aria-hidden). */
function Logo({ size = 'md', className = '' }: LogoProps) {
  const { mark, icon, text } = SIZE_CLASSES[size]

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`} aria-hidden="true">
      <span
        className={`flex ${mark} shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-400 text-white shadow-md shadow-brand-500/30`}
      >
        <Languages size={icon} strokeWidth={2.25} />
      </span>
      <span className={`font-display ${text} font-extrabold tracking-tight text-ink-900`}>Papo</span>
    </div>
  )
}

export default Logo

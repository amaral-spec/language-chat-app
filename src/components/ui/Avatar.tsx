const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
} as const

interface AvatarProps {
  label: string
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

/** Círculo com gradiente de marca + inicial do nome; `title` é usado por outras telas/testes para identificar a pessoa. */
function Avatar({ label, size = 'md', className = '' }: AvatarProps) {
  const initial = label.charAt(0).toUpperCase()

  return (
    <span
      title={label}
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 font-display font-bold text-white ${SIZE_CLASSES[size]} ${className}`}
    >
      {initial}
    </span>
  )
}

export default Avatar

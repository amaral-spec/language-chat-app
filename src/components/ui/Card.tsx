import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

/** Container branco arredondado usado por todos os cards de stats/listas. */
function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-2xl border border-ink-200/70 bg-white p-4 shadow-sm shadow-ink-900/[0.03] ${className}`}
    >
      {children}
    </div>
  )
}

export default Card

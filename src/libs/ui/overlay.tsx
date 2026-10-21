import type { On, VNodeStyle } from 'snabbdom'
import { cn } from './class-names.ts'

/** Fades in once inserted, and out before being removed. */
export const fade: VNodeStyle = {
  opacity: '0',
  transition: 'opacity 200ms',
  delayed: { opacity: '1' },
  remove: { opacity: '0' },
}

/** The dimmed layer behind a modal or a menu; a click on it closes what is open. */
export const backdrop = (key: string, className: string, on: On) => (
  <div
    key={key}
    style={fade}
    on={on}
    props={{ className: cn('fixed top-0 bottom-0 left-0 right-0 bg-black/50 backdrop-blur-xs', className) }}
  />
)

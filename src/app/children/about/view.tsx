import * as Opt from 'effect/Option'
import type { VNode } from 'snabbdom'
import { handlers, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { LicenseCard, Message, Model } from './program.ts'

const link = (href: string, text: string): VNode => <a props={{ className: 'text-primary underline', href }}>{text}</a>

const icon = (name: string, className: string): VNode => (
  <span props={{ className: `material-symbols-rounded ${className}` }}>{name}</span>
)

/** A list item of the project's card: a leading icon, then a sentence. */
const row = (iconName: string, content: ReadonlyArray<VNode | string>): VNode => (
  <li props={{ className: 'flex min-h-14 items-center gap-4 px-4 py-2' }}>
    {icon(iconName, 'text-on-surface-variant')}
    <p props={{ className: 'text-body-large text-on-surface' }}>{content}</p>
  </li>
)

const card = (card: LicenseCard): VNode => (
  <div
    key={card.key}
    style={{ contentVisibility: 'auto' }}
    // Material's outlined card: a long list of them stays light.
    props={{ className: 'flex flex-col gap-1 rounded-medium border border-outline-variant p-4' }}
  >
    <div props={{ className: 'flex items-baseline justify-between gap-3' }}>
      <h3 props={{ className: 'text-title-medium text-on-surface break-all' }}>{card.title}</h3>
      {Opt.match(card.maybeLicenses, {
        onNone: () => [],
        onSome: (licenses) => [
          <span props={{ className: 'shrink-0 text-label-medium text-on-surface-variant' }}>{licenses}</span>,
        ],
      })}
    </div>
    {Opt.match(card.maybeDescription, {
      onNone: () => [],
      onSome: (description) => [
        <p props={{ className: 'text-body-medium text-on-surface break-words' }}>{description}</p>,
      ],
    })}
    {card.lines.map((line) => <p props={{ className: 'text-body-small text-on-surface-variant break-words' }}>{line}
    </p>)}
    {Opt.match(card.maybeRepository, {
      onNone: () => [],
      onSome: (url) => [
        <a props={{ className: 'text-primary block truncate text-body-small underline', href: encodeURI(url) }}>
          {url}
        </a>,
      ],
    })}
  </div>
)

const scrollTop = (event: Event) => (event.target as HTMLElement).scrollTop

/**
 * The page, scrolling on its own over the one that opened it: it slides in and fades, Material's shared axis,
 * and leaves the same way, letting nothing through while it does.
 */
export const view: View<Model, Message> = (model, dispatch) => {
  const { on, onValue } = handlers(dispatch)
  return (
    <div
      key='About'
      style={{
        opacity: '0',
        transform: 'translateY(30px)',
        transitionProperty: 'opacity, transform',
        transitionDuration: 'var(--transition-duration-medium-4)',
        transitionTimingFunction: 'var(--ease-emphasized-decelerate)',
        delayed: { opacity: '1', transform: 'none' },
        remove: {
          opacity: '0',
          transform: 'translateY(30px)',
          pointerEvents: 'none',
          transitionDuration: 'var(--transition-duration-short-4)',
          transitionTimingFunction: 'var(--ease-emphasized-accelerate)',
        },
      }}
      props={{ className: 'fixed inset-0 z-70 overflow-y-auto overscroll-y-none bg-surface text-on-surface' }}
      on={onValue('scroll', model.scroll, scrollTop)}
    >
      {/* Material's small top app bar: the surface's color at rest, filled with a container's once the page scrolls under it. */}
      <div
        props={{
          className: cn(
            'sticky top-0 z-20 pt-sait pl-sail pr-sair transition-colors',
            model.isAtTop ? 'bg-surface' : 'bg-surface-container',
          ),
        }}
      >
        <div props={{ className: 'flex h-16 items-center px-1' }}>
          <button
            attrs={{ 'aria-label': 'Back' }}
            props={{
              className: 'state-layer material-symbols-rounded flex h-12 w-12 items-center justify-center rounded-full',
              title: 'Back',
            }}
            on={on('click', model.back)}
          >
            arrow_back
          </button>
          <h1 props={{ className: 'px-1 text-title-large-emphasized' }}>About</h1>
        </div>
      </div>
      <div props={{ className: 'pb-saib pl-sail pr-sair' }}>
        <div props={{ className: 'mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-8 pb-8' }}>
          <div props={{ className: 'flex flex-col items-center gap-2 py-4 text-center' }}>
            <div
              // The logo, a solid shape, in on-surface's color of either theme: the SVG masks a box of that role.
              // The WebView floor (115) has only `-webkit-mask`; `mask` came in 120, and no tool prefixes it.
              style={{
                '-webkit-mask': 'url(./logo.svg) center / contain no-repeat',
                mask: 'url(./logo.svg) center / contain no-repeat',
              }}
              props={{ className: 'h-24 w-24 bg-on-surface' }}
            />
            <p props={{ className: 'mt-2 text-headline-medium text-on-surface' }}>Fridgy</p>
            {model.version._tag === 'Loading' ? [] : [
              <p props={{ className: 'text-label-large text-on-surface-variant' }}>Version {model.version.version}</p>,
            ]}
            <p props={{ className: 'mt-2 text-body-large text-on-surface-variant' }}>
              Keep track of what is in your fridge and when it expires.
            </p>
          </div>
          {/* Material's filled card, holding a list. */}
          <ul props={{ className: 'rounded-medium bg-surface-container-highest divide-y divide-outline-variant' }}>
            {row('balance', [
              'Free software, released under the ',
              link('https://spdx.org/licenses/AGPL-3.0-or-later.html', 'AGPL-3.0-or-later'),
              ' license.',
            ])}
            {row('code', ['The source code is on ', link('https://github.com/fgaudo/fridgy', 'GitHub'), '.'])}
            {/* The attribution Open Food Facts' licence asks for: the licenses below come from npm and cannot carry it. */}
            {row('barcode', [
              'Product names from ',
              link('https://openfoodfacts.org', 'Open Food Facts'),
              ', under the ',
              link('https://opendatacommons.org/licenses/odbl/1-0/', 'Open Database License'),
              '.',
            ])}
            {row('privacy_tip', [
              'Your products stay on your phone: read the ',
              link('https://github.com/fgaudo/fridgy/blob/main/PRIVACY.md', 'privacy policy'),
              '.',
            ])}
            {row('bug_report', [
              'Found a bug, or have an idea? ',
              link('https://github.com/fgaudo/fridgy/issues', 'Open an issue'),
              '.',
            ])}
          </ul>
          <p props={{ className: 'text-center text-body-small text-on-surface-variant' }}>
            © 2024–2026 Francesco Gaudenzi
          </p>
          <div props={{ className: 'mt-4' }}>
            <h2 props={{ className: 'text-title-large text-on-surface' }}>Open source libraries</h2>
            <p props={{ className: 'text-body-medium text-on-surface-variant' }}>
              Fridgy is built with these libraries, under their own licenses.
            </p>
          </div>
          {model.licenses._tag === 'Loading' ? [] : model.licenses.cards.map(card)}
        </div>
      </div>
    </div>
  )
}

import * as Opt from 'effect/Option'
import type { VNode } from 'snabbdom'
import { handlers, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import type { License } from './services/licenses/licenses.ts'
import type { Message, Model } from './program.ts'

const link = (href: string, text: string): VNode => <a props={{ className: 'text-primary underline', href }}>{text}</a>

const icon = (name: string, className: string): VNode => (
  <span props={{ className: `material-symbols-rounded ${className}` }}>{name}</span>
)

const card = 'rounded-lg bg-secondary/5 shadow-sm'

/** A row of the project's card: an icon, then a sentence. */
const row = (iconName: string, content: ReadonlyArray<VNode | string>): VNode => (
  <div props={{ className: 'flex items-center gap-4 px-4 py-3' }}>
    {icon(iconName, 'text-secondary')}
    <p>{content}</p>
  </div>
)

const nonEmpty = (value: Opt.Option<string>) => Opt.filter(value, (text) => text.trim().length > 0)

const license = (license: License): VNode => {
  const line = (value: Opt.Option<string>): ReadonlyArray<VNode> =>
    Opt.match(nonEmpty(value), {
      onNone: () => [],
      onSome: (text) => [<p props={{ className: 'text-xs text-on-background/60 break-words' }}>{text}</p>],
    })
  return (
    <div
      key={license.packageName}
      style={{ contentVisibility: 'auto' }}
      props={{ className: `${card} flex flex-col gap-1 p-4` }}
    >
      <div props={{ className: 'flex items-start justify-between gap-3' }}>
        <h3 props={{ className: 'font-bold break-all' }}>
          {Opt.getOrElse(nonEmpty(license.name), () => license.packageName)}
        </h3>
        {Opt.match(nonEmpty(license.licenses), {
          onNone: () => [],
          onSome: (licenses) => [
            <span props={{ className: 'shrink-0 rounded-full bg-secondary/25 px-2 py-0.5 text-xs font-bold' }}>
              {licenses}
            </span>,
          ],
        })}
      </div>
      {Opt.match(nonEmpty(license.description), {
        onNone: () => [],
        onSome: (description) => [<p props={{ className: 'text-sm break-words' }}>{description}</p>],
      })}
      {line(license.copyright)}
      {line(Opt.orElse(nonEmpty(license.publisher), () => license.email))}
      {Opt.match(nonEmpty(license.repository), {
        onNone: () => [],
        onSome: (url) => [
          <a props={{ className: 'text-primary block truncate text-xs underline', href: encodeURI(url) }}>{url}</a>,
        ],
      })}
    </div>
  )
}

export const view: View<Model, Message> = (model, dispatch) => {
  const { on } = handlers(dispatch)
  return (
    <div
      style={{
        opacity: '0',
        transform: 'translateY(30px)',
        transition: 'opacity 400ms, transform 400ms cubic-bezier(0.33, 1, 0.68, 1)',
        delayed: { opacity: '1', transform: 'none' },
      }}
    >
      <div
        props={{
          className: 'bg-secondary shadow-secondary/40 fixed top-0 z-20 w-full pt-sait pl-sail pr-sair shadow-md',
        }}
      >
        <div props={{ className: 'flex h-16 items-center' }}>
          <button
            props={{
              className:
                'material-symbols-rounded ml-2 flex h-12 w-12 items-center justify-center rounded-full transition-colors active:bg-black/10',
            }}
            on={on('click', model.back)}
          >
            arrow_back
          </button>
          <h1 props={{ className: 'pl-2 text-2xl font-bold' }}>About</h1>
        </div>
      </div>
      <div props={{ className: 'bg-background pt-sait pb-saib pl-sail pr-sair' }}>
        <div props={{ className: 'mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-24 pb-8' }}>
          <div props={{ className: 'flex flex-col items-center gap-2 py-4 text-center' }}>
            <div
              props={{
                className:
                  'bg-secondary flex h-20 w-20 items-center justify-center rounded-full shadow-sm shadow-gray-300',
              }}
            >
              {icon('kitchen', 'text-5xl! text-white')}
            </div>
            <p props={{ className: 'mt-2 text-3xl font-bold' }}>Fridgy</p>
            {Opt.match(model.version, {
              onNone: () => [],
              onSome: (version) => [
                <span props={{ className: 'rounded-full bg-secondary/25 px-3 py-0.5 text-sm font-bold' }}>
                  Version {version}
                </span>,
              ],
            })}
            <p props={{ className: 'mt-2 text-on-background/70' }}>
              Keep track of what is in your fridge and when it expires.
            </p>
          </div>
          <div props={{ className: `${card} divide-y divide-secondary/20` }}>
            {row('balance', [
              'Free software, released under the ',
              link('https://spdx.org/licenses/AGPL-3.0-or-later.html', 'AGPL-3.0-or-later'),
              ' license.',
            ])}
            {row('code', ['The source code is on ', link('https://github.com/fgaudo/fridgy', 'GitHub'), '.'])}
            {row('bug_report', [
              'Found a bug, or have an idea? ',
              link('https://github.com/fgaudo/fridgy/issues', 'Open an issue'),
              '.',
            ])}
          </div>
          <p props={{ className: 'text-center text-sm text-on-background/60' }}>© 2024–2026 Francesco Gaudenzi</p>
          <div props={{ className: 'mt-4' }}>
            <h2 props={{ className: 'text-lg font-bold' }}>Open source libraries</h2>
            <p props={{ className: 'text-sm text-on-background/70' }}>
              Fridgy is built with these libraries, under their own licenses.
            </p>
          </div>
          {model.licenses._tag === 'Loading' ? [] : model.licenses.items.map(license)}
        </div>
      </div>
    </div>
  )
}

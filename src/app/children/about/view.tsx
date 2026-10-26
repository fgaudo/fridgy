import * as Opt from 'effect/Option'
import type { VNode } from 'snabbdom'
import { handlers, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import type { License } from './services/licenses/licenses.ts'
import type { Message, Model } from './program.ts'

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

const nonEmpty = (value: Opt.Option<string>) => Opt.filter(value, (text) => text.trim().length > 0)

const license = (license: License): VNode => {
  const line = (value: Opt.Option<string>): ReadonlyArray<VNode> =>
    Opt.match(nonEmpty(value), {
      onNone: () => [],
      onSome: (text) => [<p props={{ className: 'text-body-small text-on-surface-variant break-words' }}>{text}</p>],
    })
  return (
    <div
      key={license.packageName}
      style={{ contentVisibility: 'auto' }}
      // Material's outlined card: a long list of them stays light.
      props={{ className: 'flex flex-col gap-1 rounded-medium border border-outline-variant p-4' }}
    >
      <div props={{ className: 'flex items-start justify-between gap-3' }}>
        <h3 props={{ className: 'text-title-medium text-on-surface break-all' }}>
          {Opt.getOrElse(nonEmpty(license.name), () => license.packageName)}
        </h3>
        {Opt.match(nonEmpty(license.licenses), {
          onNone: () => [],
          onSome: (licenses) => [
            <span
              props={{
                className:
                  'flex h-6 shrink-0 items-center rounded-small border border-outline-variant px-2 text-label-medium text-on-surface-variant',
              }}
            >
              {licenses}
            </span>,
          ],
        })}
      </div>
      {Opt.match(nonEmpty(license.description), {
        onNone: () => [],
        onSome: (
          description,
        ) => [<p props={{ className: 'text-body-medium text-on-surface break-words' }}>{description}</p>],
      })}
      {line(license.copyright)}
      {line(Opt.orElse(nonEmpty(license.publisher), () => license.email))}
      {Opt.match(nonEmpty(license.repository), {
        onNone: () => [],
        onSome: (url) => [
          <a props={{ className: 'text-primary block truncate text-body-small underline', href: encodeURI(url) }}>
            {url}
          </a>,
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
          className: 'bg-surface-container text-on-surface fixed top-0 z-20 w-full pt-sait pl-sail pr-sair',
        }}
      >
        <div props={{ className: 'flex h-16 items-center px-1' }}>
          <button
            props={{
              className: 'state-layer material-symbols-rounded flex h-12 w-12 items-center justify-center rounded-full',
              title: 'Back',
            }}
            on={on('click', model.back)}
          >
            arrow_back
          </button>
          <h1 props={{ className: 'px-1 text-title-large' }}>About</h1>
        </div>
      </div>
      <div props={{ className: 'bg-surface pt-sait pb-saib pl-sail pr-sair' }}>
        <div props={{ className: 'mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-24 pb-8' }}>
          <div props={{ className: 'flex flex-col items-center gap-2 py-4 text-center' }}>
            <div
              style={{ backgroundImage: 'url(./logo.svg)' }}
              props={{ className: 'h-24 w-24 bg-contain bg-center bg-no-repeat' }}
            />
            <p props={{ className: 'mt-2 text-headline-medium text-on-surface' }}>Fridgy</p>
            {Opt.match(model.version, {
              onNone: () => [],
              onSome: (version) => [
                <span
                  props={{
                    className:
                      'flex h-8 items-center rounded-small border border-outline-variant px-4 text-label-large text-on-surface-variant',
                  }}
                >
                  Version {version}
                </span>,
              ],
            })}
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
          {model.licenses._tag === 'Loading' ? [] : model.licenses.items.map(license)}
        </div>
      </div>
    </div>
  )
}

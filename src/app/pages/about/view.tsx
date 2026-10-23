import * as Opt from 'effect/Option'
import type { VNode } from 'snabbdom'
import { handlers, type View } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import type { License } from './services/licenses/licenses.ts'
import type { Message, Model } from './program.ts'

const link = (href: string, text: string): VNode => <a props={{ className: 'text-primary underline', href }}>{text}</a>

const license = (license: License): VNode => {
  const field = (value: Opt.Option<string>): ReadonlyArray<VNode> =>
    Opt.match(Opt.filter(value, (text) => text.length > 0), {
      onNone: () => [],
      onSome: (text) => [<p>{text}</p>],
    })
  return (
    <div
      key={license.packageName}
      style={{ contentVisibility: 'auto' }}
      props={{ className: 'mb-5 overflow-x-auto text-nowrap' }}
    >
      <h2 props={{ className: 'font-bold' }}>
        {Opt.getOrElse(Opt.filter(license.name, (name) => name.trim().length > 0), () => license.packageName)}
      </h2>
      {field(license.description)}
      {field(license.publisher)}
      {field(license.email)}
      {field(license.copyright)}
      {field(license.licenses)}
      {Opt.match(Opt.filter(license.repository, (url) => url.length > 0), {
        onNone: () => [],
        onSome: (url) => [link(encodeURI(url), url)],
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
        <div props={{ className: 'flex flex-col gap-2 px-6 pt-23' }}>
          <p props={{ className: 'text-xl font-bold' }}>Fridgy</p>
          <p>
            Version <span props={{ className: 'text-primary' }}>{Opt.getOrElse(model.version, () => '')}</span>
          </p>
          <p props={{ className: 'mt-2' }}>
            Keep track of what is in your fridge and when it expires.
          </p>
          <p props={{ className: 'mt-2' }}>
            Fridgy is free software, released under the{' '}
            {link('https://spdx.org/licenses/AGPL-3.0-or-later.html', 'AGPL-3.0-or-later')}{' '}
            license. Its source code is on {link('https://github.com/fgaudo/fridgy', 'GitHub')}.
          </p>
          <p props={{ className: 'mt-2' }}>
            Found a bug, or have an idea? {link('https://github.com/fgaudo/fridgy/issues', 'Open an issue')}.
          </p>
          <p props={{ className: 'mt-2' }}>© 2024–2026 Francesco Gaudenzi</p>
          <h2 props={{ className: 'mt-5 text-lg font-bold' }}>Open source libraries</h2>
          <p props={{ className: 'mb-3' }}>Fridgy is built with these libraries, under their own licenses.</p>
          {model.licenses._tag === 'Loading' ? [] : model.licenses.items.map(license)}
        </div>
      </div>
    </div>
  )
}

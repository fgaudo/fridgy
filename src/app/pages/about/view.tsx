import * as Opt from 'effect/Option'
import { handlers, type View } from '@/libs/tea-snabbdom/tea-snabbdom.ts'
import type { Message } from './program/messages.ts'
import type { Model } from './program/model.ts'

export const view: View<Model, Message> = (model, dispatch) => {
  const { on } = handlers(dispatch)
  return (
    <div props={{ className: 'flex flex-col gap-4 p-4 pt-sait' }}>
      <div props={{ className: 'flex items-center gap-2' }}>
        <button props={{ className: 'material-symbols-rounded p-2' }} on={on('click', model.back)}>
          arrow_back
        </button>
        <h1 props={{ className: 'text-2xl font-bold' }}>Fridgy</h1>
      </div>
      <p props={{ className: 'italic' }}>{model.saying}</p>
      <h2 props={{ className: 'text-lg font-bold' }}>Open source licenses</h2>
      {model.licenses._tag === 'Loading'
        ? <p>Loading…</p>
        : (
          <ul props={{ className: 'flex flex-col gap-2' }}>
            {model.licenses.items.map((license) => (
              <li key={license.packageName}>
                <div props={{ className: 'font-bold' }}>{license.packageName}</div>
                <div props={{ className: 'text-sm' }}>{Opt.getOrElse(license.licenses, () => 'Unknown license')}</div>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}

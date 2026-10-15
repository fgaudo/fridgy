import * as Opt from 'effect/Option'
import { h, type VNode } from 'snabbdom'
import type { View } from '@/libs/elm/view.ts'
import type { Message } from './program/messages.ts'
import type { Model } from './program/model.ts'

export const view: View<Model, Message, VNode> = (model, dispatch) =>
  h('div', { props: { className: 'flex flex-col gap-4 p-4 pt-sait' } }, [
    h('div', { props: { className: 'flex items-center gap-2' } }, [
      h('button', {
        on: {
          click: () => {
            if (Opt.isSome(model.back)) dispatch(model.back.value)
          },
        },
        props: { className: 'material-symbols-rounded p-2' },
      }, 'arrow_back'),
      h('h1', { props: { className: 'text-2xl font-bold' } }, 'Fridgy'),
    ]),
    h('p', { props: { className: 'italic' } }, model.saying),
    h('h2', { props: { className: 'text-lg font-bold' } }, 'Open source licenses'),
    model.licenses._tag === 'Loading'
      ? h('p', 'Loading…')
      : h(
        'ul',
        { props: { className: 'flex flex-col gap-2' } },
        model.licenses.items.map((license) =>
          h('li', { key: license.packageName }, [
            h('div', { props: { className: 'font-bold' } }, license.packageName),
            h('div', { props: { className: 'text-sm' } }, Opt.getOrElse(license.licenses, () => 'Unknown license')),
          ])
        ),
      ),
  ])

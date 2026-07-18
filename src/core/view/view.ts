import * as Effect from 'effect/Effect'
import { h } from 'snabbdom'
import { Dispatcher, Message } from '@/core/application/messages.ts'
import type { Model } from '@/core/application/model.ts'
import * as Home from '@/feature/home/view/view.ts'

export const makeView = Effect.gen(function*() {
  const dispatch = yield* Dispatcher
  const homeView = yield* Home.makeView
  return (model: Model) => {
    return h(
      'div',
      {
        key: 'root',
        hook: {
          create: () => {
            dispatch(Message.HideSplashScreenRequested())
          },
        },
      },
      (model.currentPage._tag === 'Home') ?
        h('div', { key: 'home' }, homeView(model.currentPage.model, model.currentPage.route))
        : h('div'),
    )
  }
})

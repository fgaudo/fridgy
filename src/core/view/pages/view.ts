import * as Effect from 'effect/Effect'
import { h } from 'snabbdom'
import { Message } from '@/core/application/messages.ts'
import type { Model } from '@/core/application/model.ts'
import { EventPublisher } from '@/core/view/event-publisher.ts'
import * as Home from '@/feature/home/view/pages/view.ts'

export const makeView = Effect.gen(function*() {
  const homeView = yield* Home.makeView
  const publish = yield* EventPublisher

  return (model: Model) => {
    return h(
      'div',
      {
        key: 'root',
        hook: {
          create: () => {
            publish(Message.HideSplashScreenRequested())
          },
        },
      },
      (model.currentPage._tag === 'Home') ?
        h('div', { key: 'home' }, homeView(model.currentPage.model, model.currentPage.route))
        : h('div'),
    )
  }
})

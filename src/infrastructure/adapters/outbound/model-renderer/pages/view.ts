import * as Effect from 'effect/Effect'
import { h } from 'snabbdom'
import type { Model } from '@/app/core/model.ts'
import * as Home from './home/view.ts'

export const makeView = Effect.gen(function*() {
  const view = yield* Home.makeView

  return (model: Model) => {
    if (model.currentPage._tag === 'Home') {
      return h('div', { key: 'home' }, view(model.currentPage.model))
    }
    return h('div')
  }
})

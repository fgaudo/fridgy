import type { Model } from '@/app/core/model.ts'
import { UiService } from '@/infra/adapters/outbound/web-snabbdom/ui-service.ts'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Match from 'effect/Match'

import { h } from 'snabbdom'
import * as Home from './home/view.ts'

export const makeView = Effect.gen(function*() {
  const run = yield* FiberSet.makeRuntime()
  const homeView = yield* Home.makeView
  const { hideSplashScreen } = yield* UiService
  return (model: Model) => {
    if (model.currentPage._tag === 'Home') {
      return homeView(model.currentPage.model)
    }
    return h('div')
  }
})

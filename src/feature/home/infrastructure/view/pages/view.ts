import * as Effect from 'effect/Effect'
import { h } from 'snabbdom'
import { Message } from '@/app/core/messages.ts'
import type { Model } from '@/app/core/model.ts'
import type { Actions } from '@/infra/adapters/outbound/model-renderer/actions.ts'
import * as Home from './home/view.ts'

type Deps = Actions['Service']

export const makeView = (deps: Deps) => {
  const homeView = Home.makeView({
    dispatch: (message) =>
      deps.dispatch(
        Message.GotHomeMsg({ message }),
      ),
  })

  return (model: Model) => {
    if (model.currentPage._tag === 'Home') {
      return h('div', { key: 'home' }, homeView(model.currentPage.model, model.currentPage.route))
    }
    return h('div')
  }
}

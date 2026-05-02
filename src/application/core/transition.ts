import * as Data from 'effect/Data'
import type * as StateManager from '@/shared/fsm.ts'

export type Route = 'Home'

export type RouteEvent = Data.TaggedEnum<{
  GoBack: object
  NavigateTo: {
    replace?: boolean
    route: Route
  }
}>

type GlobalEvent = {
  showToast?: { text: string }
  route?: RouteEvent
}

export type Transition<S, M, R> = {
  state: S
  commands?: ReadonlyArray<StateManager.Command<M, R>>
  events?: GlobalEvent
}

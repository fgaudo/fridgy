import type * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import type * as StateManager from '@/libs/fsm.ts'

export type Route = Data.TaggedEnum<{ 'Home': { route: 'add' | 'default' } }>
export const Route = Data.taggedEnum<Route>()

export type RouteEvent = Data.TaggedEnum<{
  GoBack: object
  NavigateTo: {
    replace?: boolean
    route: Route
  }
}>

export const RouteEvent = Data.taggedEnum<RouteEvent>()

export type Transition<S, M, R> = {
  state: S
  commands?: ReadonlyArray<StateManager.Command<M, R>>
}

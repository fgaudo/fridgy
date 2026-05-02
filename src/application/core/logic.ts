import * as Chunk from 'effect/Chunk'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as T from 'effect/Tuple'
import { InternalMessage } from '@/app/core/messages.ts'
import type { RouteEvent, Transition } from '@/app/core/transition.ts'
import { ViewportCommands } from '@/app/ports/outbound/viewport-commands.ts'
import type { ViewportEvents } from '@/app/ports/outbound/viewport-events.ts'
import type * as UC from '@/app/use-cases/index.ts'
import type { ProductChanges } from '@/app/use-cases/products.ts'
import type * as StateManager from '@/shared/fsm.ts'
import { mapSubscriptions } from '../../shared/helpers.ts'
import * as Home from './home/logic.ts'
import type { State } from './model.ts'

type Deps = UC.All | ViewportCommands

const showToastStep = (text: string) =>
(
  [state, commands]: StateManager.Step<State, InternalMessage, Deps>,
): StateManager.Step<State, InternalMessage, Deps> => {
  const nextVersion = state.toast.version + 1n
  const s = {
    ...state,
    toast: {
      version: nextVersion,
      maybeText: Option.some(text),
    },
  }
  const c = [
    ...commands,
    Effect.succeed(
      InternalMessage.HideToast({ version: nextVersion }),
    ).pipe(Effect.delay('2 seconds')),
  ]
  return [s, c] as const
}

const routeStep = (event: RouteEvent) =>
(
  [state, commands]: StateManager.Step<State, InternalMessage, Deps>,
): StateManager.Step<State, InternalMessage, Deps> => {
  let s = state
  if (event._tag === 'GoBack') {
    const navigationStack = Chunk.drop(s.navigationStack, 1)
    if (Chunk.isNonEmpty(navigationStack)) {
      s = { ...s, navigationStack }
    }
    return [s, commands] as const
  }
  if (event._tag === 'NavigateTo') {
    const navigationStack = event.replace === true
      ? Chunk.drop(s.navigationStack, 1).pipe(Chunk.prepend(event.route))
      : Chunk.prepend(s.navigationStack, event.route)
    s = { ...s, navigationStack }
    return [s, commands] as const
  }
  return [s, commands] as const
}

const map = <S, M>(
  { state, commands, events }: Transition<S, M, Deps>,
  mapState: (state: S) => State,
  mapMsg: (message: M) => InternalMessage,
): StateManager.Step<State, InternalMessage, Deps> => {
  let transition: StateManager.Step<State, InternalMessage, Deps> = [
    mapState(state),
    (commands ?? []).map(Effect.map(mapMsg)),
  ] as const
  if (events?.showToast !== undefined) {
    transition = showToastStep(events.showToast.text)(transition)
  }
  if (events?.route !== undefined) {
    transition = routeStep(events.route)(transition)
  }
  return transition
}

export const update: StateManager.Update<State, InternalMessage, Deps> = (message) => (state) => {
  const currentPage = Chunk.headNonEmpty(state.navigationStack)
  if (currentPage === 'Home' && message._tag === 'GotHomeMsg') {
    const transition = Home.update(message.message)(state.page[currentPage])
    return map(
      transition,
      (homeState) => ({
        ...state,
        page: {
          ...state.page,
          Home: homeState,
        },
      }),
      (message) => InternalMessage.GotHomeMsg({ message }),
    )
  }
  return Match.value(message).pipe(
    Match.withReturnType<
      ReturnType<StateManager.Update<State, InternalMessage, Deps>>
    >(),
    Match.tag('BackButtonPressed', () => (state) => {
      const navigationStack = Chunk.drop(state.navigationStack, 1)
      if (Chunk.isNonEmpty(navigationStack)) {
        return T.make(
          { ...state, navigationStack },
          [],
        )
      }
      return T.make(state, [
        Effect.service(ViewportCommands).pipe(
          Effect.andThen(({ closeApp }) => closeApp),
          Effect.map(() => InternalMessage.NoOp()),
        ),
      ])
    }),
    Match.tag('Crash', ({ error }) => (state) => {
      return T.make(
        state,
        [
          Effect.logError(error).pipe(
            Effect.map(() => InternalMessage.NoOp()),
          ),
        ],
      )
    }),
    Match.tag('NoOp', () => (state) => {
      return T.make(state, [])
    }),
    Match.orElse((message) => (state) => {
      return T.make(
        state,
        [
          Effect.logWarning('Ignored message', message).pipe(
            Effect.map(() => InternalMessage.NoOp()),
          ),
        ],
      )
    }),
  )(state)
}

export const makeDefectMessage = (error: unknown) => InternalMessage.Crash({ error })

export const init: StateManager.Step<
  State,
  InternalMessage,
  Deps
> = (() => {
  const [state, commands] = Home.init
  return T.make(
    {
      appIsReady: true,
      navigationStack: Chunk.make('Home' as const),
      page: { AddProduct: {}, Home: state },
      toast: { maybeText: Option.none(), version: 0n },
    },
    commands.map(Effect.map((message) => InternalMessage.GotHomeMsg({ message }))),
  )
})()

export const subscriptions: StateManager.Emitter<
  State,
  InternalMessage,
  ViewportEvents | ProductChanges
> = (state: State) => {
  let subs: ReturnType<typeof subscriptions> = HashMap.empty()
  const currentPage = Chunk.headNonEmpty(state.navigationStack)
  if (currentPage === 'Home') {
    subs = HashMap.setMany(
      subs,
      mapSubscriptions(
        Home.subscriptions(state.page[currentPage]),
        (k) => T.make('Home', k),
        (message) => InternalMessage.GotHomeMsg({ message }),
      ),
    )
  }
  return subs
}

import * as Arr from 'effect/Array'
import * as Chunk from 'effect/Chunk'
import * as Effect from 'effect/Effect'
import { absurd } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as T from 'effect/Tuple'
import { InternalMessage } from '@/core/application/messages.ts'
import { Route, type RouteEvent, type Transition } from '@/core/application/transition.ts'
import { ViewportCommands } from '@/app/ports/outbound/viewport-commands.ts'
import type { ViewportEvents } from '@/app/ports/outbound/viewport-events.ts'
import type * as UC from '@/app/use-cases/index.ts'
import type { ProductChanges } from '@/app/use-cases/products-read.ts'
import type * as StateManager from '@/shared/fsm.ts'
import { mapSubscriptions } from '../../shared/helpers.ts'
import * as Home from '../../feature/home/application/logic.ts'
import type { State } from '../../feature/home/application/ui/model.ts'

type Deps = UC.All | ViewportCommands

const makeShowToastStep = (text: string) =>
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

const makeGoBackStep = ([state, commands]: StateManager.Step<State, InternalMessage, Deps>) => {
  const navigationStack = Chunk.drop(state.navigationStack, 1)
  if (Chunk.isNonEmpty(navigationStack)) {
    return T.make(
      { ...state, navigationStack },
      [],
    )
  }
  return T.make(state, [
    ...commands,
    Effect.service(ViewportCommands).pipe(
      Effect.andThen(({ closeApp }) => closeApp),
      Effect.map(() => InternalMessage.NoOp()),
    ),
  ])
}

const makeRouteStep = (event: RouteEvent) =>
(
  [state, commands]: StateManager.Step<State, InternalMessage, Deps>,
): StateManager.Step<State, InternalMessage, Deps> => {
  if (event._tag === 'GoBack') {
    return makeGoBackStep([state, commands])
  }
  if (event._tag === 'NavigateTo') {
    const navigationStack = event.replace === true
      ? Chunk.drop(state.navigationStack, 1).pipe(Chunk.prepend(event.route))
      : Chunk.prepend(state.navigationStack, event.route)
    return [{ ...state, navigationStack }, commands] as const
  }
  return [state, commands] as const
}

const map = <S, M>(
  { state, commands, events }: Transition<S, M, Deps>,
  mapState: (state: S) => State,
  mapMsg: (message: M) => InternalMessage,
): StateManager.Step<State, InternalMessage, Deps> => {
  let step: StateManager.Step<State, InternalMessage, Deps> = [
    mapState(state),
    (commands ?? []).map(Effect.map(mapMsg)),
  ] as const
  step = Arr.reduce(events ?? [], step, (step, event) => {
    if (event._tag === 'Route') {
      return makeRouteStep(event.action)(step)
    }
    if (event._tag === 'Toast') {
      return makeShowToastStep(event.show.text)(step)
    }
    return absurd(event)
  })
  return step
}

export const update: StateManager.Update<State, InternalMessage, Deps> = (message) => (state) => {
  const currentPage = Chunk.headNonEmpty(state.navigationStack)
  if (currentPage._tag === 'Home' && message._tag === 'GotHomeMsg') {
    const transition = Home.update(message.message)(state.page[currentPage._tag])
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
      return makeGoBackStep([state, []])
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
      navigationStack: Chunk.make(Route.Home({ route: 'default' })),
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
  if (currentPage._tag === 'Home') {
    subs = HashMap.setMany(
      subs,
      mapSubscriptions(
        Home.subscriptions(state.page[currentPage._tag]),
        (k) => T.make('Home', k),
        (message) => InternalMessage.GotHomeMsg({ message }),
      ),
    )
  }
  return subs
}

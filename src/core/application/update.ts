import * as Arr from 'effect/Array'
import * as Chunk from 'effect/Chunk'
import * as Effect from 'effect/Effect'
import { absurd } from 'effect/Function'
import * as Match from 'effect/Match'
import * as T from 'effect/Tuple'
import { closeApp, hideSplashScreen, showToast } from '@/core/application/commands.ts'
import { InternalMessage } from '@/core/application/messages.ts'
import type { Viewport } from '@/core/application/outbound/viewport.ts'
import { Route, type RouteEvent, type Transition } from '@/core/application/transition.ts'
import * as Home from '@/feature/home/application/update.ts'
import type * as StateManager from '@/shared/fsm.ts'
import type { State } from './model.ts'

type Deps = Viewport | Home.Deps

const makeShowToastStep = (text: string) =>
(
  [state, commands]: StateManager.Step<State, InternalMessage, Deps>,
): StateManager.Step<State, InternalMessage, Deps> => {
  return [state, [
    ...commands,
    showToast(text),
  ]] as const
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
    closeApp,
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
    Match.tag('HideSplashScreenRequested', () => (state) => {
      return T.make(state, [hideSplashScreen])
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
    },
    commands.map(Effect.map((message) => InternalMessage.GotHomeMsg({ message }))),
  )
})()

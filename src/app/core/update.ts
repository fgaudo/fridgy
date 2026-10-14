import * as Arr from 'effect/Array'
import * as Chunk from 'effect/Chunk'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as T from 'effect/Tuple'
import { hideSplashScreen } from '@/app/core/commands.ts'
import { InternalMessage } from '@/app/core/messages.ts'
import { Route } from '@/app/transition.ts'
import * as Home from '@/app/pages/home/update.ts'
import type * as StateManager from '@/libs/fsm.ts'
import type { State } from '../core/model.ts'

type Deps = Home.Deps | UiCommands

export const update: StateManager.Update<State, InternalMessage, Deps> = (message) => (state) => {
  const currentPage = Chunk.headNonEmpty(state.navigationStack)
  if (currentPage._tag === 'Home' && message._tag === 'GotHomeMsg') {
    const { state: newState, commands } = Home.update(message.message)(state.page[currentPage._tag])
    return T.make(
      { ...state, page: { ...state.page, Home: newState } },
      Arr.map(
        commands ?? [],
        Effect.map(
          (message) => InternalMessage.GotHomeMsg({ message }),
        ),
      ),
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

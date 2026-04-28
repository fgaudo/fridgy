import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as T from 'effect/Tuple'

import { InternalMessage } from '@/app/core/messages.ts'
import type { ViewportActivity } from '@/app/ports/inbound/viewport-activity.ts'
import type * as UC from '@/app/use-cases/index.ts'
import type * as StateManager from '@/shared/fsm.ts'
import { mapSubscriptions } from '../../shared/helpers.ts'
import * as Home from './home/logic.ts'
import type { State } from './model.ts'

const isHomeMessage = (
  message: InternalMessage,
): message is Extract<InternalMessage, Record<'_tag', `Home_${string}`>> => message._tag.startsWith('Home_')

export const update: StateManager.Update<State, InternalMessage, UC.All> = (message) => (state) => {
  if (state.currentPage === 'Home' && isHomeMessage(message)) {
    const [nextSubState, cmds] = Home.update(message)(state.page[state.currentPage])
    return T.make(
      {
        ...state,
        page: { ...state.page, Home: nextSubState },
      },
      cmds,
    )
  }
  return Match.value(message).pipe(
    Match.withReturnType<
      ReturnType<StateManager.Update<State, InternalMessage, UC.All>>
    >(),
    Match.tag('ShowToast', ({ text }) => (state) => {
      const nextVersion = state.toast.version + 1n
      return T.make(
        {
          ...state,
          toast: {
            ...state.toast,
            maybeText: Option.some(text),
            version: nextVersion,
          },
        },
        [
          Effect.succeed(
            T.make(InternalMessage.HideToast({ version: nextVersion })),
          ).pipe(Effect.delay('2 seconds')),
        ],
      )
    }),
    Match.tag('HideToast', ({ version }) => (state) => {
      if (state.toast.version !== version) {
        return T.make(state, [])
      }
      return T.make(
        {
          ...state,
          toast: {
            ...state.toast,
            maybeText: Option.none(),
          },
        },
        [],
      )
    }),
    Match.orElse(() => (state: State) => T.make(state, [])),
  )(state)
}

export const makeDefectMessages = (_err: unknown) => T.make(InternalMessage.Crash())

export const init: StateManager.Step<
  State,
  InternalMessage,
  UC.All | Home.UseCases
> = (() => {
  const [state, commands] = Home.init
  return T.make(
    {
      appIsReady: true,
      currentPage: 'Home',
      page: { AddProduct: {}, Home: state },
      toast: { maybeText: Option.none(), version: 0n },
    },
    commands,
  )
})()

export const subscriptions: StateManager.Emitter<
  State,
  InternalMessage,
  UC.All | ViewportActivity
> = (state: State) => {
  let subs: ReturnType<typeof subscriptions> = HashMap.empty()

  if (state.currentPage === 'Home') {
    subs = HashMap.setMany(
      subs,
      mapSubscriptions(Home.subscriptions(state.page[state.currentPage]), (k) => T.make('Home', k)),
    )
  }
  return subs
}

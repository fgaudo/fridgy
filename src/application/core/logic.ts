import type * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as T from 'effect/Tuple'
import { InternalMessage } from '@/app/core/messages.ts'
import type { ViewportCommands } from '@/app/ports/outbound/viewport-commands.ts'
import type { ViewportEvents } from '@/app/ports/outbound/viewport-events.ts'
import type * as UC from '@/app/use-cases/index.ts'
import type { ProductChanges } from '@/app/use-cases/products.ts'
import type * as StateManager from '@/shared/fsm.ts'
import { mapSubscriptions } from '../../shared/helpers.ts'
import * as Home from './home/logic.ts'
import type { State } from './model.ts'

const isHomeMessage = (
  message: InternalMessage,
): message is Extract<InternalMessage, Record<'_tag', `Home_${string}`>> => message._tag.startsWith('Home_')

export const update: StateManager.Update<State, InternalMessage, UC.All | ViewportCommands | DateTime.CurrentTimeZone> =
  (message) => (state) => {
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
              InternalMessage.HideToast({ version: nextVersion }),
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

export const makeDefectMessage = (_err: unknown) => InternalMessage.Crash({ error: _err })

export const init: StateManager.Step<
  State,
  InternalMessage,
  UC.All | Home.UseCases | ViewportCommands
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
  ViewportEvents | ProductChanges
> = (state: State) => {
  let subs: ReturnType<typeof subscriptions> = HashMap.empty()

  if (state.currentPage === 'Home') {
    subs = HashMap.setMany(
      subs,
      mapSubscriptions(
        Home.subscriptions(state.page[state.currentPage]),
        (k) => T.make('Home', k),
      ),
    )
  }
  return subs
}

import * as Chunk from 'effect/Chunk'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'
import { Events } from '@/core/application/inbound.ts'
import { InternalMessage } from '@/core/application/messages.ts'
import type { State } from '@/core/application/model.ts'
import * as Home from '@/feature/home/application/subs.ts'
import type * as StateManager from '@/libs/fsm.ts'
import { mapSubscriptions } from '@/libs/helpers.ts'

export const subscriptions: StateManager.Emitter<
  State,
  InternalMessage,
  Events | Home.Deps
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

  subs = HashMap.set(
    subs,
    'hide',
    Effect.service(Events).pipe(Stream.unwrap),
  )
  return subs
}

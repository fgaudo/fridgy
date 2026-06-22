import * as Effect from 'effect/Effect'
import * as Filter from 'effect/Filter'
import * as HashMap from 'effect/HashMap'
import * as Stream from 'effect/Stream'
import { Events } from '@/feature/home/application/inbound.ts'
import type * as StateManager from '@/shared/fsm.ts'
import type { Message } from './messages.ts'
import type { State } from './model.ts'

export type Deps = Events

export const subscriptions: StateManager.Emitter<
  State,
  Message,
  Deps
> = (state) => {
  const map: ReturnType<typeof subscriptions> = HashMap.make(
    [
      'events',
      Effect.service(Events).pipe(
        Stream.unwrap,
        Stream.filterMap(Filter.make(Filter.tagged('ProductsChanged'))),
        Stream.zipLatestWith(Stream.tick('30 seconds'), (a) => a),
      ),
    ],
    [
      'changed',
      Effect.service(Events).pipe(
        Stream.unwrap,
        Stream.filter((a) => a._tag !== 'ProductsChanged'),
      ),
    ],
  )

  return map
}

import * as HashMap from 'effect/HashMap'
import * as Stream from 'effect/Stream'

import type * as StateManager from '@/libs/fsm.ts'

export const mapSubscriptions = <State, Message, NewMessage, Key, NewKey, R>(
  subscriptions: ReturnType<StateManager.Emitter<State, Message, R, Key>>,
  mapKey: (key: Key) => NewKey,
  mapMessage: (message: Message) => NewMessage,
): ReturnType<StateManager.Emitter<State, NewMessage, R, NewKey>> =>
  subscriptions.pipe(
    HashMap.reduce(
      HashMap.empty<
        NewKey,
        Stream.Stream<NewMessage, never, R>
      >(),
      (hashMap, stream, key) => HashMap.set(hashMap, mapKey(key), stream.pipe(Stream.map(mapMessage))),
    ),
  )

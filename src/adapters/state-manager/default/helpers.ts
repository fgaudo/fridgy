import type * as Array from 'effect/Array'
import * as HashMap from 'effect/HashMap'
import type * as Stream from 'effect/Stream'

import type * as StateManager from '@/core/fsm'

export const mapSubscriptions = <State, Message, Key, NewKey, R>(
	subscriptions: ReturnType<StateManager.Emitter<State, Message, R, Key>>,
	mapKey: (key: Key) => NewKey,
): ReturnType<StateManager.Emitter<State, Message, R, NewKey>> =>
	subscriptions.pipe(
		HashMap.reduce(
			HashMap.empty<
				NewKey,
				Stream.Stream<Array.NonEmptyReadonlyArray<Message>, never, R>
			>(),
			(hashMap, stream, key) => HashMap.set(hashMap, mapKey(key), stream),
		),
	)

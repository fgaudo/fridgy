import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'

import * as StateManager from '@/core/state-manager.ts'

export const mapSubscriptions = <State, Message, NewMessage, Key, NewKey, R>({
	subscriptions,
	mapKey,
	mapMessage,
}: {
	subscriptions: ReturnType<StateManager.Subscriptions<State, Message, R, Key>>
	mapKey: (key: Key) => NewKey
	mapMessage: (message: Message) => NewMessage
}): ReturnType<StateManager.Subscriptions<State, NewMessage, R, NewKey>> =>
	subscriptions.pipe(
		HashMap.reduce(
			HashMap.empty<NewKey, Stream.Stream<NewMessage, never, R>>(),
			(hashMap, stream, key) =>
				HashMap.set(hashMap, mapKey(key), Stream.map(stream, mapMessage)),
		),
	)

export const mapTransition = <State, NewState, Message, NewMessage, R>({
	update,
	mapState,
	mapMessage,
}: {
	update: ReturnType<ReturnType<StateManager.Update<State, Message, R>>>
	mapState: (key: State) => NewState
	mapMessage: (message: Message) => NewMessage
}): StateManager.Transition<NewState, NewMessage, R> =>
	T.make(mapState(update[0]), Arr.map(update[1], Effect.map(mapMessage)))

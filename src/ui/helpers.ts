import { clsx } from 'clsx'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import type * as Function from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'
import { twMerge } from 'tailwind-merge'

import type * as StateManager from '@/core/state-manager.ts'

import type { State } from './state.ts'

export const cn = (...p: Parameters<typeof clsx>) => ({
	[twMerge(clsx(p))]: true,
})

export const when = <A>(condition: boolean, a: A) => (condition ? a : undefined)
export const whenLazy = <A>(condition: boolean, a: Function.LazyArg<A>) =>
	condition ? a() : undefined

export const mapSubscriptions = <State, Message, Key, NewKey, R>(
	subscriptions: ReturnType<StateManager.Subscriptions<State, Message, R, Key>>,
	mapKey: (key: Key) => NewKey,
): ReturnType<StateManager.Subscriptions<State, Message, R, NewKey>> =>
	subscriptions.pipe(
		HashMap.reduce(
			HashMap.empty<NewKey, Stream.Stream<ReadonlyArray<Message>, never, R>>(),
			(hashMap, stream, key) => HashMap.set(hashMap, mapKey(key), stream),
		),
	)

export const mapTransition = <State, NewState, Message, NewMessage, R>(
	transition: StateManager.Transition<State, Message, R>,
	{
		mapState,
		mapMessage,
	}: {
		mapState: (key: { state: State }) => NewState
		mapMessage: (message: { message: Message }) => NewMessage
	},
): StateManager.Transition<NewState, NewMessage, R> =>
	T.make(
		mapState({ state: transition[0] }),
		Arr.map(
			transition[1],
			Effect.map(message => mapMessage({ message })),
		),
	)

export const mapMessage =
	<Message, NewMessage>(
		dispatcher: (m: Message) => void,
		mapMessage: (m: { message: NewMessage }) => Message,
	) =>
	(message: NewMessage) => {
		dispatcher(mapMessage({ message: message }))
	}

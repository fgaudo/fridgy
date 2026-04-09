import { clsx } from 'clsx'
import type * as Array from 'effect/Array'
import type * as Function from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import type * as Stream from 'effect/Stream'
import * as T from 'effect/Tuple'
import { twMerge } from 'tailwind-merge'

import type * as StateManager from '@/core/state-manager.ts'

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
			HashMap.empty<
				NewKey,
				Stream.Stream<Array.NonEmptyReadonlyArray<Message>, never, R>
			>(),
			(hashMap, stream, key) => HashMap.set(hashMap, mapKey(key), stream),
		),
	)

export const mapTransition = <State, NewState, Message, R>(
	transition: StateManager.Transition<State, Message, R>,
	{
		mapState,
	}: {
		mapState: (key: { state: State }) => NewState
	},
): StateManager.Transition<NewState, Message, R> =>
	T.make(mapState({ state: transition[0] }), transition[1])

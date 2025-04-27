import type { ReadonlyDeep } from 'type-fest'

import { Eff } from './imports.ts'

type Actions<S> = {
	[s: string]: (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		arg: any,
	) => (context: S) => void
}

export function createStore<
	S,
	A extends Actions<S>,
>(context: S, actions: A): Store<S, A> {
	return {
		context: context as ReadonlyDeep<S>,
		dispatch: action =>
			Eff.sync(() =>
				actions[action.type](
					'params' in action
						? action.params
						: undefined,
				)(context),
			),
	}
}

export type Store<S, A extends Actions<S>> = {
	context: ReadonlyDeep<S>
	dispatch: (
		action: {
			[K in keyof A]: Parameters<A[K]> extends []
				? { type: K }
				: {
						type: K
						param: Parameters<A[K]>[0]
					}
		}[keyof A],
	) => Eff.Effect<void>
}

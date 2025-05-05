import { Eff, pipe } from './imports.ts'

type Actions = {
	[s: string]: (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		arg: any,
	) => void
}

export function createStore<S, A extends Actions>(
	getSnapshot: Eff.Effect<S>,
	actions: A,
): Store<S, A> {
	return {
		getSnapshot,
		dispatch: action =>
			pipe(
				Eff.sync(() =>
					actions[action.type](
						'param' in action
							? action.param
							: undefined,
					),
				),
				Eff.andThen(getSnapshot),
			),
	}
}

export type Store<S, A extends Actions> = {
	getSnapshot: Eff.Effect<S>
	dispatch: (
		action: {
			[K in keyof A]: Parameters<A[K]> extends []
				? { type: K }
				: {
						type: K
						param: Parameters<A[K]>[0]
					}
		}[keyof A],
	) => Eff.Effect<S>
}

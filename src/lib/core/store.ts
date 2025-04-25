import type { ReadonlyDeep } from 'type-fest';

import { Eff } from './imports.ts';

type Actions<S, D> = {
	[s: string]: (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		arg: any,
	) => (store: { state: S; derived: D }) => void;
};

export function createStore<
	S,
	D,
	A extends Actions<S, D>,
>(
	state: S,
	derived: D,
	actions: A,
): Store<S, D, A> {
	return {
		state: state as ReadonlyDeep<S>,
		derived: derived as ReadonlyDeep<D>,
		dispatch: action =>
			Eff.sync(() =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(actions[action.type] as any)(
					'params' in action
						? action.params
						: undefined,
				)(state),
			),
	};
}

export type Store<
	S,
	D,
	A extends Actions<S, D>,
> = {
	state: ReadonlyDeep<S>;
	derived: ReadonlyDeep<D>;
	dispatch: (
		action: {
			[K in keyof A]: Parameters<A[K]> extends []
				? { type: K }
				: {
						type: K;
						param: Parameters<A[K]>[0];
					};
		}[keyof A],
	) => Eff.Effect<void>;
};

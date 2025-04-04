import {
	type Accessor,
	onCleanup,
} from 'solid-js';
import * as SS from 'solid-js/store';

import {
	Eff,
	F,
	H,
	HS,
	Q,
	pipe,
} from '$lib/core/imports.ts';

export function withDefault<T>(
	accessor: Accessor<T | undefined>,
	init: T,
): Accessor<T> {
	return () => accessor() ?? init;
}

export type Mutation<STATE> = (
	state: STATE,
) => STATE;

export interface Task<STATE, MSG> {
	onStart?: (
		id: F.Fiber<unknown>,
	) => (state: STATE) => MSG;
	effect: (state: STATE) => Eff.Effect<MSG>;
}

export type Reducer<STATE, MSG> = (
	msg: MSG,
) => readonly [
	mutations: Mutation<STATE>,
	commands: HS.HashSet<Task<STATE, MSG>>,
];

export const useQueueStore = <
	STATE extends object,
	MSG,
>(
	init: STATE,
	reducer: Reducer<STATE, MSG>,
) => {
	const [state, setState] =
		SS.createStore<STATE>(init);

	const messages = Eff.runSync(
		Q.unbounded<MSG>(),
	);

	const fiber = H.runForkWithLogs(
		Eff.scoped(
			Eff.gen(function* () {
				for (;;) {
					const msg = yield* Q.take(messages);

					const snapshot = SS.unwrap(state);

					const [mutation, commands] =
						reducer(msg);

					setState(state => mutation(state));
					yield* pipe(
						commands,
						HS.map(({ effect, onStart }) =>
							Eff.gen(function* () {
								const fiber = yield* pipe(
									effect(snapshot),

									Eff.flatMap(msg =>
										Q.offer(messages, msg),
									),
									Eff.forkScoped,
								);

								if (onStart) {
									yield* Q.offer(
										messages,
										onStart(fiber)(snapshot),
									);
								}
							}),
						),
						Eff.all,
					);
				}
			}),
		),
	);

	onCleanup(() => {
		H.runForkWithLogs(
			F.interrupt(fiber).pipe(
				Eff.andThen(Q.shutdown(messages)),
			),
		);
	});

	return [
		state,
		(command: MSG) => {
			H.runForkWithLogs(
				Q.offer(messages, command),
			);
		},
	] as const;
};

export const useFiber = (
	effect: Eff.Effect<unknown>,
) => {
	const fiber = H.runForkWithLogs(effect);

	onCleanup(() => {
		H.runForkWithLogs(F.interrupt(fiber));
	});
};

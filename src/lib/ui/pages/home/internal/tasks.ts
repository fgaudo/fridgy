import { Eff, pipe } from '$lib/core/imports.ts';

import type { UseCases } from '$lib/business/app/use-cases.ts';
import { GetSortedProducts } from '$lib/business/index.ts';
import {
	createCapacitorListener,
	createEffect,
	createRestartableEffect,
} from '$lib/ui/utils.ts';

import type * as _Actions from './actions.ts';
import type { InternalReadonlyStore } from './store.svelte.ts';

export type Actions = {
	[K in keyof typeof _Actions]: ReturnType<
		(typeof _Actions)[K]
	>;
};

type TaskRequirements = {
	store: InternalReadonlyStore;
	actions: Actions;
	useCases: UseCases;
};

export function refreshList({
	store,
	actions,
	useCases,
}: TaskRequirements) {
	return pipe(
		Eff.gen(function* () {
			if (store.state.isLoading) {
				return;
			}

			yield* Eff.sync(actions.fetchListStarted);

			const getProducts =
				yield* GetSortedProducts.Service;

			const result =
				yield* Eff.either(getProducts);

			yield* Eff.sync(() =>
				actions.fetchListFinished(result),
			);
		}),

		Eff.onInterrupt(() =>
			Eff.sync(actions.fetchListCancelled),
		),
		Eff.provide(useCases),
		createRestartableEffect,
	);
}

export function startRefreshTimeInterval({
	actions,
}: TaskRequirements) {
	return pipe(
		Eff.sync(actions.refreshTime),
		Eff.andThen(Eff.sleep(20000)),
		Eff.forever,
		createRestartableEffect,
	);
}

export function startRefreshTimeResumeListener({
	actions,
}: TaskRequirements) {
	return createCapacitorListener({
		event: 'resume',
		cb: actions.refreshTime,
	});
}

export function toggleMenu({
	actions,
}: TaskRequirements) {
	return pipe(
		Eff.sync(actions.toggleMenu),
		createEffect,
	);
}

export function disableSelectMode({
	actions,
}: TaskRequirements) {
	return pipe(
		Eff.sync(actions.disableSelectMode),
		createEffect,
	);
}

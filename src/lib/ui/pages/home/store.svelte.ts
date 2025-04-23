import type { Cancel } from 'effect/Runtime';

import { Eff, pipe } from '$lib/core/imports.ts';

import { useCases } from '$lib/business/index.ts';
import {
	createCapacitorListener,
	toCallback,
	toDetachedCallback,
	toRestartableCallback,
} from '$lib/ui/utils.ts';

import { Config } from './config.ts';
import { actions as internalActions } from './internal/actions.ts';
import {
	type InternalReadonlyState,
	createState,
} from './internal/state.svelte.ts';
import {
	type Store,
	StoreService,
} from './internal/store.ts';
import * as internalTasks from './internal/tasks.ts';

export function createStore() {
	const state = createState();

	const store = {
		state: state.state,
		derived: state.derived,
		actions: {
			disableSelectMode:
				internalActions.disableSelectMode(state),
			fetchListCancelled:
				internalActions.fetchListCancelled(state),
			fetchListFinished:
				internalActions.fetchListFinished(state),
			fetchListStarted:
				internalActions.fetchListStarted(state),
			refreshTime:
				internalActions.refreshTime(state),
			toggleMenu:
				internalActions.toggleMenu(state),
			toggleItemByHold:
				internalActions.toggleItemByHold(state),
			toggleItemByTap:
				internalActions.toggleItemByTap(state),
			enableRefreshTimeListeners:
				internalActions.enableRefreshTimeListeners(
					state,
				),
			disableRefreshTimeListeners:
				internalActions.disableRefreshTimeListeners(
					state,
				),
		},
	} satisfies Store;

	registerRefreshTimeListeners(store);
	return {
		state:
			state.state as InternalReadonlyState['state'],
		derived:
			state.derived as InternalReadonlyState['derived'],
		tasks: {
			disableSelectMode:
				store.actions.disableSelectMode,

			refreshList: pipe(
				internalTasks.refreshList,
				Eff.provideService(StoreService, store),
				Eff.provide(useCases),
				toRestartableCallback,
			) as () => void,

			toggleMenu: store.actions.toggleMenu,

			registerRefreshTimeListeners:
				store.actions.enableRefreshTimeListeners,

			unregisterRefreshTimeListeners:
				store.actions.disableRefreshTimeListeners,
		},
	};
}

function registerRefreshTimeListeners(
	store: Store,
) {
	let cancelRefreshTimeResumeListener:
		| Cancel<unknown, unknown>
		| undefined;

	let cancelRefreshTimeInterval:
		| Cancel<unknown, unknown>
		| undefined;

	const startRefreshTimeResumeListener =
		createCapacitorListener({
			event: 'resume',
			cb: pipe(
				internalTasks.refreshTime,
				Eff.provideService(StoreService, store),
				toDetachedCallback,
			),
		});

	const startRefreshTimeInterval = pipe(
		internalTasks.refreshTimeInterval,
		Eff.provideService(StoreService, store),
		Eff.provide(Config.Default),
		toCallback,
	);

	$effect(() => {
		cancelRefreshTimeResumeListener?.();
		cancelRefreshTimeInterval?.();

		if (
			store.derived.refreshTimeListenersEnabled
		) {
			cancelRefreshTimeResumeListener =
				startRefreshTimeResumeListener();

			cancelRefreshTimeInterval =
				startRefreshTimeInterval();
		}
	});
}

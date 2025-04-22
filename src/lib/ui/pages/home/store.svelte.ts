import type { Cancel } from 'effect/Runtime';

import { Eff } from '$lib/core/imports.ts';

import { useCases } from '$lib/business/index.ts';
import {
	createCapacitorListener,
	toCallback,
	toDetachedCallback,
	toRestartableCallback,
} from '$lib/ui/utils.ts';

import type { InternalReadonlyState } from './internal/state.svelte.ts';
import { createStore as createInternalStore } from './internal/store.ts';

export function createStore() {
	const store = createInternalStore();

	let refreshTimeListenersEnabled = $state(false);

	let cancelRefreshTimeResumeListener:
		| Cancel<unknown, unknown>
		| undefined;

	let cancelRefreshTimeInterval:
		| Cancel<unknown, unknown>
		| undefined;

	const refreshTimeListenersRequired = $derived(
		store.derived.hasProducts &&
			refreshTimeListenersEnabled,
	);

	const startRefreshTimeResumeListener =
		createCapacitorListener({
			event: 'resume',
			cb: toDetachedCallback(
				store.tasks.refreshTime,
			),
		});

	const startRefreshTimeInterval = toCallback(
		store.tasks.refreshTimeInterval,
	);

	$effect(() => {
		if (refreshTimeListenersRequired) {
			cancelRefreshTimeResumeListener =
				startRefreshTimeResumeListener();

			cancelRefreshTimeInterval =
				startRefreshTimeInterval();
		} else {
			cancelRefreshTimeResumeListener?.();
			cancelRefreshTimeInterval?.();
		}
	});

	return {
		state:
			store.state as InternalReadonlyState['state'],
		derived:
			store.derived as InternalReadonlyState['derived'],
		tasks: {
			disableSelectMode: toCallback(
				store.tasks.disableSelectMode,
			),
			toggleMenu: toCallback(
				store.tasks.toggleMenu,
			),
			refreshList: toRestartableCallback(
				Eff.provide(
					store.tasks.refreshList,
					useCases,
				),
			),
			enableRefreshTimeListeners: () => {
				refreshTimeListenersEnabled = true;
			},
			disableRefreshTimeListeners: () => {
				refreshTimeListenersEnabled = false;
			},
		},
	};
}

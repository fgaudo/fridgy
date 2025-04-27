import type { Cancel } from 'effect/Runtime'

import { Eff, pipe } from '$lib/core/imports.ts'

import { useCases } from '$lib/business/index.ts'
import {
	createCapacitorListener,
	toCallback,
	toDetachedCallback,
	toRestartableCallback,
} from '$lib/ui/utils.ts'

import { Config } from './internal/config.ts'
import { createStateContext } from './internal/state.svelte.ts'
import {
	type Store,
	StoreService,
	createStore,
} from './internal/store.ts'
import * as internalTasks from './internal/tasks.ts'

export function createViewModel() {
	const store = createStore(createStateContext())

	registerRefreshTimeListeners(store)
	return {
		state: store.context.state,
		derived: store.context.derived,
		tasks: {
			disableSelectMode: pipe(
				store.dispatch({
					type: 'disableSelectMode',
				}),
				toCallback,
			) as () => void,

			fetchList: pipe(
				internalTasks.refreshList,
				Eff.provideService(StoreService, store),
				Eff.provide(useCases),
				toRestartableCallback,
			) as () => void,

			toggleMenu: pipe(
				store.dispatch({ type: 'toggleMenu' }),
				toCallback,
			) as () => void,

			registerRefreshTimeListeners: pipe(
				store.dispatch({
					type: 'enableRefreshTimeListeners',
				}),
				toCallback,
			) as () => void,

			unregisterRefreshTimeListeners: pipe(
				store.dispatch({
					type: 'disableRefreshTimeListeners',
				}),
				toCallback,
			) as () => void,
		},
	}
}

function registerRefreshTimeListeners(
	store: Store,
) {
	let cancelRefreshTimeResumeListener:
		| Cancel<unknown, unknown>
		| undefined

	let cancelRefreshTimeInterval:
		| Cancel<unknown, unknown>
		| undefined

	const startRefreshTimeResumeListener =
		createCapacitorListener({
			event: 'resume',
			cb: pipe(
				internalTasks.refreshTime,
				Eff.provideService(StoreService, store),
				toDetachedCallback,
			),
		})

	const startRefreshTimeInterval = pipe(
		internalTasks.refreshTimeInterval,
		Eff.provideService(StoreService, store),
		Eff.provide(Config.Default),
		toCallback,
	)

	$effect(() => {
		cancelRefreshTimeResumeListener?.()
		cancelRefreshTimeInterval?.()

		if (
			store.context.derived
				.refreshTimeListenersEnabled
		) {
			cancelRefreshTimeResumeListener =
				startRefreshTimeResumeListener()

			cancelRefreshTimeInterval =
				startRefreshTimeInterval()
		}
	})
}

import type { Cancel } from 'effect/Runtime'

import { Eff, pipe } from '$lib/core/imports.ts'

import { useCases } from '$lib/business/index.ts'
import {
	createCapacitorListener,
	toCallback,
	toDetachedCallback,
	toRestartableCallback,
} from '$lib/ui/utils.ts'

import type { ProductViewModel } from './internal/state.svelte.ts'
import {
	Service,
	type Store,
	createStore,
} from './internal/store.ts'
import * as Tasks from './internal/tasks.ts'

export function createViewModel() {
	const store = createStore()

	registerRefreshTimeListeners(store)
	return {
		state: {
			get receivedError() {
				return store.context.state.receivedError
			},
			get selected() {
				return store.context.state.selected
			},
			get isSelectModeEnabled() {
				return store.context.derived
					.isSelectModeEnabled
			},
			get total() {
				return store.context.state.total
			},
			get isMenuOpen() {
				return store.context.state.isMenuOpen
			},
			get products() {
				return store.context.state.products
			},
			get currentTimestamp() {
				return store.context.state
					.currentTimestamp
			},
		},
		tasks: {
			disableSelectMode: pipe(
				store.dispatch({
					type: 'disableSelectMode',
				}),
				toCallback,
			) as () => void,

			fetchList: pipe(
				Tasks.refreshList,
				Eff.provideService(Service, store),
				Eff.provide(useCases),
				toRestartableCallback,
			) as () => void,

			toggleMenu: pipe(
				Eff.gen(function* () {
					yield* store.dispatch({
						type: 'toggleMenu',
					})
				}),
				toCallback,
			) as () => void,

			toggleItem: (product: ProductViewModel) =>
				toCallback(
					pipe(
						store.dispatch({
							type: 'toggleItem',
							param: product,
						}),
					),
				) as unknown as () => void,

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

			deleteSelected: pipe(
				Tasks.deleteSelectedAndRefresh,
				Eff.provideService(Service, store),
				Eff.provide(useCases),
				toCallback,
			),
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
				Tasks.refreshTime,
				Eff.provideService(Service, store),
				toDetachedCallback,
			),
		})

	const startRefreshTimeInterval = pipe(
		Tasks.refreshTimeInterval,
		Eff.provideService(Service, store),
		Eff.provide(Tasks.Config.Default),
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

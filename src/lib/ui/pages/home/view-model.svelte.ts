import type { Cancel } from 'effect/Runtime'
import type { SvelteSet } from 'svelte/reactivity'

import {
	Eff,
	Int,
	NNInt,
	pipe,
} from '$lib/core/imports.ts'

import { useCases } from '$lib/business/index.ts'
import {
	createCapacitorListener,
	toCallback,
	toDetachedCallback,
	toRestartableCallback,
} from '$lib/ui/utils.ts'

import type {
	ProductViewModel,
	UncorruptProductViewModel,
} from './internal/state.svelte.ts'
import {
	Service,
	type Store,
	createStore,
} from './internal/store.ts'
import * as Tasks from './internal/tasks.ts'

type GenericState = {
	receivedError: boolean
	isSelectModeEnabled: boolean
	isMenuOpen: boolean
	currentTimestamp: Int.Integer
}

type State = GenericState &
	(
		| {
				hasProducts: true
				products: {
					entries: ProductViewModel[]
					selected: SvelteSet<string>
				}
		  }
		| { hasProducts: false }
	)

export function createViewModel() {
	const store = createStore()

	const state: State = {
		get receivedError() {
			return store.context.state.receivedError
		},
		get isSelectModeEnabled() {
			return store.context.derived
				.isSelectModeEnabled
		},
		get isMenuOpen() {
			return store.context.state.isMenuOpen
		},
		get currentTimestamp() {
			return store.context.derived
				.currentTimestamp
		},
		get hasProducts() {
			return store.context.derived
				.hasLoadedProducts
		},
	}

	registerRefreshTimeListeners(store)
	return {
		state,
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

			toggleItem: (
				product: UncorruptProductViewModel,
			) =>
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

import type { Cancel } from 'effect/Runtime'
import type { SvelteSet } from 'svelte/reactivity'
import { derived } from 'svelte/store'

import {
	Eff,
	Int,
	L,
	NNInt,
	pipe,
} from '$lib/core/imports.ts'

import { useCases } from '$lib/business/index.ts'
import {
	createCapacitorListener,
	toCallback,
	toDetachedCallback,
	toRestartableCallback,
} from '$lib/ui/adapters.ts'

import * as Tasks from './actions.ts'
import {
	type ProductViewModel,
	type StateContext,
	createStateContext,
} from './state.svelte.ts'
import {
	Service,
	type Store,
	createStoreService,
} from './store.svelte.ts'

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
	const context = createStateContext()

	const storeService = createStoreService(
		context.state,
	)

	{
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
					Eff.provide(storeService),
					toDetachedCallback,
				),
			})

		const startRefreshTimeInterval = pipe(
			Tasks.refreshTimeInterval,
			Eff.provide(storeService),
			Eff.provide(Tasks.Config.Default),
			toCallback,
		)

		$effect(() => {
			cancelRefreshTimeResumeListener?.()
			cancelRefreshTimeInterval?.()

			if (
				context.derived
					.refreshTimeListenersEnabled
			) {
				cancelRefreshTimeResumeListener =
					startRefreshTimeResumeListener()

				cancelRefreshTimeInterval =
					startRefreshTimeInterval()
			}
		})
	}

	return {
		state: context.state,
		derived: context.derived,
		actions: {
			disableSelectMode: pipe(
				Eff.gen(function* () {
					const store = yield* Service
					yield* store.dispatch({
						type: 'disableSelectMode',
					})
				}),
				Eff.provide(storeService),
				toCallback,
			) as () => void,

			fetchList: pipe(
				Tasks.refreshList,
				Eff.provide(storeService),
				Eff.provide(useCases),
				toRestartableCallback,
			) as () => void,

			toggleMenu: pipe(
				Eff.gen(function* () {
					const store = yield* Service
					yield* store.dispatch({
						type: 'toggleMenu',
					})
				}),
				Eff.provide(storeService),
				toCallback,
			) as () => void,

			toggleItem: (
				product: UncorruptProductViewModel,
			) =>
				pipe(
					Eff.gen(function* () {
						const store = yield* Service
						yield* store.dispatch({
							type: 'toggleItem',
							param: product,
						})
					}),
					Eff.provide(storeService),
					toCallback,
				) as unknown as () => void,

			registerRefreshTimeListeners: pipe(
				Eff.gen(function* () {
					const store = yield* Service
					yield* store.dispatch({
						type: 'enableRefreshTimeListeners',
					})
				}),
				Eff.provide(storeService),
				toCallback,
			) as () => void,

			unregisterRefreshTimeListeners: pipe(
				Eff.gen(function* () {
					const store = yield* Service
					yield* store.dispatch({
						type: 'disableRefreshTimeListeners',
					})
				}),
				Eff.provide(storeService),
				toCallback,
			) as () => void,

			deleteSelected: pipe(
				Tasks.deleteSelectedAndRefresh,
				Eff.provide(storeService),
				Eff.provide(useCases),
				toCallback,
			),
		},
	}
}

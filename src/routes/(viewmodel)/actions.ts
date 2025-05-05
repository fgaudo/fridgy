import {
	Cl,
	E,
	Eff,
	HS,
	NEHS,
	O,
	pipe,
} from '$lib/core/imports.ts'

import {
	DeleteProductsByIds,
	GetSortedProducts,
} from '$lib/business/index.ts'

import * as Store from './store.svelte.ts'

export class Config extends Eff.Service<Config>()(
	'ui/Home/Config',
	{
		accessors: true,
		succeed: {
			refreshIntervalMs: 20000,
		},
	},
) {}

export const refreshList = Eff.gen(function* () {
	const store = yield* Store.Service

	let state = yield* store.getSnapshot

	if (state.isLoading) {
		return
	}

	state = yield* store.dispatch({
		type: 'fetchListStarted',
	})

	state = yield* store.getSnapshot

	const getProducts =
		yield* GetSortedProducts.GetSortedProducts

	const result = yield* Eff.either(getProducts)

	if (E.isLeft(result)) {
		yield* store.dispatch({
			type: 'fetchListFailed',
		})
		return
	}

	yield* store.dispatch({
		type: 'fetchListSucceeded',
		param: result.right,
	})
})

export const refreshTimeInterval = Eff.gen(
	function* () {
		const intervalMs =
			yield* Config.refreshIntervalMs
		const store = yield* Store.Service

		while (true) {
			const time = yield* Cl.currentTimeMillis
			yield* store.dispatch({
				type: 'refreshTime',
				param: time,
			})
			yield* Eff.sleep(intervalMs)
		}
	},
)

export const refreshTime = Eff.gen(function* () {
	const time = yield* Cl.currentTimeMillis
	const store = yield* Store.Service
	yield* store.dispatch({
		type: 'refreshTime',
		param: time,
	})
})

export const deleteSelectedAndRefresh = Eff.gen(
	function* () {
		const store = yield* Store.Service

		const deleteProducts =
			yield* DeleteProductsByIds.DeleteProductsByIds

		let state = yield* store.getSnapshot

		const maybeIds = pipe(
			HS.fromIterable(
				state.productsState.selected,
			),
			NEHS.fromHashSet,
		)

		if (O.isNone(maybeIds)) {
			return
		}

		state = yield* store.dispatch({
			type: 'deleteSelectedAndRefreshStarted',
		})

		const deleteResult = yield* pipe(
			deleteProducts(maybeIds.value),
			Eff.either,
		)

		if (E.isLeft(deleteResult)) {
			return yield* store.dispatch({
				type: 'deleteSelectedFailed',
			})
		}

		const refreshList =
			yield* GetSortedProducts.GetSortedProducts

		const refreshResult = yield* pipe(
			refreshList,
			Eff.either,
		)

		if (E.isLeft(refreshResult)) {
			return yield* store.dispatch({
				type: 'deleteSelectedSuccededAndRefreshFailed',
			})
		}

		yield* store.dispatch({
			type: 'deleteSelectedAndRefreshSucceeded',
			param: refreshResult.right,
		})
	},
)

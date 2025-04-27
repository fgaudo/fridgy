import {
	E,
	Eff,
	Int,
	NETS,
	O,
	pipe,
} from '$lib/core/imports.ts'
import { asOption } from '$lib/core/utils.ts'

import { AddProduct } from '$lib/business/index.ts'
import { MINIMUM_LAG_MS } from '$lib/ui/constants.ts'

import { StoreService } from './store.ts'

export const addProduct = pipe(
	Eff.gen(function* () {
		const store = yield* StoreService

		if (store.context.state.isAdding) {
			return
		}

		const name = yield* pipe(
			asOption(store.context.state.name),
			O.flatMap(NETS.fromString),
		)

		const maybeExpirationDate = pipe(
			asOption(
				store.context.state.expirationDate,
			),
			O.flatMap(Int.fromNumber),
		)

		yield* store.dispatch({
			type: 'addingStarted',
		})

		const addProduct = yield* AddProduct.Service
		const [result] = yield* Eff.all([
			Eff.either(
				addProduct({
					name: name,
					maybeExpirationDate,
				}),
			),
			Eff.sleep(MINIMUM_LAG_MS),
		])

		if (E.isLeft(result)) {
			return yield* store.dispatch({
				type: 'addingFailed',
			})
		}

		yield* store.dispatch({
			type: 'addingSucceeded',
		})
	}),

	Eff.onInterrupt(() =>
		Eff.gen(function* () {
			const store = yield* StoreService
			yield* store.dispatch({
				type: 'addingCancelled',
			})
		}),
	),
)

export const queueResetToast = Eff.gen(
	function* () {
		const store = yield* StoreService
		yield* Eff.sleep(3000)
		yield* store.dispatch({
			type: 'cancelToast',
		})
	},
)

export const initNameIfNotSet = Eff.gen(
	function* () {
		const store = yield* StoreService
		yield* store.dispatch({
			type: 'initNameIfNotSet',
		})
	},
)

export const setName = (name: string) =>
	Eff.gen(function* () {
		const store = yield* StoreService
		yield* store.dispatch({
			type: 'setName',
			param: name,
		})
	})

export const setExpirationDate = (
	value: string,
) =>
	Eff.gen(function* () {
		const store = yield* StoreService
		yield* store.dispatch({
			type: 'setExpirationDate',
			param: value,
		})
	})

import { LogLevel } from 'effect'

import {
	E,
	Eff,
	pipe,
} from '$lib/core/imports.ts'

import { UiLogWithLevel } from '$lib/business/app/queries.ts'
import { AddProduct } from '$lib/business/index.ts'
import { MINIMUM_LAG_MS } from '$lib/ui/constants.ts'

import * as Store from './store.ts'

export const addProduct = Eff.withLogSpan(
	pipe(
		Eff.gen(function* () {
			const store = yield* Store.Service
			const log =
				yield* UiLogWithLevel.UiLogWithLevel

			if (store.context.state.isAdding) {
				return
			}

			const name =
				yield* store.context.derived.maybeName

			yield* store.dispatch({
				type: 'addingStarted',
			})

			yield* log(LogLevel.Info, 'Adding started')

			const addProduct =
				yield* AddProduct.AddProduct

			const [result] = yield* Eff.all([
				Eff.either(
					addProduct({
						name: name,
						maybeExpirationDate:
							store.context.derived
								.maybeExpirationDate,
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
				const store = yield* Store.Service
				yield* store.dispatch({
					type: 'addingCancelled',
				})
			}),
		),
	),
	'add-product',
)

export const queueResetToast = Eff.gen(
	function* () {
		const store = yield* Store.Service
		yield* Eff.sleep(3000)
		yield* store.dispatch({
			type: 'cancelToast',
		})
	},
)

export const setNameInteracted = Eff.gen(
	function* () {
		const store = yield* Store.Service
		yield* store.dispatch({
			type: 'setNameInteracted',
		})
	},
)

export const setName = (name: string) =>
	Eff.gen(function* () {
		const store = yield* Store.Service
		yield* store.dispatch({
			type: 'setName',
			param: name,
		})
	})

export const setExpirationDate = (
	value: string,
) =>
	Eff.gen(function* () {
		const store = yield* Store.Service
		yield* store.dispatch({
			type: 'setExpirationDate',
			param: value,
		})
	})

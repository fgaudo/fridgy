import { LogLevel } from 'effect'

import {
	E,
	Eff,
	Int,
	NETS,
	O,
	pipe,
} from '$lib/core/imports.ts'

import {
	AddProduct,
	LogWithLevel,
} from '$lib/business/index.ts'
import { MINIMUM_LAG_MS } from '$lib/ui/constants.ts'

import * as Store from './store.svelte.ts'

export const addProduct = pipe(
	Eff.gen(function* () {
		const store = yield* Store.Service
		const logResolver =
			yield* LogWithLevel.Resolver

		let state = yield* store.getSnapshot

		if (state.isAdding) {
			return
		}

		const maybeName = pipe(
			O.fromNullable(state.name),
			O.flatMap(NETS.fromString),
		)

		if (O.isNone(maybeName)) {
			return
		}

		state = yield* store.dispatch({
			type: 'addingStarted',
		})

		yield* Eff.request(
			LogWithLevel.Request({
				level: LogLevel.Info,
				message: ['Adding started'],
			}),
			logResolver,
		)

		const addProduct =
			yield* AddProduct.AddProduct

		const [result] = yield* Eff.all([
			Eff.either(
				addProduct({
					name: maybeName.value,
					maybeExpirationDate: pipe(
						O.fromNullable(state.expirationDate),
						O.flatMap(Int.fromNumber),
					),
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
)

export const queueCancelToast = Eff.gen(
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

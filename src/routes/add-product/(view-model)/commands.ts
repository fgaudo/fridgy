import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import * as Option from 'effect/Option'

import { MINIMUM_LAG_MS } from '$lib/constants.ts'

import type { UseCases } from '../../../business/app/use-cases.ts'
import { AddProduct } from '../../../business/index.ts'
import * as Integer from '../../../core/integer/index.ts'
import * as NonEmptyTrimmedString from '../../../core/non-empty-trimmed-string.ts'
import type { Command } from '../../../core/state-manager.ts'
import { InternalMessage } from './update.ts'

export type AddProductCommand = Command<InternalMessage, UseCases>

export const addProduct: (dto: {
	name: NonEmptyTrimmedString.NonEmptyTrimmedString
	maybeExpirationDate: Option.Option<Integer.Integer>
}) => AddProductCommand = Effect.fn(function* ({ name, maybeExpirationDate }) {
	yield* Effect.log(`Executed command for adding a product`)

	const addProduct = yield* AddProduct.AddProduct

	const [result] = yield* Effect.all([
		Effect.either(
			addProduct({
				name,
				maybeExpirationDate: maybeExpirationDate,
			}),
		),
		Effect.sleep(MINIMUM_LAG_MS),
	])

	if (Either.isLeft(result)) {
		return InternalMessage.AddProductFailed()
	}

	return InternalMessage.AddProductSucceeded()
})

export const queueRemoveToast: (id: symbol) => AddProductCommand = Effect.fn(
	function* (id) {
		yield* Effect.logDebug(`Executed command to queue toast removal`)
		yield* Effect.sleep(`3 seconds`)
		return InternalMessage.RemoveToast({ id })
	},
)

export const queueLoading: (id: symbol) => AddProductCommand = Effect.fn(
	function* (id) {
		yield* Effect.logDebug(`Executed command to queue spinner display`)
		yield* Effect.sleep(`150 millis`)
		return InternalMessage.ShowSpinner({ id })
	},
)

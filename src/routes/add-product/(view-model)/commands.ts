import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import * as Option from 'effect/Option'

import * as Integer from '$lib/core/integer/index.ts'
import * as NonEmptyTrimmedString from '$lib/core/non-empty-trimmed-string.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import { AddProduct } from '$lib/business/index.ts'
import { MINIMUM_LAG_MS } from '$lib/ui/constants.ts'
import type { Command } from '$lib/ui/helpers.svelte.ts'

import { Message } from './update.svelte.ts'

export type AddProductCommand = Command<Message, UseCases>

export const addProduct = ({
	name,
	maybeExpirationDate,
}: {
	name: NonEmptyTrimmedString.NonEmptyTrimmedString
	maybeExpirationDate: Option.Option<Integer.Integer>
}): AddProductCommand =>
	Effect.gen(function* () {
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
			return Message.AddProductFailed()
		}

		return Message.AddProductSucceeded()
	})

export const queueRemoveToast: (id: symbol) => AddProductCommand = id =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`Executed command to queue toast removal`)
		yield* Effect.sleep(`3 seconds`)
		return Message.RemoveToast({ id })
	})

export const queueLoading: (id: symbol) => AddProductCommand = id =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`Executed command to queue spinner display`)
		yield* Effect.sleep(`150 millis`)
		return Message.ShowSpinner({ id })
	})

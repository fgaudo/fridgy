import { E, Eff, Int, NETS, O } from '$lib/core/imports.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import { AddProduct } from '$lib/business/index.ts'
import type { Command } from '$lib/ui/adapters.ts'
import { MINIMUM_LAG_MS } from '$lib/ui/constants.ts'

import { Message } from './update.svelte.ts'

export type AddProductCommand = Command<Message, UseCases>

export const addProduct = ({
	name,
	maybeExpirationDate,
}: {
	name: NETS.NonEmptyTrimmedString
	maybeExpirationDate: O.Option<Int.Integer>
}): AddProductCommand =>
	Eff.gen(function* () {
		yield* Eff.log(`Executed command for adding a product`)

		const addProduct = yield* AddProduct.AddProduct

		const [result] = yield* Eff.all([
			Eff.either(
				addProduct({
					name,
					maybeExpirationDate: maybeExpirationDate,
				}),
			),
			Eff.sleep(MINIMUM_LAG_MS),
		])

		if (E.isLeft(result)) {
			return Message.AddProductFailed()
		}

		return Message.AddProductSucceeded()
	})

export const queueRemoveToast: (id: symbol) => AddProductCommand = id =>
	Eff.gen(function* () {
		yield* Eff.logDebug(`Executed command to queue toast removal`)
		yield* Eff.sleep(`3 seconds`)
		return Message.RemoveToast({ id })
	})

export const queueLoading: (id: symbol) => AddProductCommand = id =>
	Eff.gen(function* () {
		yield* Eff.logDebug(`Executed command to queue spinner display`)
		yield* Eff.sleep(`150 millis`)
		return Message.ShowSpinner({ id })
	})

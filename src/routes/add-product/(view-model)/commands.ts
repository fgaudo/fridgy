import {
	E,
	Eff,
	Int,
	NETS,
	O,
} from '$lib/core/imports.ts'
import type { Command } from '$lib/core/store.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import { AddProduct } from '$lib/business/index.ts'
import { MINIMUM_LAG_MS } from '$lib/ui/constants.ts'

import { Message } from './update.svelte.ts'

export type AddProductCommand = Command<
	Message,
	UseCases
>

export const addProduct = ({
	name,
	maybeExpirationDate,
}: {
	name: NETS.NonEmptyTrimmedString
	maybeExpirationDate: O.Option<Int.Integer>
}): AddProductCommand =>
	Eff.gen(function* () {
		const addProduct =
			yield* AddProduct.AddProduct

		const [result] = yield* Eff.all([
			Eff.either(
				addProduct({
					name,
					maybeExpirationDate:
						maybeExpirationDate,
				}),
			),
			Eff.sleep(MINIMUM_LAG_MS),
		])

		if (E.isLeft(result)) {
			return Message.AddProductFailed()
		}

		return Message.AddProductSucceeded()
	})

export const queueRemoveToast: AddProductCommand =
	Eff.gen(function* () {
		yield* Eff.sleep(3000)
		return Message.RemoveToast()
	})

export const setNameInteracted: AddProductCommand =
	Eff.sync(() => Message.SetNameInteracted())

export const setName = (
	name: string,
): AddProductCommand =>
	Eff.sync(() =>
		Message.SetName({
			name,
		}),
	)

export const setExpirationDate = (
	expirationDate: string,
): AddProductCommand =>
	Eff.sync(() =>
		Message.SetExpirationDate({
			expirationDate,
		}),
	)

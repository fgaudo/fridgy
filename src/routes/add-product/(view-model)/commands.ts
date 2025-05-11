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

		const result = yield* Eff.either(
			addProduct({
				name,
				maybeExpirationDate: maybeExpirationDate,
			}),
		)

		if (E.isLeft(result)) {
			return Message.AddProductFailed()
		}

		return Message.AddProductSucceeded()
	})

export const queueRemoveToast: (
	id: symbol,
) => AddProductCommand = id =>
	Eff.gen(function* () {
		yield* Eff.sleep(3000)
		return Message.RemoveToast({ id })
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

export const queueLoading: (
	id: symbol,
) => AddProductCommand = id =>
	Eff.gen(function* () {
		yield* Eff.sleep('150 millis')
		return Message.ShowSpinner({ id })
	})

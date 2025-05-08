import { LogLevel } from 'effect'

import {
	E,
	Eff,
	Int,
	NETS,
	O,
} from '$lib/core/imports.ts'
import type { Task } from '$lib/core/store.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import {
	AddProduct,
	LogWithLevel,
} from '$lib/business/index.ts'
import { MINIMUM_LAG_MS } from '$lib/ui/constants.ts'

import { Message } from './update.svelte.ts'

type AddProductTask = Task<Message, UseCases>

export const addProduct = ({
	name,
	maybeExpirationDate,
}: {
	name: NETS.NonEmptyTrimmedString
	maybeExpirationDate: O.Option<Int.Integer>
}): AddProductTask =>
	Eff.gen(function* () {
		const logResolver =
			yield* LogWithLevel.Resolver

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
					name,
					maybeExpirationDate,
				}),
			),
			Eff.sleep(MINIMUM_LAG_MS),
		])

		if (E.isLeft(result)) {
			return [Message.AddProductFailed()]
		}

		return [Message.AddProductSucceeded()]
	})

export const queueRemoveToast: AddProductTask =
	Eff.gen(function* () {
		yield* Eff.sleep(3000)
		return [Message.RemoveToast()]
	})

export const setNameInteracted: AddProductTask =
	Eff.sync(() => [Message.SetNameInteracted()])

export const setName = (
	name: string,
): AddProductTask =>
	Eff.sync(() => [
		Message.SetName({
			name,
		}),
	])

export const setExpirationDate = (
	expirationDate: string,
): AddProductTask =>
	Eff.sync(() => [
		Message.SetExpirationDate({
			expirationDate,
		}),
	])

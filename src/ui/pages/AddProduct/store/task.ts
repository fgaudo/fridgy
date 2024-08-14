import { E, Eff, F, O } from '@/core/imports'

import type { App } from '@/app/index'

import { InternalMessage } from './actions'

export const addProductTask = (
	addProduct: App['addProduct'],
	formFields: {
		name: string
		expirationDate: O.Option<number>
	},
) =>
	({
		type: 'task',

		effect: Eff.gen(function* () {
			const result = yield* addProduct(
				formFields,
			).pipe(Eff.either)

			if (E.isLeft(result)) {
				Eff.logError(result.left)
				return yield* Eff.fail(
					InternalMessage.AddProductFailed({
						message:
							'There was a problem adding the product',
					}),
				)
			}

			return InternalMessage.AddProductSucceeded({
				name: formFields.name,
			})
		}),
	}) as const

export const removeToast = (
	fiber: O.Option<F.Fiber<unknown>>,
) =>
	({
		type: 'task',
		onStart: (fiber: F.Fiber<unknown>) =>
			InternalMessage.RemoveToastStarted({
				fiber,
			}),
		effect: Eff.gen(function* () {
			if (O.isSome(fiber)) {
				yield* F.interrupt(fiber.value)
			}

			yield* Eff.sleep(3000)
			return InternalMessage.RemoveToast()
		}),
	}) as const

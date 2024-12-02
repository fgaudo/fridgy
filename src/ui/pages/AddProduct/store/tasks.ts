import {
	E,
	Eff,
	F,
	H,
	NETS,
	O,
} from '@/core/imports.ts'

import type { App } from '@/app/index.ts'
import { AddProductUseCase } from '@/app/use-cases/add-product.ts'

import { MINIMUM_LAG_MS } from '@/ui/core/constants.ts'
import type { Task } from '@/ui/core/solid.ts'

import {
	InternalMessage,
	Message,
} from './actions.ts'
import type { State } from './index.ts'

export const addProduct = (
	app: App,
): Task<State, Message | InternalMessage> => ({
	onStart: (fiber: F.Fiber<unknown>) => () =>
		InternalMessage.AddProductStarted({
			fiber,
		}),
	effect: (state: State) =>
		Eff.provide(
			Eff.gen(function* () {
				const addProduct =
					yield* AddProductUseCase

				const nameResult = NETS.fromString(
					state.formFields.name,
				)

				if (O.isNone(nameResult)) {
					return InternalMessage.AddProductFailed(
						{
							message: NETS.unsafe_fromString(
								'No name provided',
							),
						},
					)
				}

				const [result] = yield* Eff.all([
					addProduct({
						...state.formFields,
						name: nameResult.value,
					}).pipe(Eff.either),
					Eff.sleep(MINIMUM_LAG_MS),
				])

				if (E.isLeft(result)) {
					H.logError(result.left)
					return InternalMessage.AddProductFailed(
						{
							message: NETS.unsafe_fromString(
								'There was a problem adding the product',
							),
						},
					)
				}

				return InternalMessage.AddProductSucceeded(
					{
						name: nameResult.value,
					},
				)
			}),
			app,
		),
})

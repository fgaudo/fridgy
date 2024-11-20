import {
	E,
	Eff,
	F,
	H,
	Int,
	NETS,
	O,
} from '@/core/imports.ts'

import type { App } from '@/app/index.ts'

import { MINIMUM_LAG_MS } from '@/ui/core/constants.ts'
import type { Task } from '@/ui/core/solid.ts'

import {
	InternalMessage,
	Message,
} from './actions.ts'

export const addProduct = (
	addProduct: App['addProduct'],
	formFields: {
		name: NETS.NonEmptyTrimmedString
		expirationDate: O.Option<Int.Integer>
	},
): Task<Message | InternalMessage> => ({
	onStart: (fiber: F.Fiber<unknown>) =>
		InternalMessage.AddProductStarted({
			fiber,
		}),
	effect: Eff.gen(function* () {
		const [result] = yield* Eff.all([
			addProduct(formFields).pipe(Eff.either),
			Eff.sleep(MINIMUM_LAG_MS),
		])

		if (E.isLeft(result)) {
			H.logError(result.left)
			return InternalMessage.AddProductFailed({
				message: NETS.unsafe_fromString(
					'There was a problem adding the product',
				),
			})
		}

		return InternalMessage.AddProductSucceeded({
			name: formFields.name,
		})
	}),
})

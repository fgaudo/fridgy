import {
	E,
	Eff,
	F,
	Int,
	NETS,
	O,
} from '@/core/imports.js'

import type { App } from '@/app/index.js'

import { MINIMUM_LAG_MS } from '@/ui/core/constants.js'
import type { Task } from '@/ui/core/solid.js'

import {
	InternalMessage,
	Message,
} from './actions.js'

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
			Eff.logError(result.left)
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

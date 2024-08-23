import {
	E,
	Eff,
	F,
	Int,
	NETS,
	O,
} from '@/core/imports'

import type { App } from '@/app/index'

import { MINIMUM_LAG_MS } from '@/ui/core/constants'

import { InternalMessage } from './actions'

export const addProductTask = (
	addProduct: App['addProduct'],
	formFields: {
		name: NETS.NonEmptyTrimmedString
		expirationDate: O.Option<Int.Integer>
	},
) => ({
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

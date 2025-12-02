import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'

import * as H from '@/core/helper.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { MINIMUM_LAG_MS } from '$lib/constants.ts'

import { Message } from './message.ts'

export const addProduct = H.mapFunctionReturn(
	UC.AddProduct.AddProduct.run,
	effect =>
		Effect.all([
			Effect.map(
				effect,
				Match.valueTags({
					Failed: () => Message.AddProductFailed(),
					Succeeded: () => Message.AddProductSucceeded(),
				}),
			),
			Effect.sleep(MINIMUM_LAG_MS),
		]).pipe(Effect.map(([eff]) => eff)),
)

export const notifyWrongState = Effect.fn(function* (message: {
	_tag: string
}) {
	yield* Effect.logWarning(`Triggered ${message._tag} in wrong state`)
	return Message.NoOp()
})

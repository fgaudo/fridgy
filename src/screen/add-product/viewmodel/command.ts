import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'

import { UseCases as UC } from '@/business/index.ts'

import { Message } from './message.ts'

const MINIMUM_LAG_MS: Duration.Input = '400 millis' // for better ui experience

export const addProduct = Effect.fn(function* (params: UC.AddProduct.Params) {
	const addProduct = (yield* UC.AddProduct.AddProduct).run

	const [result] = yield* Effect.all([
		addProduct(params),
		Effect.sleep(MINIMUM_LAG_MS),
	])

	const map = Match.valueTags(result, {
		Failed: () => Message.AddProductFailed(),
		Succeeded: () => Message.AddProductSucceeded(),
	})

	return map
})

export const notifyWrongState = Effect.fn(function* (message: {
	_tag: string
}) {
	yield* Effect.logWarning(`Triggered ${message._tag} in wrong state`)
	return Message.NoOp()
})

import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'

import * as SM from '@/core/state-manager.ts'

import { UseCases as UC } from '@/business/index.ts'

import { Message } from './message.ts'
import type { FetchListSchedulerVersion, FetchListVersion } from './state.ts'

export type Command = SM.Command<Message, UC.All>

export const notifyWrongState = Effect.fn(function* (message: {
	_tag: string
}) {
	yield* Effect.logError(`Triggered ${message._tag} in wrong state`)
	return Message.NoOp()
})

export const notifyStale = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logInfo(`Triggered stale ${message._tag}`)
	return Message.NoOp()
})

export const deleteAndGetProducts = Effect.fn(function* (
	params: UC.DeleteAndGetProducts.DeleteParameters,
) {
	const deleteProducts = (yield* UC.DeleteAndGetProducts.DeleteAndGetProducts)
		.run

	const result = yield* deleteProducts(params)

	return Match.valueTags(result, {
		DeleteSucceededButRefreshFailed: response =>
			Message.DeleteSucceededButRefreshFailed({ response }),
		Failed: response => Message.DeleteAndRefreshFailed({ response }),
		Succeeded: response => Message.DeleteAndRefreshSucceeded({ response }),
	})
})

export const fetchList = (version: FetchListVersion) =>
	Effect.map(
		UC.GetProducts.GetProducts.use(({ run }) => run),
		Match.valueTags({
			Failed: response => Message.FetchListFailed({ version, response }),
			Succeeded: response => Message.FetchListSucceeded({ version, response }),
		}),
	)

export const fetchListTick = (version: FetchListSchedulerVersion) =>
	Effect.map(
		UC.GetProducts.GetProducts.use(({ run }) => run),
		Match.valueTags({
			Failed: response => Message.FetchListTickFailed({ version, response }),
			Succeeded: response =>
				Message.FetchListTickSucceeded({ version, response }),
		}),
	)

import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'

import * as H from '@/core/helper.ts'
import * as SM from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { InternalMessage } from './message.ts'

export type Command = SM.Command<InternalMessage, UC.All>

export const notifyWrongState = Effect.fn(function* (message: {
	_tag: string
}) {
	yield* Effect.logError(`Triggered ${message._tag} in wrong state`)
	return InternalMessage.NoOp()
})

export const notifyStale = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logInfo(`Triggered stale ${message._tag}`)
	return InternalMessage.NoOp()
})

export const deleteAndGetProducts = H.mapFunctionReturn(
	UC.DeleteAndGetProducts.DeleteAndGetProducts.run,
	Effect.map(
		Match.valueTags({
			DeleteSucceededButRefreshFailed: response =>
				InternalMessage.DeleteSucceededButRefreshFailed({ response }),
			Failed: response => InternalMessage.DeleteAndRefreshFailed({ response }),
			Succeeded: response =>
				InternalMessage.DeleteAndRefreshSucceeded({ response }),
		}),
	),
)

export const fetchList = Effect.map(
	UC.GetProducts.GetProducts.run,
	Match.valueTags({
		Failed: response => InternalMessage.FetchListFailed({ response }),
		Succeeded: response => InternalMessage.FetchListSucceeded({ response }),
	}),
)

export const fetchListTick = (version: number) =>
	Effect.map(
		UC.GetProducts.GetProducts.run,
		Match.valueTags({
			Failed: response =>
				InternalMessage.FetchListTickFailed({ version, response }),
			Succeeded: response =>
				InternalMessage.FetchListTickSucceeded({ version, response }),
		}),
	)

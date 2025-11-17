import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { type MapTags, mapFunctionReturn } from '@/core/helper.ts'
import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import {
	type Command,
	makeStateManager,
	modify,
	noOp,
} from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'
import { Message as AddProductMessage } from '@/feature/product-management/usecases/add-product.ts'

/////
/////

type Message = Data.TaggedEnum<{
	AddProduct: {
		name: NonEmptyTrimmedString.NonEmptyTrimmedString
		maybeExpirationDate: Option.Option<Integer.Integer>
	}
}>

const Message = Data.taggedEnum<Message>()

type InternalMessage =
	| Message
	| MapTags<
			AddProductMessage,
			{ Failed: `AddProductFailed`; Succeeded: `AddProductSucceeded` }
	  >

const InternalMessage = Data.taggedEnum<InternalMessage>()

/////
/////

const State = Schema.extend(
	Schema.Struct({
		isAdding: Schema.Boolean,
	}),
	Schema.Union(
		Schema.Struct({
			maybeMessage: NonEmptyTrimmedString.Schema,
			messageType: Schema.Union(
				Schema.Literal(`error`),
				Schema.Literal(`success`),
			),
		}),
		Schema.Struct({
			messageType: Schema.Literal(`none`),
		}),
	),
)

type State = Schema.Schema.Type<typeof State>

/////
/////

const addProduct = mapFunctionReturn(
	UC.AddProduct.Service.run,
	Effect.map(
		AddProductMessage.$match({
			Failed: () => InternalMessage.AddProductFailed(),
			Succeeded: () => InternalMessage.AddProductSucceeded(),
		}),
	),
)

const matcher = Match.typeTags<
	InternalMessage,
	(s: Readonly<State>) => Readonly<{
		state: State
		commands: Command<InternalMessage, UC.All>[]
	}>
>()

const update = matcher({
	AddProduct:
		({ maybeExpirationDate, name }) =>
		state => {
			if (state.isAdding) {
				return noOp(state)
			}

			return modify(state, draft => {
				draft.isAdding = true

				return [
					addProduct({
						name,
						maybeExpirationDate,
					}),
				]
			})
		},
	AddProductSucceeded: () =>
		modify(draft => {
			draft.isAdding = false
		}),
	AddProductFailed: () =>
		modify(draft => {
			draft.isAdding = false
		}),
})

const makeViewModel = Effect.gen(function* () {
	const viewModel = yield* makeStateManager({
		initState: { isAdding: false, messageType: `none` },
		update,
	})

	return {
		...viewModel,
		dispatch: (m: Message) => viewModel.dispatch(m),
	}
})

export { makeViewModel }

export { Message }

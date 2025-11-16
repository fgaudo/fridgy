import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { modify, noOp } from '@/core/helper.ts'
import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import { type Command, makeStateManager } from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as ProductManagementUseCases } from '@/feature/product-management/index.ts'

type Message = Data.TaggedEnum<{
	AddProduct: {
		name: NonEmptyTrimmedString.NonEmptyTrimmedString
		maybeExpirationDate: Option.Option<Integer.Integer>
	}
}>

const Message = Data.taggedEnum<Message>()

type InternalMessage = Message | ProductManagementUseCases.AddProduct.Message

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

const matcher = Match.typeTags<
	InternalMessage,
	(s: Readonly<State>) => Readonly<{
		state: State
		commands: Command<InternalMessage, ProductManagementUseCases.All>[]
	}>
>()

const addProduct = ProductManagementUseCases.AddProduct.AddProduct.run

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
	AddProductFailed: () =>
		modify(draft => {
			draft.isAdding = false
		}),
	AddProductSucceeeded: () =>
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

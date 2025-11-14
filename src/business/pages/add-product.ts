import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { modify, noOp } from '@/core/helper.ts'
import * as Integer from '@/core/integer'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import { type Command, makeStateManager } from '@/core/state-manager.ts'

import { UseCases as ProductManagementUseCases } from '@/feature/product-management/index.ts'

type Message = Data.TaggedEnum<{
	AddProduct: {
		name: NonEmptyTrimmedString.NonEmptyTrimmedString
		maybeExpirationDate: Option.Option<Integer.Integer>
	}
}>

type InternalMessage = Message | ProductManagementUseCases.AddProduct.Message

const State = Schema.Struct({
	isAdding: Schema.Boolean,
	isLoading: Schema.Boolean,
	hasCrashOccurred: Schema.Boolean,
	toastMessage: Schema.String,
	toastType: Schema.Union(Schema.Literal(`error`), Schema.Literal(`success`)),
})

type State = Schema.Schema.Type<typeof State>

const matcher = Match.typeTags<
	InternalMessage,
	(s: Readonly<State>) => Readonly<{
		state: State
		commands: Command<InternalMessage, ProductManagementUseCases.All>[]
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
					ProductManagementUseCases.AddProduct.Service.run({
						name,
						maybeExpirationDate,
					}),
				]
			})
		},
	AddProductFailed: () =>
		modify(draft => {
			draft.isAdding = false
			draft.isLoading = false
		}),
	AddProductSucceeeded: () =>
		modify(draft => {
			draft.isAdding = false
			draft.isLoading = false
		}),
})

const makeViewModel = Effect.provide(
	Effect.gen(function* () {
		const viewModel = yield* makeStateManager({
			initState: {} as State,
			update,
		})

		return {
			dispose: viewModel.dispose,
			dispatch: (m: Message) => viewModel.dispatch(m),
			initState: viewModel.initState,
			changes: viewModel.changes,
		}
	}),
	ProductManagementUseCases.all,
)

export { makeViewModel }

export type { Message }

import * as Chunk from 'effect/Chunk'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { flow, pipe } from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Stream from 'effect/Stream'

import * as H from '@/core/helper.ts'
import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as SM from '@/core/state-manager.ts'
import type { ViewModel } from '@/core/viewmodel.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

/////
/////

type Message = Data.TaggedEnum<{
	SetName: {
		name: string
	}
	SetExpiration: { maybeExpirationDate: Option.Option<Integer.Integer> }
	StartAddProduct: object
}>

const Message = Data.taggedEnum<Message>()

type _InternalMessage = Data.TaggedEnum<{
	NoOp: object
}>

type InternalMessage =
	| Message
	| _InternalMessage
	| H.MapTags<
			UC.AddProduct.Response,
			{ Failed: `AddProductFailed`; Succeeded: `AddProductSucceeded` }
	  >

const InternalMessage = Data.taggedEnum<InternalMessage>()

/////
/////

type State = {
	isBusy: boolean
	maybeName: Option.Option<string>
	maybeExpirationDate: Option.Option<Integer.Integer>
}

/////
/////

const addProduct = H.mapFunctionReturn(
	UC.AddProduct.AddProduct.run,
	Effect.map(
		Match.valueTags({
			Failed: () => InternalMessage.AddProductFailed(),
			Succeeded: () => InternalMessage.AddProductSucceeded(),
		}),
	),
)

const matcher = Match.typeTags<
	InternalMessage,
	ReturnType<SM.Update<State, InternalMessage, UC.All>>
>()

const notifyWrongState = Effect.fn(function* (message: { _tag: string }) {
	yield* Effect.logWarning(`Triggered ${message._tag} in wrong state`)
	return InternalMessage.NoOp()
})

const isSubmittable = (
	state: State,
): state is State & {
	maybeName: Option.Some<NonEmptyTrimmedString.NonEmptyTrimmedString>
	isBusy: false
} => isNameValid(state) && !state.isBusy

const isNameValid = (
	state: State,
): state is State & {
	maybeName: Option.Some<NonEmptyTrimmedString.NonEmptyTrimmedString>
} =>
	pipe(
		state.maybeName,
		Option.flatMap(NonEmptyTrimmedString.fromString),
		Option.isSome,
	)

const update = matcher({
	NoOp: () => state => ({ state, commands: Chunk.empty() }),
	SetName: message => state => {
		return {
			state: {
				...state,
				maybeName: Option.some(message.name),
			} satisfies State,
			commands: Chunk.empty(),
		}
	},
	SetExpiration: message => state => {
		return {
			state: {
				...state,
				maybeExpirationDate: message.maybeExpirationDate,
			} satisfies State,
			commands: Chunk.empty(),
		}
	},
	StartAddProduct: message => state => {
		if (state.isBusy) {
			return { state, commands: Chunk.empty() }
		}

		if (isSubmittable(state)) {
			return {
				state: { ...state, isBusy: true } satisfies State,
				commands: Chunk.make(
					addProduct({
						maybeExpirationDate: state.maybeExpirationDate,
						name: state.maybeName.value,
					}),
				),
			}
		}

		return { state, commands: Chunk.make(notifyWrongState(message)) }
	},
	AddProductSucceeded: () => state => {
		return {
			state: { ...state, isBusy: false } satisfies State,
			commands: Chunk.empty(),
		}
	},
	AddProductFailed: () => state => {
		return {
			state: { ...state, isBusy: false } satisfies State,
			commands: Chunk.empty(),
		}
	},
})

const makeViewModel = Effect.gen(function* (): Effect.fn.Return<
	ViewModel<State, Message, 'AddProductFailed' | 'AddProductSucceeded', UC.All>
> {
	const stateManager = yield* SM.makeStateManager({
		initState: {
			isBusy: false,
			maybeExpirationDate: Option.none(),
			maybeName: Option.none(),
		},
		update,
	})

	return {
		...stateManager,
		messages: Stream.filterMap(
			stateManager.messages,
			flow(
				Match.value,
				Match.tags({
					AddProductFailed: ({ _tag }) => Option.some(_tag),
					AddProductSucceeded: ({ _tag }) => Option.some(_tag),
				}),
				Match.orElse(() => Option.none()),
			),
		),
	}
})

export { makeViewModel, Message, isSubmittable, isNameValid }

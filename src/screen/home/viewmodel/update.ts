import * as Arr from 'effect/Array'
import * as Chunk from 'effect/Chunk'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import * as SM from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import * as Command from './command.ts'
import { Message } from './message.ts'
import * as State from './state.ts'

export type ProductDTO = Data.TaggedEnum.Value<
	State.State['productListStatus'],
	'Available'
>['products'][0]

const ProductDTO = Data.taggedEnum<ProductDTO>()

const matcher = Match.typeTags<
	Message,
	ReturnType<SM.Update<State.State, Message, UC.All>>
>()

const updateFetchListSucceeded = (
	message: Data.TaggedEnum.Value<Message, 'FetchListSucceeded'>,
	state: State.State,
) => {
	if (Option.isNone(message.response.maybeProducts)) {
		return {
			state: {
				...state,
				productListStatus: { _tag: 'Empty' },
			} satisfies State.State,
			commands: Chunk.empty(),
		}
	}

	const withProducts = {
		_tag: 'Available',
		total: message.response.maybeProducts.value.total,
		products: Arr.map(message.response.maybeProducts.value.list, product => {
			if (product._tag === 'Corrupt') {
				return ProductDTO.Corrupt({ ...product, id: Symbol() })
			}

			return product
		}),
	} satisfies Partial<State.State['productListStatus']>

	if (!State.isInAvailable(state)) {
		return {
			commands: Chunk.empty(),
			state: {
				...state,
				productListStatus: {
					isDeleting: false,
					...withProducts,
					maybeSelectedProducts: Option.none(),
				},
			} satisfies State.State,
		}
	}

	return {
		commands: Chunk.empty(),
		state: {
			...state,
			productListStatus: {
				...state.productListStatus,
				...withProducts,
				maybeSelectedProducts: pipe(
					state.productListStatus.maybeSelectedProducts,
					Option.map(
						HashSet.intersection(
							pipe(
								message.response.maybeProducts.value.list,
								Arr.filter(product => product._tag !== 'Corrupt'),
								Arr.map(product => product.id),
							),
						),
					),
					Option.flatMap(NonEmptyHashSet.fromHashSet),
				),
			},
		} satisfies State.State,
	}
}

const updateFetchListFailed = (
	message: Data.TaggedEnum.Value<Message, 'FetchListFailed'>,
	state: State.State,
) => {
	if (State.isInitial(state)) {
		return {
			state,
			commands: Chunk.empty(),
		}
	}

	return {
		state: {
			...state,
			productListStatus: { _tag: 'Error' },
		} satisfies State.State,
		commands: Chunk.empty(),
	}
}

export const update: SM.Update<State.State, Message, UC.All> = matcher({
	Crash: error => state => ({
		state,
		commands: Chunk.make(
			Effect.logFatal(error).pipe(Effect.as(Message.NoOp())),
		),
	}),

	NoOp: () => state => ({ state, commands: Chunk.empty() }),

	StartFetchList: message => state => {
		if (!State.isManualFetchingAllowed(state)) {
			return {
				state,
				commands: Chunk.make(Command.notifyWrongState(message)),
			}
		}

		const nextFetchVersion = State.FetchListVersion.increment(
			state.fetchListVersion,
		)
		return {
			state: {
				...state,
				fetchListSchedulerVersion: State.FetchListSchedulerVersion.increment(
					state.fetchListSchedulerVersion,
				),
				fetchListVersion: nextFetchVersion,
				isManualFetching: true,
				isFetching: true,
			} satisfies State.State,
			commands: Chunk.make(Command.fetchList(nextFetchVersion)),
		}
	},

	FetchListSucceeded: message => state => {
		if (state.fetchListVersion !== message.version) {
			return { state, commands: Chunk.make(Command.notifyStale(message)) }
		}

		if (!State.isManualFetching(state)) {
			return { state, commands: Chunk.make(Command.notifyWrongState(message)) }
		}

		return pipe(updateFetchListSucceeded(message, state), result => ({
			state: {
				...result.state,
				isManualFetching: false,
				isFetching: false,
			} satisfies State.State,
			commands: result.commands,
		}))
	},

	FetchListFailed: message => state => {
		if (state.fetchListVersion !== message.version) {
			return { state, commands: Chunk.make(Command.notifyStale(message)) }
		}

		if (!State.isManualFetching(state)) {
			return { state, commands: Chunk.make(Command.notifyWrongState(message)) }
		}

		return pipe(updateFetchListFailed(message, state), result => ({
			state: {
				...result.state,
				isManualFetching: false,
				isFetching: false,
			} satisfies State.State,
			commands: result.commands,
		}))
	},

	FetchListTick: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return {
				state,
				commands: Chunk.make(Command.notifyStale(message)),
			}
		}

		if (!State.isSchedulerFetchingAllowed(state)) {
			return { state, commands: Chunk.make(Command.notifyWrongState(message)) }
		}

		return {
			state: { ...state, isFetching: true },
			commands: Chunk.make(Command.fetchListTick(message.version)),
		}
	},

	FetchListTickSucceeded: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return { state, commands: Chunk.make(Command.notifyStale(message)) }
		}

		if (!State.isFetching(state)) {
			return { state, commands: Chunk.make(Command.notifyWrongState(message)) }
		}

		return pipe(
			updateFetchListSucceeded(
				Message.FetchListSucceeded({
					response: message.response,
					version: state.fetchListVersion,
				}),
				state,
			),
			result => ({
				state: { ...result.state, isFetching: false },
				commands: result.commands,
			}),
		)
	},

	FetchListTickFailed: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return { state, commands: Chunk.make(Command.notifyStale(message)) }
		}

		if (!State.isFetching(state)) {
			return { state, commands: Chunk.make(Command.notifyWrongState(message)) }
		}

		return pipe(
			updateFetchListFailed(
				Message.FetchListFailed({
					response: message.response,
					version: state.fetchListVersion,
				}),
				state,
			),
			result => ({
				state: { ...state, isFetching: false },
				commands: result.commands,
			}),
		)
	},

	StartDeleteAndRefresh: message => state => {
		if (!State.isDeletingAllowed(state)) {
			return {
				state,
				commands: Chunk.make(Command.notifyWrongState(message)),
			}
		}

		return {
			state: {
				...state,
				isFetching: true,
				productListStatus: {
					...state.productListStatus,
					isDeleting: true,
				},
				isManualFetching: true,
				fetchListSchedulerVersion: State.FetchListSchedulerVersion.increment(
					state.fetchListSchedulerVersion,
				),
				fetchListVersion: State.FetchListVersion.increment(
					state.fetchListVersion,
				),
			} satisfies State.State,
			commands: Chunk.make(
				Command.deleteAndGetProducts({
					ids: state.productListStatus.maybeSelectedProducts.value,
				}),
			),
		}
	},

	DeleteAndRefreshSucceeded: message => state => {
		if (!State.isDeleting(state)) {
			return {
				state,
				commands: Chunk.make(Command.notifyWrongState(message)),
			}
		}

		if (Option.isNone(message.response.maybeProducts)) {
			return {
				state: {
					...state,
					isFetching: false,
					isManualFetching: false,
					productListStatus: { _tag: 'Empty' },
				} satisfies State.State,
				commands: Chunk.empty(),
			}
		}

		return {
			commands: Chunk.empty(),
			state: {
				...state,
				isFetching: false,
				isManualFetching: false,
				productListStatus: {
					_tag: 'Available',
					isDeleting: false,
					total: message.response.maybeProducts.value.total,
					products: Arr.map(
						message.response.maybeProducts.value.list,
						product => {
							if (product._tag === 'Corrupt') {
								return ProductDTO.Corrupt({ ...product, id: Symbol() })
							}

							return product
						},
					),
					maybeSelectedProducts: Option.none(),
				},
			} satisfies State.State,
		}
	},
	DeleteAndRefreshFailed: message => state => {
		if (!State.isDeleting(state)) {
			return {
				state,
				commands: Chunk.make(Command.notifyWrongState(message)),
			}
		}

		return {
			state: {
				...state,
				productListStatus: { ...state.productListStatus, isDeleting: false },
				isFetching: false,
				isManualFetching: false,
			} satisfies State.State,
			commands: Chunk.empty(),
		}
	},

	DeleteSucceededButRefreshFailed: message => state => {
		if (!State.isDeleting(state)) {
			return {
				state,
				commands: Chunk.make(Command.notifyWrongState(message)),
			}
		}

		return {
			commands: Chunk.empty(),
			state: {
				...state,
				productListStatus: {
					_tag: 'Error',
				},
				isManualFetching: false,
				isFetching: false,
			} satisfies State.State,
		}
	},

	ToggleItem: message => state => {
		if (!State.productsAreToggleable(state)) {
			return {
				state,
				commands: Chunk.make(Command.notifyWrongState(message)),
			}
		}

		return {
			state: {
				...state,
				productListStatus: {
					...state.productListStatus,
					maybeSelectedProducts: pipe(
						state.productListStatus.maybeSelectedProducts,
						Option.match({
							onSome: HashSet.toggle(message.id),
							onNone: () => HashSet.make(message.id),
						}),
						NonEmptyHashSet.fromHashSet,
					),
				},
			} satisfies State.State,
			commands: Chunk.empty(),
		}
	},

	ClearSelected: message => state => {
		if (!State.isSelectionClearable(state)) {
			return {
				state,
				commands: Chunk.make(Command.notifyWrongState(message)),
			}
		}

		return {
			state: {
				...state,
				productListStatus: {
					...state.productListStatus,
					maybeSelectedProducts: Option.none(),
				},
			} satisfies State.State,
			commands: Chunk.empty(),
		}
	},
})

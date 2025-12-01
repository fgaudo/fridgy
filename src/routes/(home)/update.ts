import * as Arr from 'effect/Array'
import * as Chunk from 'effect/Chunk'
import * as Data from 'effect/Data'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import * as SM from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import * as Command from './command.ts'
import { InternalMessage } from './message.ts'
import type { State } from './state.ts'

export type ProductDTO = Data.TaggedEnum.Value<
	State['productListStatus'],
	'Available'
>['products'][0]

const ProductDTO = Data.taggedEnum<ProductDTO>()

const matcher = Match.typeTags<
	InternalMessage,
	ReturnType<SM.Update<State, InternalMessage, UC.All>>
>()

const updateFetchListSucceeded = (
	message: Data.TaggedEnum.Value<InternalMessage, 'FetchListSucceeded'>,
	state: State,
) => {
	if (Option.isNone(message.response.maybeProducts)) {
		return {
			state: {
				...state,
				productListStatus: { _tag: 'Empty' },
			} satisfies State,
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
	} satisfies Partial<State['productListStatus']>

	if (state.productListStatus._tag !== 'Available') {
		return {
			commands: Chunk.empty(),
			state: {
				...state,
				productListStatus: {
					...withProducts,
					maybeSelectedProducts: Option.none(),
				},
			} satisfies State,
		}
	}

	return {
		commands: Chunk.empty(),
		state: {
			...state,
			productListStatus: {
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
		} satisfies State,
	}
}

const updateFetchListFailed = (
	message: Data.TaggedEnum.Value<InternalMessage, 'FetchListFailed'>,
	state: State,
) => {
	if (state.productListStatus._tag !== 'Initial') {
		return {
			state: state satisfies State,
			commands: Chunk.empty(),
		}
	}

	return {
		state: {
			...state,
			productListStatus: { _tag: 'Error' },
		} satisfies State,
		commands: Chunk.empty(),
	}
}

export const update: SM.Update<State, InternalMessage, UC.All> = matcher({
	NoOp: () => state => ({ state, commands: Chunk.empty() }),

	StartFetchList: message => state => {
		if (state.isDeleting) {
			return {
				state,
				commands: Chunk.make(Command.notifyWrongState(message)),
			}
		}

		return {
			state: {
				...state,
				fetchListSchedulerVersion: state.fetchListSchedulerVersion + 1,
				isSchedulerEnabled: false,
			} satisfies State,
			commands: Chunk.make(Command.fetchList),
		}
	},

	FetchListSucceeded: message => state =>
		pipe(updateFetchListSucceeded(message, state), result => ({
			state: {
				...result.state,
				isStaleData: false,
				isSchedulerEnabled: true,
			},
			commands: result.commands,
		})),

	FetchListFailed: message => state =>
		pipe(updateFetchListFailed(message, state), result => ({
			state: { ...result.state, isSchedulerEnabled: true },
			commands: result.commands,
		})),

	FetchListTick: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return {
				state,
				commands: Chunk.make(Command.notifyStale(message)),
			}
		}

		return {
			state,
			commands: Chunk.make(Command.fetchListTick(message.version)),
		}
	},

	FetchListTickSucceeded: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return { state, commands: Chunk.make(Command.notifyStale(message)) }
		}

		return pipe(
			updateFetchListSucceeded(
				InternalMessage.FetchListSucceeded(message),
				state,
			),
			result => ({
				state: { ...result.state, isStaleData: false },
				commands: result.commands,
			}),
		)
	},

	FetchListTickFailed: message => state => {
		if (message.version !== state.fetchListSchedulerVersion) {
			return { state, commands: Chunk.make(Command.notifyStale(message)) }
		}

		return updateFetchListFailed(
			InternalMessage.FetchListFailed(message),
			state,
		)
	},

	DeleteAndRefreshSucceeded: message => state =>
		pipe(
			(() => {
				let commands = Chunk.empty<Command.Command>()

				if (state.productListStatus._tag !== 'Available') {
					commands = Chunk.append(commands, Command.notifyWrongState(message))
				}

				if (Option.isNone(message.response.maybeProducts)) {
					return {
						state: {
							...state,
							productListStatus: { _tag: 'Empty' },
						} satisfies State,
						commands,
					}
				}

				return {
					commands,
					state: {
						...state,
						productListStatus: {
							_tag: 'Available',
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
					} satisfies State,
				}
			})(),
			result => ({
				state: { ...result.state, isDeleting: false, isStaleData: false },
				commands: result.commands,
			}),
		),

	DeleteAndRefreshFailed: message => state => {
		let commands = Chunk.empty<Command.Command>()

		if (state.productListStatus._tag !== 'Available') {
			commands = Chunk.append(commands, Command.notifyWrongState(message))
		}

		return {
			state: { ...state, isDeleting: false } satisfies State,
			commands,
		}
	},

	DeleteSucceededButRefreshFailed: message => state => {
		let commands = Chunk.empty<Command.Command>()

		if (state.productListStatus._tag !== 'Available') {
			commands = Chunk.append(commands, Command.notifyWrongState(message))
		}

		return {
			commands,
			state: {
				...state,
				isStaleData: true,
				isDeleting: false,
			} satisfies State,
		}
	},

	StartDeleteAndRefresh: message => state => {
		if (
			state.productListStatus._tag !== 'Available' ||
			Option.isNone(state.productListStatus.maybeSelectedProducts) ||
			state.isDeleting
		) {
			return {
				state,
				commands: Chunk.make(Command.notifyWrongState(message)),
			}
		}

		return {
			state: {
				...state,
				isDeleting: true,
				fetchListSchedulerVersion: state.fetchListSchedulerVersion + 1,
				isSchedulerEnabled: false,
			} satisfies State,
			commands: Chunk.make(
				Command.deleteAndGetProducts({
					ids: state.productListStatus.maybeSelectedProducts.value,
				}),
			),
		}
	},

	ToggleItem: message => state => {
		if (state.productListStatus._tag !== 'Available') {
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
			} satisfies State,
			commands: Chunk.empty(),
		}
	},

	ClearSelected: message => state => {
		if (
			state.productListStatus._tag !== 'Available' ||
			Option.isNone(state.productListStatus.maybeSelectedProducts)
		) {
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
			} satisfies State,
			commands: Chunk.empty(),
		}
	},

	ProductListHidden: () => state => ({
		state: {
			...state,
			isSchedulerEnabled: false,
			fetchListSchedulerVersion: state.fetchListSchedulerVersion + 1,
		} satisfies State,
		commands: Chunk.empty(),
	}),
})

import { VirtualItem, useWindowVirtualizer } from '@tanstack/react-virtual'
import * as I from 'fp-ts/Identity'
import * as Opt from 'fp-ts/Option'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as RoM from 'fp-ts/ReadonlyMap'
import * as RoS from 'fp-ts/ReadonlySet'
import * as RoT from 'fp-ts/ReadonlyTuple'
import { flow, pipe } from 'fp-ts/function'
import { useSubscription } from 'observable-hooks'
import { useMemo, useReducer } from 'react'

import { useGlobalContext } from '@/presentation/react'
import { AddFab } from '@/presentation/react/ui/fab-add-button'
import { Swipable } from '@/presentation/react/ui/swipable'
import { Title } from '@/presentation/react/ui/title'
import { Transition } from '@/presentation/react/ui/transition'

interface FoodState {
	readonly name: string
	readonly id: FoodModel['id']
}

interface FoodPageState {
	readonly loading: boolean
	readonly foods: {
		readonly byId: ReadonlyMap<FoodState['id'], FoodState>
		readonly sorted: ReadonlyArray<FoodState['id']>
		readonly deleting: ReadonlySet<FoodState['id']>
		readonly selected: ReadonlySet<FoodState['id']>
	}
}

const init: FoodPageState = {
	loading: true,
	foods: {
		byId: new Map(),
		sorted: [],
		deleting: new Set(),
		selected: new Set()
	}
}

interface VirtualFoodState {
	readonly food: FoodState
	readonly size: number
	readonly position: number
	readonly isDeleting: boolean
}

const createVirtualFoodItems = (
	sorted: ReadonlyArray<FoodState['id']>,
	deleting: ReadonlySet<FoodState['id']>,
	byId: ReadonlyMap<FoodState['id'], FoodState>
): ((items: readonly VirtualItem[]) => readonly VirtualFoodState[]) =>
	flow(
		RoA.reduce<
			VirtualItem,
			{ itemsToBeDeleted: number; items: readonly VirtualFoodState[] }
		>({ itemsToBeDeleted: 0, items: [] }, (state, item) =>
			pipe(
				sorted,
				RoA.lookup(item.index),
				Opt.bind('food', id => pipe(byId, RoM.lookup(FoodIdEq)(id))),
				Opt.bind('isDeleting', ({ food }) =>
					pipe(deleting, RoS.elem(FoodIdEq)(food.id), Opt.of)
				),
				Opt.map(({ food, isDeleting }) =>
					isDeleting
						? {
								itemsToBeDeleted: state.itemsToBeDeleted + 1,
								items: pipe(
									state.items,
									RoA.append({
										isDeleting: isDeleting as boolean,
										size: item.start,
										food,
										position:
											item.start - item.size * (state.itemsToBeDeleted + 1)
									})
								)
						  }
						: {
								itemsToBeDeleted: state.itemsToBeDeleted,
								items: pipe(
									state.items,
									RoA.append({
										isDeleting: isDeleting as boolean,
										size: item.start,
										food,
										position: item.start - item.size * state.itemsToBeDeleted
									})
								)
						  }
				),
				Opt.getOrElse(() => state)
			)
		),
		I.map(({ items }) => items)
	)

type Action =
	| { type: 'loadPage'; model: FoodPageModel }
	| { type: 'enqueueFoodDeletion'; id: FoodState['id'] }
	| { type: 'deleteFoods' }

const reducer = (state: FoodPageState, action: Action): FoodPageState => {
	switch (action.type) {
		case 'deleteFoods':
			return pipe(
				state.foods.deleting,
				Opt.fromPredicate(deleting => deleting.size > 0),
				Opt.bind(
					'byId',
					flow(
						RoS.reduce(FoodIdOrd)(state.foods.byId, (map, id) =>
							pipe(map, RoM.deleteAt(FoodIdEq)(id))
						),
						Opt.of
					)
				),
				Opt.bind('sorted', ({ byId }) =>
					pipe(byId, RoM.toReadonlyArray(FoodIdOrd), RoA.map(RoT.fst), Opt.of)
				),
				Opt.map(({ byId, sorted }) => ({
					loading: state.loading,
					foods: {
						byId,
						sorted,
						deleting: new Set<string>(),
						selected: state.foods.selected
					}
				})),
				Opt.getOrElse(() => state)
			)
		case 'enqueueFoodDeletion':
			return pipe(
				I.of(state.foods.deleting),
				I.map(RoS.insert(FoodIdEq)(action.id)),
				I.map(deleting => ({
					loading: state.loading,
					foods: {
						byId: state.foods.byId,
						sorted: state.foods.sorted,
						deleting,
						selected: state.foods.selected
					}
				}))
			)
		case 'loadPage':
			return pipe(
				I.Do,
				I.bind('byId', () =>
					pipe(
						action.model.foods,
						RoM.map(({ name, id }) => ({
							name,
							id
						}))
					)
				),
				I.bind('sorted', ({ byId }) =>
					pipe(byId, RoM.toReadonlyArray(FoodIdOrd), RoA.map(RoT.fst))
				),
				I.bind('selected', () =>
					pipe(
						state.foods.selected,
						RoS.filter(id => RoM.member(FoodIdEq)(id)(action.model.foods))
					)
				),
				I.map(({ byId, sorted, selected }) => ({
					loading: false,
					foods: {
						byId,
						sorted,
						selected,
						deleting: state.foods.deleting
					}
				}))
			)
	}
}

export function FoodsPage(): JSX.Element {
	const [state, dispatch] = useReducer(reducer, null, () => init)

	const {
		useCases: { foodsPageModel$ },
		title
	} = useGlobalContext()

	useSubscription(foodsPageModel$, model =>
		dispatch({ type: 'loadPage', model })
	)

	const rowVirtualizer = useWindowVirtualizer({
		count: state.foods.byId.size,
		estimateSize: () => 90,
		overscan: 10 + state.foods.deleting.size
	})

	const onSwipeRight = (id: FoodState['id']) => {
		dispatch({ type: 'enqueueFoodDeletion', id })

		// @TODO needed for the time being
		setTimeout(() => dispatch({ type: 'deleteFoods' }), 1000)
	}

	const items = rowVirtualizer.getVirtualItems()

	const virtualFoods = useMemo(
		() =>
			pipe(
				items,
				createVirtualFoodItems(
					state.foods.sorted,
					state.foods.deleting,
					state.foods.byId
				)
			),
		[items, state.foods.sorted, state.foods.deleting, state.foods.byId]
	)

	return (
		<Transition loading={state.loading}>
			<div className="h-full bg-gray-100">
				<Title text={title} />
				<ul
					style={{
						height: rowVirtualizer.getTotalSize()
					}}
					className={`relative w-full overflow-hidden pt-14`}>
					{virtualFoods.map(element =>
						element.isDeleting ? (
							<li
								key={element.food.id}
								style={{
									transform: `translateY(${element.position}px)`
								}}
								className="absolute top-0 left-0 h-0 w-full transition-transform duration-1000">
								<div className="translate-x-[2000px] transition-transform duration-[1200ms] ">
									<Swipable>
										<div className="mx-2 mb-2 h-[70px] bg-white p-3 shadow-md sm:pb-4">
											<div className="flex items-center space-x-4">
												<div className="min-w-0 flex-1">
													<p className="truncate pb-2 text-sm font-medium text-gray-900 dark:text-white">
														{element.food.name}
													</p>
													<div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
														<div className="h-2.5 w-[45%] rounded-full bg-blue-600" />
													</div>
												</div>
											</div>
										</div>
									</Swipable>
								</div>
							</li>
						) : (
							<li
								key={element.food.id}
								style={{
									height: element.size,
									transform: `translateY(${element.position}px)`
								}}
								className={`absolute top-0 left-0 w-full transition-transform duration-1000`}>
								<div className="translate-x-0 transition-transform duration-500 ">
									<Swipable onRight={() => onSwipeRight?.(element.food.id)}>
										<div className="mx-2 mb-2 h-[70px] bg-white p-3 shadow-md sm:pb-4">
											<div className="flex items-center space-x-4">
												<div className="min-w-0 flex-1">
													<p className="truncate pb-2 text-sm font-medium text-gray-900 dark:text-white">
														{element.food.name}
													</p>
													<div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
														<div className="h-2.5 w-[45%] rounded-full bg-blue-600" />
													</div>
												</div>
											</div>
										</div>
									</Swipable>
								</div>
							</li>
						)
					)}
				</ul>
				<div>
					<AddFab onClick={() => null} label="Add Food" />
				</div>
			</div>
		</Transition>
	)
}

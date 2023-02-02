import { VirtualItem, useWindowVirtualizer } from '@tanstack/react-virtual'
import * as Opt from 'fp-ts/Option'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as RoM from 'fp-ts/ReadonlyMap'
import * as RoS from 'fp-ts/ReadonlySet'
import * as RoT from 'fp-ts/ReadonlyTuple'
import { flow, pipe } from 'fp-ts/function'
import { useSubscription } from 'observable-hooks'
import { useMemo, useState } from 'react'

import {
	FoodIdEq,
	FoodIdOrd,
	FoodModel,
	FoodsPageModel
} from '@/application/read/foods-page'

import { useGlobalContext } from '@/presentation/react'
import { AddFab } from '@/presentation/react/ui/fab-add-button'
import { Swipable } from '@/presentation/react/ui/swipable'
import { Title } from '@/presentation/react/ui/title'
import { Transition } from '@/presentation/react/ui/transition'

interface FoodState {
	readonly name: string
	readonly id: FoodModel['id']
}

interface FoodsPageState {
	readonly loading: boolean
	readonly foods: {
		readonly byId: ReadonlyMap<FoodState['id'], FoodState>
		readonly sorted: ReadonlyArray<FoodState['id']>
		readonly deleting: ReadonlySet<FoodState['id']>
		readonly selected: ReadonlySet<FoodState['id']>
	}
}

const loadFoodPage =
	(model: FoodsPageModel) =>
	(state: FoodsPageState): FoodsPageState => {
		const foods = pipe(
			model.foods,
			RoM.map(({ name, id }) => ({
				name,
				id
			}))
		)

		const foodsIndexed = pipe(
			foods,
			RoM.toReadonlyArray(FoodIdOrd),
			RoA.map(RoT.fst)
		)

		return {
			loading: false,
			foods: {
				byId: foods,
				sorted: foodsIndexed,
				selected: pipe(
					state.foods.selected,
					RoS.filter(id => RoM.member(FoodIdEq)(id)(model.foods))
				),
				deleting: state.foods.deleting
			}
		}
	}

const init: FoodsPageState = {
	loading: true,
	foods: {
		byId: new Map(),
		sorted: [],
		deleting: new Set(),
		selected: new Set()
	}
}

const enqueueDeleteFoodItem =
	(id: FoodState['id']) =>
	(state: FoodsPageState): FoodsPageState => {
		const indexed = pipe(
			state.foods.byId,
			RoM.modifyAt(FoodIdEq)(id, item => ({
				...item,
				deleting: true
			})),
			Opt.getOrElse(() => state.foods.byId)
		)

		const sorted = pipe(
			indexed,
			RoM.toReadonlyArray(FoodIdOrd),
			RoA.map(RoT.fst)
		)

		return {
			...state,
			foods: {
				...state.foods,
				byId: indexed,
				sorted,
				deleting: pipe(state.foods.deleting, RoS.insert(FoodIdEq)(id))
			}
		}
	}

const deleteFoodItems = (state: FoodsPageState): FoodsPageState => {
	if (state.foods.deleting.size <= 0) {
		return state
	}

	const indexed = pipe(
		state.foods.deleting,
		RoS.reduce(FoodIdOrd)(state.foods.byId, (map, id) =>
			pipe(map, RoM.deleteAt(FoodIdEq)(id))
		)
	)

	const sorted = pipe(indexed, RoM.toReadonlyArray(FoodIdOrd), RoA.map(RoT.fst))

	return {
		...state,
		foods: {
			...state.foods,
			byId: indexed,
			sorted,
			deleting: new Set()
		}
	}
}

const createVirtualFoodItems = (
	items: readonly VirtualItem[],
	sorted: ReadonlyArray<FoodState['id']>,
	deleting: ReadonlySet<FoodState['id']>,
	byId: ReadonlyMap<FoodState['id'], FoodState>
): readonly VirtualFoodState[] =>
	pipe(
		items,
		RoA.reduce<VirtualItem, [number, readonly VirtualFoodState[]]>(
			[0, []],
			([deletingItemsNumber, items], item) =>
				pipe(
					sorted,
					RoA.lookup(item.index),
					Opt.chain(id => pipe(byId, RoM.lookup(FoodIdEq)(id))),
					Opt.map(
						food => [food, pipe(deleting, RoS.elem(FoodIdEq)(food.id))] as const
					),
					Opt.map(([food, isDeleting]) =>
						isDeleting
							? ([
									deletingItemsNumber + 1,
									pipe(
										items,
										RoA.append({
											isDeleting: isDeleting as boolean,
											size: item.start,
											food,
											position:
												item.start - item.size * (deletingItemsNumber + 1)
										})
									)
							  ] as [number, readonly VirtualFoodState[]])
							: ([
									deletingItemsNumber,
									pipe(
										items,
										RoA.append({
											isDeleting: isDeleting as boolean,
											size: item.start,
											food,
											position: item.start - item.size * deletingItemsNumber
										})
									)
							  ] as [number, readonly VirtualFoodState[]])
					),
					Opt.getOrElse(() => [deletingItemsNumber, items])
				)
		),
		RoT.snd
	)

interface VirtualFoodState {
	readonly food: FoodState
	readonly size: number
	readonly position: number
	readonly isDeleting: boolean
}

export function FoodsPage(): JSX.Element {
	const [state, setState] = useState<FoodsPageState>(() => init)

	const {
		useCases: { foodsPageModel$ },
		title
	} = useGlobalContext()

	useSubscription(foodsPageModel$, flow(loadFoodPage, setState))

	const rowVirtualizer = useWindowVirtualizer({
		count: state.foods.byId.size,
		estimateSize: () => 90,
		overscan: 10 + state.foods.deleting.size
	})

	const onSwipeRight = (id: FoodState['id']) => {
		pipe(id, enqueueDeleteFoodItem, setState)

		// @TODO needed for the time being
		setTimeout(() => pipe(deleteFoodItems, setState), 1000)
	}

	const items = rowVirtualizer.getVirtualItems()

	const partitionedFoods = useMemo(
		() =>
			createVirtualFoodItems(
				items,
				state.foods.sorted,
				state.foods.deleting,
				state.foods.byId
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
					{partitionedFoods.map(element =>
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

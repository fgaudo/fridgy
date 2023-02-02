import { VirtualItem, useWindowVirtualizer } from '@tanstack/react-virtual'
import * as Opt from 'fp-ts/Option'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as RoM from 'fp-ts/ReadonlyMap'
import * as RoS from 'fp-ts/ReadonlySet'
import * as RoT from 'fp-ts/ReadonlyTuple'
import { flow, pipe } from 'fp-ts/function'
import * as S from 'fp-ts/string'
import { useSubscription } from 'observable-hooks'
import { useEffect, useState } from 'react'

import { FoodsPageModel } from '@/application/read/foods-page'

import { useGlobalContext } from '@/presentation/react'
import { AddFab } from '@/presentation/react/ui/fab-add-button'
import { Swipable } from '@/presentation/react/ui/swipable'
import { Title } from '@/presentation/react/ui/title'
import { Transition } from '@/presentation/react/ui/transition'

interface FoodItemState {
	readonly name: string
	readonly id: string
	readonly selected: boolean
	readonly removed: boolean
	readonly deleting: boolean
}

interface FoodsPageState {
	readonly deleting: ReadonlySet<string>
	readonly loading: boolean
	readonly selected: ReadonlySet<string>
	readonly foods: {
		readonly indexed: ReadonlyMap<FoodItemState['id'], FoodItemState>
		readonly sorted: ReadonlyArray<FoodItemState['id']>
	}
}

const loadFoodPage =
	(model: FoodsPageModel) =>
	(state: FoodsPageState): FoodsPageState => {
		const foods = pipe(
			model.foods,
			RoM.map(({ name, id }) => ({
				name,
				id,
				deleting: false,
				selected: false,
				removed: false
			}))
		)

		const foodsIndexed = pipe(
			foods,
			RoM.toReadonlyArray(S.Ord),
			RoA.map(RoT.fst)
		)

		return {
			deleting: state.deleting,
			loading: false,
			selected: pipe(
				state.selected,
				RoS.filter(id => RoM.member(S.Eq)(id)(model.foods))
			),
			foods: {
				indexed: foods,
				sorted: foodsIndexed
			}
		}
	}

const init: FoodsPageState = {
	deleting: new Set(),
	loading: true,
	selected: new Set(),
	foods: {
		indexed: new Map(),
		sorted: []
	}
}

const enqueueDeleteFoodItem =
	(id: string) =>
	(state: FoodsPageState): FoodsPageState => {
		const indexed = pipe(
			state.foods.indexed,
			RoM.modifyAt(S.Eq)(id, item => ({
				...item,
				deleting: true
			})),
			Opt.getOrElse(() => state.foods.indexed)
		)

		const sorted = pipe(indexed, RoM.toReadonlyArray(S.Ord), RoA.map(RoT.fst))

		return {
			...state,
			deleting: pipe(state.deleting, RoS.insert(S.Eq)(id)),
			foods: {
				...state.foods,
				indexed,
				sorted
			}
		}
	}

const deleteFoodItems = (state: FoodsPageState): FoodsPageState => {
	const indexed = pipe(
		state.deleting,
		RoS.reduce(S.Ord)(state.foods.indexed, (map, id) =>
			pipe(map, RoM.deleteAt(S.Eq)(id))
		)
	)

	const sorted = pipe(indexed, RoM.toReadonlyArray(S.Ord), RoA.map(RoT.fst))

	return {
		...state,
		deleting: new Set(),
		foods: {
			...state.foods,
			indexed,
			sorted
		}
	}
}

type VirtualItemState = {
	virtual: VirtualItem
	food: FoodItemState
	deletingItemsNumber: number
}

export function FoodsPage(): JSX.Element {
	const [state, setState] = useState<FoodsPageState>(() => init)

	const {
		useCases: { foodsPageModel$ },
		title
	} = useGlobalContext()

	useSubscription(foodsPageModel$, flow(loadFoodPage, setState))

	const rowVirtualizer = useWindowVirtualizer({
		count: state.foods.indexed.size,
		estimateSize: () => 90,
		overscan: 10
	})

	const onSwipeRight = flow(enqueueDeleteFoodItem, setState)

	useEffect(() => {
		if (RoS.size(state.deleting) <= 0) {
			return
		}

		const timeout = setTimeout(() => pipe(deleteFoodItems, setState), 1000)

		return () => clearTimeout(timeout)
	}, [state.deleting.size > 0])

	const partitionedFoods = pipe(
		rowVirtualizer.getVirtualItems(),
		RoA.reduce<VirtualItem, [number, VirtualItemState[]]>(
			[0, []],
			([deletingItemsNumber, items], item) =>
				pipe(
					state.foods.sorted,
					RoA.lookup(item.index),
					Opt.chain(id => pipe(state.foods.indexed, RoM.lookup(S.Eq)(id))),
					Opt.map(food =>
						food.deleting
							? ([
									deletingItemsNumber + 1,
									[
										...items,
										{
											virtual: item,
											food,
											deletingItemsNumber: deletingItemsNumber + 1
										}
									]
							  ] as [number, VirtualItemState[]])
							: ([
									deletingItemsNumber,
									[
										...items,
										{
											virtual: item,
											food,
											deletingItemsNumber
										}
									]
							  ] as [number, VirtualItemState[]])
					),
					Opt.getOrElse(() => [deletingItemsNumber, items])
				)
		),
		RoT.snd
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
						element.food.deleting ? (
							<li
								key={element.food.id}
								style={{
									transform: `translateY(${
										element.virtual.start -
										element.deletingItemsNumber * element.virtual.size
									}px)`
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
									height: element.virtual.size,
									transform: `translateY(${
										element.virtual.start -
										element.deletingItemsNumber * element.virtual.size
									}px)`
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

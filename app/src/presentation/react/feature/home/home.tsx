import { VirtualItem, useWindowVirtualizer } from '@tanstack/react-virtual'
import * as I from 'fp-ts/Identity'
import * as Opt from 'fp-ts/Option'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as RoM from 'fp-ts/ReadonlyMap'
import * as RoS from 'fp-ts/ReadonlySet'
import * as RoT from 'fp-ts/ReadonlyTuple'
import { flow, pipe } from 'fp-ts/function'
import { useObservableState, useSubscription } from 'observable-hooks'
import { useMemo, useReducer } from 'react'

import { FoodModel } from '@/application/usecases/food-overview'

import { useGlobalContext } from '@/presentation/react/feature/app/app'
import { AddFab } from '@/presentation/react/feature/shared/fab-add-button'
import { Swipable } from '@/presentation/react/feature/shared/swipable'
import { Title } from '@/presentation/react/feature/shared/title'
import { Transition } from '@/presentation/react/feature/shared/transition'

interface FoodState {
	readonly name: string
	readonly id: FoodModel['id']
}

interface FoodPageState {
	readonly loading: boolean
	readonly foods: Readonly<{
		byId: ReadonlyMap<FoodState['id'], FoodState>
		sorted: ReadonlyArray<FoodState['id']>
		deleting: ReadonlySet<FoodState['id']>
		selected: ReadonlySet<FoodState['id']>
	}>
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

type Action =
	| Readonly<{ type: 'loadPage' }>
	| Readonly<{ type: 'enqueueFoodDeletion'; id: FoodState['id'] }>
	| Readonly<{ type: 'deleteFoods' }>

export function FoodsPage(): JSX.Element {
	const {
		useCases: { foodOverview },
		title
	} = useGlobalContext()

	const output = useObservableState(foodOverview)
	const isLoading = !output || output._tag === 'Loading'

	const rowVirtualizer = useWindowVirtualizer(
		output && output._tag === 'Ready'
			? {
					count: output.foods.length,
					estimateSize: () => 90,
					overscan: 10
			  }
			: {
					count: 0,
					estimateSize: () => 0,
					overscan: 0
			  }
	)

	const onSwipeRight = (id: FoodState['id']) => {
		foodOverview.next({ sort: 'name', page: 0 })
	}

	const items: readonly VirtualItem[] = rowVirtualizer.getVirtualItems()

	const virtualFoods = useMemo(
		() =>
			output && output._tag === 'Ready'
				? pipe(
						items,
						RoA.map(virtual => ({
							size: virtual.size,
							position: virtual.start,
							food: output.foods[virtual.index] ?? {
								id: '',
								expDate: 0,
								name: 'undefined',
								state: 'expired' as const
							}
						}))
				  )
				: [],
		[output, items]
	)

	return (
		<Transition loading={isLoading}>
			<div className="h-full bg-gray-100">
				<Title text={title} />
				<ul
					style={{
						height: rowVirtualizer.getTotalSize()
					}}
					className={`relative w-full overflow-hidden pt-14`}>
					{virtualFoods.map(element => (
						<li
							key={element.food.id}
							style={{
								height: element.size,
								transform: `translateY(${element.position}px)`
							}}
							className={`absolute left-0 top-0 w-full transition-transform duration-1000`}>
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
					))}
				</ul>
				<div>
					<AddFab onClick={() => null} label="Add Food" />
				</div>
			</div>
		</Transition>
	)
}

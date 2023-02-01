import {
	VirtualItem,
	useVirtualizer,
	useWindowVirtualizer
} from '@tanstack/react-virtual'
import * as Opt from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as RoM from 'fp-ts/ReadonlyMap'
import * as RoS from 'fp-ts/ReadonlySet'
import * as RoT from 'fp-ts/ReadonlyTuple'
import { flow, pipe } from 'fp-ts/function'
import * as S from 'fp-ts/string'
import { useSubscription } from 'observable-hooks'
import { useEffect, useRef, useState } from 'react'

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
	readonly foods: ReadonlyMap<string, FoodItemState>
}

const combineState: (
	model: FoodsPageModel
) => (state: FoodsPageState) => FoodsPageState = model => state => ({
	deleting: state.deleting,
	loading: false,
	selected: pipe(
		state.selected,
		RoS.filter(id => RoM.member(S.Eq)(id)(model.foods))
	),
	foods: pipe(
		model.foods,
		RoM.map(({ name, id }) => ({
			name,
			id,
			deleting: false,
			selected: false,
			removed: false
		}))
	)
})

const init: FoodsPageState = {
	deleting: new Set(),
	loading: true,
	selected: new Set(),
	foods: new Map()
}

export function FoodsPage(): JSX.Element {
	const [state, setState] = useState<FoodsPageState>(() => init)

	const {
		useCases: { foodsPageModel$ },
		title
	} = useGlobalContext()

	useSubscription(foodsPageModel$, flow(combineState, setState))

	const rowVirtualizer = useWindowVirtualizer({
		count: state.foods.size,
		estimateSize: () => 90
	})

	const onSwipeRight: (id: string) => () => void = id => () => {
		setState(state => ({
			...state,
			deleting: pipe(state.deleting, RoS.insert(S.Eq)(id)),
			foods: pipe(
				state.foods,
				RoM.modifyAt(S.Eq)(id, item => ({
					...item,
					deleting: true
				})),
				Opt.getOrElse(() => state.foods)
			)
		}))
	}

	useEffect(() => {
		if (RoS.size(state.deleting) <= 0) {
			return
		}

		const timeout = setTimeout(() => {
			setState(state => ({
				...state,
				foods: pipe(
					state.deleting,
					RoS.reduce(S.Ord)(state.foods, (map, id) =>
						pipe(map, RoM.deleteAt(S.Eq)(id))
					)
				)
			}))
		}, 1000)

		return () => clearTimeout(timeout)
	}, [state.deleting])

	const foods = pipe(
		state.foods,
		RoM.toReadonlyArray(Ord.trivial),
		RoA.map(RoT.snd)
	)

	const partitionedFoods: readonly {
		virtual: VirtualItem
		food: FoodItemState
	}[] = pipe(
		rowVirtualizer.getVirtualItems(),
		RoA.filterMap(item =>
			pipe(
				foods,
				RoA.lookup(item.index),
				Opt.map(food => ({ virtual: item, food }))
			)
		)
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
					{partitionedFoods.map(element => (
						<li
							key={element.virtual.key}
							style={{
								height: element.virtual.size,
								transform: `translateY(${element.virtual.start}px)`
							}}
							className={`absolute top-0 left-0 w-full transition-height duration-1000`}>
							<div className="translate-x-0 transition-transform duration-500 ">
								<Swipable onRight={onSwipeRight?.(element.food.id)}>
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

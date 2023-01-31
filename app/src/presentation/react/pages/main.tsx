import classnames from 'classnames'
import * as Opt from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
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
	readonly deleting: string[]
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
	deleting: [],
	loading: true,
	selected: new Set(),
	foods: new Map()
}

const mapFoods: <A>(
	f: (state: FoodItemState) => A
) => (record: ReadonlyMap<string, FoodItemState>) => readonly A[] = f =>
	flow(RoM.toReadonlyArray(Ord.trivial), RoA.map(RoT.snd), RoA.map(f))

export function FoodsPage(): JSX.Element {
	const [state, setState] = useState<FoodsPageState>(() => init)

	const {
		useCases: { foodsPageModel$ },
		title
	} = useGlobalContext()

	useSubscription(foodsPageModel$, data => setState(combineState(data)))

	const onSwipeRight: (id: string) => () => void = id => () => {
		setState(state => ({
			...state,
			deleting: [...state.deleting, id],
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
		if (state.deleting.length <= 0) {
			return
		}

		const timeout = setTimeout(() => {
			setState(state => ({
				...state,
				foods: pipe(state.foods, RoM.deleteAt(S.Eq)(id))
			}))
		}, 1000)

		return () => clearTimeout(timeout)
	}, state.deleting)

	return (
		<Transition loading={state.loading}>
			<div className="h-full bg-gray-100">
				<Title text={title} />
				<ul className="overflow-hidden pt-14">
					{mapFoods(food => (
						<li
							key={food.id}
							className={classnames(
								'transition-height duration-500',
								food.deleting ? 'max-h-0' : 'max-h-64'
							)}
						>
							<div
								style={{
									transform: `translateX(${food.deleting ? '2000' : '0'}px)`
								}}
								className={classnames('transition-transform duration-500')}
							>
								<Swipable onRight={onSwipeRight(food.id)}>
									<li
										key={food.id}
										className="mx-2 mb-2 bg-white p-3 shadow-md sm:pb-4"
										style={{
											height: '70px'
										}}
									>
										<div className="flex items-center space-x-4">
											<div className="min-w-0 flex-1">
												<p className="truncate pb-2 text-sm font-medium text-gray-900 dark:text-white">
													{food.name}
												</p>
												<div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
													<div
														className="h-2.5 rounded-full bg-blue-600"
														style={{
															width: '45%'
														}}
													/>
												</div>
											</div>
										</div>
									</li>
								</Swipable>
							</div>
						</li>
					))(state.foods)}
				</ul>
				<div className="">
					<AddFab
						onClick={() => null}
						label="Add Food"
					/>
				</div>
			</div>
		</Transition>
	)
}

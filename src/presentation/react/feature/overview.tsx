import { VirtualItem, useWindowVirtualizer } from '@tanstack/react-virtual'
import * as RoA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import { useObservableState } from 'observable-hooks'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { useGlobalContext } from '@/presentation/react/feature/app'
import { AddFab } from '@/presentation/react/feature/shared/fab-add-button'
import { Title } from '@/presentation/react/feature/shared/title'

export function FoodOverview(): JSX.Element {
	const {
		useCases: { foodOverview },
		title
	} = useGlobalContext()

	const output = useObservableState(foodOverview.observable)
	useEffect(() => foodOverview.next({ sort: 'date', page: 0 }), [foodOverview])

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
		<div className="h-full bg-gray-100">
			<Title text={title} />
			<ul
				style={{
					height: rowVirtualizer.getTotalSize()
				}}
				className={`relative top-14 w-full overflow-hidden pt-14`}
			>
				{virtualFoods.map(element => (
					<li
						key={element.food.id}
						style={{
							touchAction: 'none',
							height: element.size,
							transform: `translateY(${element.position}px)`
						}}
						className={`absolute left-0 top-0 w-full`}
					>
						<Link to={`/foods/${element.food.id}`}>
							<div className="translate-x-0">
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
							</div>
						</Link>
					</li>
				))}
			</ul>
			<AddFab
				onClick={() => null}
				label="Add Food"
			/>
		</div>
	)
}

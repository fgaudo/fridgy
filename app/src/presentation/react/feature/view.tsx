import {
	Tab,
	TabPanel,
	Tabs,
	TabsBody,
	TabsHeader
} from '@material-tailwind/react'
import { animated, useSprings } from '@react-spring/web'
import { VirtualItem, useWindowVirtualizer } from '@tanstack/react-virtual'
import { useDrag } from '@use-gesture/react'
import * as RoA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import { useObservableState } from 'observable-hooks'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useGlobalContext } from '@/presentation/react/feature/app'
import { AddFab } from '@/presentation/react/feature/shared/fab-add-button'
import { Swipable } from '@/presentation/react/feature/shared/swipable'
import { Title } from '@/presentation/react/feature/shared/title'
import { Transition } from '@/presentation/react/feature/shared/transition'

export function FoodView(): JSX.Element {
	const { title } = useGlobalContext()

	return (
		<div>
			<div className="p-3 sm:col-span-3">
				<label
					htmlFor="first-name"
					className="block text-sm font-medium leading-6 text-gray-900">
					Name
				</label>
				<div className="mt-2">
					<input
						type="text"
						name="first-name"
						id="first-name"
						autoComplete="given-name"
						placeholder="e.g. Milk"
						className="block w-full rounded-md border-0 p-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>
			</div>

			<div className="p-3 sm:col-span-3">
				<label
					htmlFor="first-name"
					className="block text-sm font-medium leading-6 text-gray-900">
					Quantity
				</label>
				<div className="mt-2">
					<input
						type="number"
						name="first-name"
						id="first-name"
						autoComplete="given-name"
						placeholder="e.g. 3"
						className="block w-full rounded-md border-0 p-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>
			</div>

			<div className="p-3 sm:col-span-3">
				<label
					htmlFor="exp-date"
					className="block text-sm font-medium leading-6 text-gray-900">
					Expiration date
				</label>
				<div className="mt-2">
					<input
						className="block w-full rounded-md border-0 p-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
						type="date"
						placeholder="expiration date"
					/>
				</div>
			</div>

		</div>
	)
}

import { pipe } from 'effect/Function'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'

import * as SM from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { InternalMessage } from './message.ts'
import type { State } from './state.ts'

const hasFreshProducts = (
	products: (State['productListStatus'] & { _tag: 'Available' })['products'],
): boolean =>
	products.some(
		product => product._tag === 'Valid' && product.status._tag === 'Fresh',
	)

const fetchListStream = (version: number) =>
	pipe(
		Stream.make(InternalMessage.FetchListTick({ version })),
		Stream.schedule(Schedule.spaced('1 second')),
		Stream.forever,
	)

export const fetchListScheduler: SM.Subscription<
	State,
	InternalMessage,
	UC.All
> = {
	init: state => {
		if (!state.isSchedulerEnabled) {
			return SM.keyedEmptyStream
		}

		if (state.productListStatus._tag !== 'Available') {
			return SM.keyedEmptyStream
		}

		if (!hasFreshProducts(state.productListStatus.products)) {
			return SM.keyedEmptyStream
		}

		return {
			key: true,
			stream: fetchListStream(state.fetchListSchedulerVersion),
		}
	},

	update: ({ current, previous, active }) => {
		if (!current.isSchedulerEnabled) {
			return SM.keyedEmptyStream
		}

		if (current.productListStatus._tag !== 'Available') {
			return SM.keyedEmptyStream
		}

		if (current.productListStatus === previous.productListStatus) {
			return active
		}

		if (
			current.productListStatus._tag === previous.productListStatus._tag &&
			current.productListStatus.products === previous.productListStatus.products
		) {
			return active
		}

		if (!hasFreshProducts(current.productListStatus.products)) {
			return SM.keyedEmptyStream
		}

		return {
			key: true,
			stream: fetchListStream(current.fetchListSchedulerVersion),
		}
	},
}

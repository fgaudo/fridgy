import { pipe } from 'effect/Function'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'

import * as SM from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { HOME_SCHEDULER_FREQUENCY } from '$lib/constants.ts'

import { InternalMessage } from './message.ts'
import {
	FetchListSchedulerVersion,
	type State,
	hasFreshProducts,
	isSchedulerEnabled,
} from './state.ts'

const fetchListStream = (version: FetchListSchedulerVersion) =>
	pipe(
		Stream.make(InternalMessage.FetchListTick({ version })),
		Stream.schedule(Schedule.spaced(HOME_SCHEDULER_FREQUENCY)),
		Stream.forever,
	)

export const fetchListScheduler: SM.Subscription<
	State,
	InternalMessage,
	UC.All
> = {
	init: state => {
		if (!isSchedulerEnabled(state)) {
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
		if (!isSchedulerEnabled(current)) {
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

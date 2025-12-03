import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'

import * as SM from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { HOME_SCHEDULER_FREQUENCY } from '$lib/constants.ts'

import { Message } from './message.ts'
import * as State from './state.ts'

const fetchListStream = (version: State.FetchListSchedulerVersion) =>
	pipe(
		Stream.make(Message.FetchListTick({ version })),
		Stream.mapEffect(() =>
			Effect.sync(() => {
				throw new Error()
			}),
		),
		Stream.schedule(Schedule.spaced(HOME_SCHEDULER_FREQUENCY)),
		Stream.forever,
	)

export const fetchListScheduler: SM.Subscription<State.State, Message, UC.All> =
	{
		init: state => {
			if (!State.isInAvailable(state)) {
				return SM.keyedEmptyStream
			}

			if (State.isDeleting(state) || State.isManualFetching(state)) {
				return SM.keyedEmptyStream
			}

			if (!State.hasFreshProducts(state)) {
				return SM.keyedEmptyStream
			}

			return {
				key: true,
				stream: fetchListStream(state.fetchListSchedulerVersion),
			}
		},

		update: ({ current, previous, active }) => {
			if (!State.isInAvailable(current)) {
				return SM.keyedEmptyStream
			}

			if (State.isDeleting(current) || State.isManualFetching(current)) {
				return SM.keyedEmptyStream
			}

			if (current.productListStatus === previous.productListStatus) {
				return active
			}

			if (
				current.productListStatus._tag === previous.productListStatus._tag &&
				current.productListStatus.products ===
					previous.productListStatus.products
			) {
				return active
			}

			if (!State.hasFreshProducts(current)) {
				return SM.keyedEmptyStream
			}

			return {
				key: true,
				stream: fetchListStream(current.fetchListSchedulerVersion),
			}
		},
	}

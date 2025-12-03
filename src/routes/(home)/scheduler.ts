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
		Stream.schedule(Schedule.spaced(HOME_SCHEDULER_FREQUENCY)),
		Stream.forever,
	)

export const fetchListScheduler: SM.Subscription<State.State, Message, UC.All> =
	{
		init: state => {
			if (!State.isSchedulerFetchingAllowed(state)) {
				return SM.keyedEmptyStream
			}

			return {
				key: true,
				stream: fetchListStream(state.fetchListSchedulerVersion),
			}
		},

		update: ({ current }) => {
			if (!State.isSchedulerFetchingAllowed(current)) {
				return SM.keyedEmptyStream
			}

			return {
				key: true,
				stream: fetchListStream(current.fetchListSchedulerVersion),
			}
		},
	}

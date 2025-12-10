import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'

import * as SM from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { HOME_SCHEDULER_FREQUENCY } from './constants.ts'
import { Message } from './message.ts'
import * as State from './state.ts'

const fetchListStream = (version: State.FetchListSchedulerVersion) =>
	pipe(
		Stream.make(Message.FetchListTick({ version })),
		Stream.schedule(Schedule.spaced(HOME_SCHEDULER_FREQUENCY)),
		Stream.forever,
	)

export const subscriptions: SM.Subscriptions<
	State.State,
	Message,
	UC.All
> = state => {
	let map = HashMap.empty<unknown, Stream.Stream<Message, never, UC.All>>()

	if (State.isSchedulerFetchingAllowed(state)) {
		map = HashMap.set(
			map,
			'fetchList',
			fetchListStream(state.fetchListSchedulerVersion),
		)
	}

	return map
}

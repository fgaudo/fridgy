import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'

import { UseCases as UC } from '@/business/index.ts'
import * as SM from '@/core/state-manager.ts'

import { HOME_SCHEDULER_FREQUENCY } from './constants.ts'
import { Message } from './message.ts'
import * as State from './state.ts'

const fetchListStream = (version: State.FetchListSchedulerVersion) =>
	pipe(
		Stream.make(Message.FetchListTick({ version })),
		Stream.schedule(Schedule.spaced(HOME_SCHEDULER_FREQUENCY)),
		Stream.forever,
	)

export const evaluateSubscriptions: (
	state: State.State,
) => SM.Subscriptions<Message, UC.All> = state => {
	if (!State.isSchedulerFetchingAllowed(state)) {
		return SM.emptySubscription
	}

	return HashMap.make([
		state.fetchListSchedulerVersion,
		fetchListStream(state.fetchListSchedulerVersion),
	])
}

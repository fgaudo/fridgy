import * as Effect from 'effect/Effect'
import { flow } from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Stream from 'effect/Stream'

import * as SM from '@/core/state-manager.ts'
import type { ViewModel } from '@/core/viewmodel.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { InternalMessage, Message } from './message.ts'
import * as Scheduler from './scheduler.ts'
import {
	FetchListSchedulerVersion,
	FetchListVersion,
	type State,
	isLoadingData,
} from './state.ts'
import { update } from './update.ts'

const initState: State = {
	fetchListVersion: FetchListVersion.make(0),
	fetchListSchedulerVersion: FetchListSchedulerVersion.make(0),
	isFetching: false,
	isManualFetching: false,
	isDeleting: false,
	productListStatus: { _tag: 'Initial' },
}

const makeViewModel: Effect.Effect<
	ViewModel<
		State,
		Message,
		'DeleteSucceededButRefreshFailed' | 'DeleteAndRefreshFailed',
		UC.All
	>
> = Effect.gen(function* () {
	const stateManager = yield* SM.makeStateManager({
		subscriptions: [Scheduler.fetchListScheduler],
		initState,
		initMessages: [InternalMessage.StartFetchList()],
		fatalMessage: error => InternalMessage.Crash({ error }),
		fatalMessageSubscription: error => InternalMessage.Crash({ error }),
		update,
	})

	return {
		...stateManager,
		initState,
		messages: Stream.filterMap(
			stateManager.messages,
			flow(
				Match.value,
				Match.tags({
					DeleteAndRefreshFailed: ({ _tag }) => Option.some(_tag),
					DeleteSucceededButRefreshFailed: ({ _tag }) => Option.some(_tag),
				}),
				Match.orElse(() => Option.none()),
			),
		),
	}
})

export { makeViewModel, Message, isLoadingData }

import * as Effect from 'effect/Effect'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'

import { runStateManager } from '../../core/state-manager.ts'
import type { State } from './state.ts'
import { InternalMessage, Message, update } from './update.ts'

export const runViewModel = Effect.gen(function* () {
	const stateManager = yield* runStateManager({
		initState: {} as State,
		update,
		subscriptions: () =>
			Stream.mergeAll(
				[
					Stream.fromSchedule(Schedule.fixed(`3 seconds`)).pipe(
						Stream.as(InternalMessage.FetchList()),
					),
					Stream.fromSchedule(Schedule.fixed(`3 seconds`)).pipe(
						Stream.as(InternalMessage.FetchList()),
					),
				],
				{ concurrency: `unbounded` },
			),
		fatalMessage: err => InternalMessage.Crash({ message: err }),
	})

	return {
		changes: stateManager.changes,
		listen: Effect.gen(function* () {
			const { dispatch, dispose } = yield* stateManager.listen

			return {
				dispose,
				dispatch: (m: Message) => dispatch(m),
			}
		}),
	}
})

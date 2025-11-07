import * as Effect from 'effect/Effect'

import type { ViewModel } from '$lib/core.ts'

import { runStateManager } from '$lib/helpers.ts'

import { type State } from './state.svelte.ts'
import { Message, update } from './update.svelte.ts'

export const makeViewModel: Effect.Effect<ViewModel<State, Message>> =
	Effect.gen(function* () {
		const stateManager = yield* runStateManager({} as State, update, err =>
			Message.Crash({ message: err }),
		)

		return {
			changes: stateManager.changes,
			listen: Effect.gen(function* () {
				return yield* stateManager.listen
			}),
		}
	})

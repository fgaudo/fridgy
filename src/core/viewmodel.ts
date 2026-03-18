import * as Effect from 'effect/Effect'
import * as Scope from 'effect/Scope'

import type { StateManager } from './state-manager.ts'

export type ViewModel<S, M, R, K> = {
	init: S
	make: Effect.Effect<StateManager<S, M, R, K>, never, Scope.Scope>
}

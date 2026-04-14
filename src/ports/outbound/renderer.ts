import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type { VNode } from 'snabbdom'

export class Renderer extends Context.Service<
	Renderer,
	(view: VNode) => Effect.Effect<void>
>()('8811653853a1b7b1') {}

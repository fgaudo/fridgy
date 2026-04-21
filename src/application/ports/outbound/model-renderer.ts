import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Stream from 'effect/Stream'

import type { Model } from '@/app/core/model.ts'

export class Renderer extends Context.Service<
	Renderer,
	(model$: Stream.Stream<Model>) => Effect.Effect<void>
>()('868728ce6feafe32') {}

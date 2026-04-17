import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'

import type { Model } from './pages/model.ts'

export class ModelEmitter extends Context.Service<
	ModelEmitter,
	Stream.Stream<Model>
>()('171a1af070d0e515') {}

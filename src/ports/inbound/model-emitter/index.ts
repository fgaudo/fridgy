import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'

import type { Model } from './model.ts'

export class ModelEmitter extends Context.Service<
	ModelEmitter,
	Stream.Stream<Model>
>()('dfaaaf47b6d191e6') {}

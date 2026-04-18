import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'

import type { Model } from '@/app/core/model.ts'

export class ModelEmitter extends Context.Service<
	ModelEmitter,
	Stream.Stream<Model>
>()('23d12c75c163961a') {}

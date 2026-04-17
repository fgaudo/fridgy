import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'

import type { Model } from '@/app/model/root.ts'

export class Renderer extends Context.Service<
	Renderer,
	(view: Model) => Stream.Stream<void>
>()('299c282976c8ceb6') {}

import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class ToastService extends Context.Service<
	ToastService,
	{ show: (text: string) => Effect.Effect<void> }
>()('f547503bf6adb68b') {}

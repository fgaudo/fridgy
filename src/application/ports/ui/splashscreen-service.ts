import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class SplashScreenService extends Context.Service<
	SplashScreenService,
	{ hide: Effect.Effect<void> }
>()('8fa7107077a7e410') {}

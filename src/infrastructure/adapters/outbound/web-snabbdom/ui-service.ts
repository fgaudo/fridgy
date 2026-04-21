import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class UiService extends Context.Service<
	UiService,
	{
		showToast: (text: string) => Effect.Effect<void>
		hideSplashScreen: Effect.Effect<void>
		invalidateUi: Effect.Effect<void>
	}
>()('40684680775332b1') {}

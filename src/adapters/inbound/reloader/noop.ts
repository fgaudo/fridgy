import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as SubscriptionRef from 'effect/SubscriptionRef'

import { Reloader } from '../../../ports/inbound/reloader.ts'

export const NoOpReloader = Layer.effect(
	Reloader,
	Effect.gen(function* () {
		const { view: staticView } = yield* Effect.promise(
			() => import('./ui/pages/view.ts'),
		)
		const view = yield* SubscriptionRef.make(staticView)

		return {
			changes: SubscriptionRef.changes(view),
		}
	}),
)

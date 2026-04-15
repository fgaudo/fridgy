import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'

import { UiModuleEmitter } from '@/ports/inbound/ui-module-emitter.ts'

export const layer = Layer.effect(
	UiModuleEmitter,
	Effect.gen(function* () {
		const { view } = yield* Effect.promise(() => import('@/ui/pages/view.ts'))

		return Stream.make({ view })
	}),
)

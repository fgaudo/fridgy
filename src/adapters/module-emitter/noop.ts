import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'

import { ModuleEmitter } from '@/ports/outbound/module-emitter.ts'

export const noopModuleEmitter = Layer.effect(
	ModuleEmitter,
	Effect.gen(function* () {
		const { view: staticView } = yield* Effect.promise(
			() => import('@/ui/pages/view.ts'),
		)

		return Stream.make(staticView)
	}),
)

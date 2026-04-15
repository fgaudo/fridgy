import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'

import { safeImport } from '@/core/safe.ts'
import {
	UiModuleEmitter,
	type UiModule,
} from '@/ports/inbound/ui-module-emitter.ts'

export const layer = (path: string) =>
	Layer.effect(
		UiModuleEmitter,
		Effect.gen(function* () {
			const module = (yield* safeImport(path)) as UiModule
			return Stream.make(module)
		}),
	)

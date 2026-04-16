import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'

import {
	UiModuleEmitter,
	type UiModule,
} from '@/app/ports/inbound/ui-module-emitter.ts'
import { safeImport } from '@/core/safe.ts'

export const layer = (path: string) =>
	Layer.effect(
		UiModuleEmitter,
		Effect.gen(function* () {
			const module = (yield* safeImport(path)) as UiModule
			return Stream.make(module)
		}),
	)

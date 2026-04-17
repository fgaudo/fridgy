import * as Effect from 'effect/Effect'

import { View } from '@/app/ports/renderer.ts'
import type { Model } from '@/app/ports/state-manager/model-emitter/pages/model.ts'
import type { UiModule } from '@/app/ports/ui-module-emitter.ts'

import * as Root from './pages/view.tsx'

export const makeUi: UiModule['makeUi'] = Effect.gen(function* () {
	const view = yield* Root.makeView
	return (model: Model) => View.set(view(model))
})

import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import * as GetLicenses from '@/infra/adapters/get-licenses/index.ts'
import * as GetSayings from '@/infra/adapters/get-sayings/index.ts'
import { hotLayer, staticLayer } from '@/infra/adapters/renderer/index.ts'

export const UiLayer = Layer.unwrap(
	Effect.gen(function* () {
		if (process.env.NODE_ENV === 'production') {
			return staticLayer
		}
		return hotLayer
	}),
).pipe(Layer.provide([GetSayings.layer, GetLicenses.layer]))

import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import * as GetLicenses from '@/infra/adapters/outbound/static/licenses/adapter.ts'
import * as GetSayings from '@/infra/adapters/outbound/static/sayings/adapter.ts'
import {
	hotLayer,
	staticLayer,
} from '@/infra/adapters/outbound/web-snabbdom/adapter.ts'

export const UiLayer = Layer.unwrap(
	Effect.gen(function* () {
		if (process.env.NODE_ENV === 'production') {
			return staticLayer
		}
		return hotLayer
	}),
).pipe(Layer.provide([GetSayings.layer, GetLicenses.layer]))

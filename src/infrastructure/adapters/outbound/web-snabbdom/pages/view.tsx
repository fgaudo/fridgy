import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Match from 'effect/Match'

import type { Model } from '@/app/core/model.ts'
import { UiService } from '@/infra/adapters/outbound/web-snabbdom/ui-service.ts'

import * as Home from './home/view.tsx'

export const makeView = Effect.gen(function* () {
	const run = yield* FiberSet.makeRuntime()
	const homeView = yield* Home.makeView
	const { hideSplashScreen } = yield* UiService
	return (model: Model) => {
		return (
			<div>
				{Match.valueTags(model.currentPage, {
					AddProduct: () => <div className="text-2xl text-white"></div>,
					Home: ({ model }) => homeView(model),
				})}
				<div
					$key="static"
					$hook={{
						insert: () => run(hideSplashScreen),
					}}
				></div>
			</div>
		)
	}
}).pipe(Effect.scoped)

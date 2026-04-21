import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Match from 'effect/Match'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'

import type { Model } from '@/app/core/model.ts'
import { UiService } from '@/infra/adapters/outbound/web-snabbdom/ui-service.ts'

import * as Home from './home/view.tsx'

export const makeView = Effect.gen(function* () {
	const run = yield* FiberSet.makeRuntime()
	const homeView = yield* Home.makeView
	const { hideSplashScreen, invalidateUi } = yield* UiService
	let i = 0
	const lol = yield* Scope.Scope
	yield* Scope.addFinalizer(lol, Effect.log('gc'))
	yield* Stream.tick('1 second').pipe(
		Stream.tap(() =>
			Effect.sync(() => {
				i++
			}),
		),
		Stream.runForEach(() => invalidateUi),
		Effect.forkScoped,
	)
	return (model: Model) => {
		return (
			<div>
				{Match.valueTags(model.currentPage, {
					AddProduct: () => <div className="text-2xl text-white"></div>,
					Home: ({ model }) => homeView(model),
				})}
				<div>{i}-+-+-+-+132245</div>
				<div
					$key="static"
					$hook={{
						insert: () => run(hideSplashScreen),
					}}
				></div>
			</div>
		)
	}
})

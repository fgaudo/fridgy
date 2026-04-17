import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

export const DbLayer = Layer.unwrap(
	Effect.gen(function* () {
		const Sqlite = yield* Effect.promise(
			() => import('@/infra/adapters/product-repo/sqlite.ts'),
		)
		return Sqlite.layer('./sqlite-worker.js')
	}),
).pipe(Layer.orDie)

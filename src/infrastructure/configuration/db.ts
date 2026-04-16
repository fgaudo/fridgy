import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

export const DbLayer = Layer.unwrap(
	Effect.gen(function* () {
		const workerPath = yield* Config.string('SQLITE_WORKER_PATH')
		const Sqlite = yield* Effect.promise(
			() => import('@/infra/adapters/product-repo/sqlite.ts'),
		)
		return Sqlite.layer(workerPath)
	}),
).pipe(Layer.orDie)

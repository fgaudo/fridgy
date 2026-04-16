import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

export const DbLayer = Layer.unwrap(
	Effect.gen(function* () {
		if (process.env.NODE_ENV === 'production') {
			const workerUrl = yield* Config.string('SQLITE_WORKER_URL')
			const Sqlite = yield* Effect.promise(
				() => import('@/infra/adapters/product-repo/sqlite.ts'),
			)
			return Sqlite.layer(workerUrl)
		}
		const InMemory = yield* Effect.promise(
			() => import('@/infra/adapters/product-repo/in-memory.ts'),
		)
		return InMemory.layer
	}),
).pipe(Layer.orDie)

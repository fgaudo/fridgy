import * as EffBun from '@effect/platform-bun'
import * as Bun from 'bun'
import * as Effect from 'effect/Effect'
import * as Path from 'effect/Path'

import index from '../src/index.html'
const metaDir = Effect.sync(() => import.meta.dir)

EffBun.BunRuntime.runMain(
	Effect.gen(function* () {
		const path = yield* Path.Path
		const currentDir = yield* metaDir
		yield* Effect.promise(() =>
			Bun.build({
				entrypoints: [path.join(currentDir, '../src/sqlite-worker.ts')],
				outdir: path.join(currentDir, '../dist'),
			}),
		)
		yield* Effect.sync(() =>
			Bun.serve({
				development: true,
				port: 3000,
				routes: {
					'/wa-sqlite.wasm': Bun.file(
						path.join(
							currentDir,
							'../node_modules/@effect/wa-sqlite/dist/wa-sqlite.wasm',
						),
					),
					'/index.html': index,
					'/sqlite-worker.js': Bun.file(
						path.join(currentDir, '../dist/sqlite-worker.js'),
					),
				},
			}),
		)
	}).pipe(
		Effect.scoped,
		Effect.provide([EffBun.BunPath.layer, EffBun.BunFileSystem.layer]),
	),
)

import * as EffBun from '@effect/platform-bun'
import P from 'bun-plugin-tailwind'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import * as Path from 'effect/Path'

const metaDir = Effect.sync(() => import.meta.dir)

await Effect.runPromise(
	Effect.gen(function* () {
		const path = yield* Path.Path
		const fs = yield* FS.FileSystem
		const currentDir = yield* metaDir

		yield* fs.remove(path.join('currentDir', '../dist'), {
			force: true,
			recursive: true,
		})
		yield* Effect.promise(() =>
			Bun.build({
				entrypoints: [
					path.join(currentDir, '../src/sqlite-worker.ts'),
					path.join(currentDir, '../src/index.html'),
				],
				outdir: path.join(currentDir, '../dist'),
				plugins: [P],
			}),
		)

		yield* fs.copyFile(
			path.join(
				currentDir,
				'../node_modules/@effect/wa-sqlite/dist/wa-sqlite.wasm',
			),
			path.join(currentDir, '../dist/wa-sqlite.wasm'),
		)
	}).pipe(
		Effect.scoped,
		Effect.provide([EffBun.BunFileSystem.layer, EffBun.BunPath.layer]),
	),
)

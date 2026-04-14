import * as EffBun from '@effect/platform-bun'
import P from 'bun-plugin-tailwind'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import * as Path from 'effect/Path'
import * as Stream from 'effect/Stream'

const metaDir = Effect.sync(() => import.meta.dir)

const build = Effect.gen(function* () {
	const path = yield* Path.Path
	const currentDir = yield* metaDir

	yield* Effect.promise(() =>
		Bun.build({
			target: 'browser',
			entrypoints: [
				path.join(currentDir, '../src/sqlite-worker.ts'),
				path.join(currentDir, '../src/ui/pages/view.ts'),
				path.join(currentDir, '../src/app.ts'),
			],
			outdir: path.join(currentDir, '../dist'),
			plugins: [P],
			loader: { '.css': 'css' },
			naming: {
				// default values
				entry: '[name].[ext]',
				chunk: '[name].[ext]',
				asset: '[name].[ext]',
			},
			external: ['*.woff2'],
		}),
	)
})

const server = Bun.serve({
	port: 3000,
	fetch(req, server) {
		if (server.upgrade(req)) return
		return new Response('HMR Server Active')
	},
	websocket: {
		open(ws) {
			ws.subscribe('refresh')
		},
		message() {},
	},
})

const publish = Effect.sync(() => server.publish('refresh', 'reload-page'))

await Effect.runPromise(
	Effect.gen(function* () {
		const path = yield* Path.Path
		const fs = yield* FS.FileSystem
		const currentDir = yield* metaDir
		yield* fs.remove(path.join(currentDir, '../dist'), {
			force: true,
			recursive: true,
		})
		yield* build
		yield* fs.copyFile(
			path.join(
				currentDir,
				'../node_modules/@effect/wa-sqlite/dist/wa-sqlite.wasm',
			),
			path.join(currentDir, '../dist/wa-sqlite.wasm'),
		)
		yield* fs.copyFile(
			path.join(currentDir, '../src/index.html'),
			path.join(currentDir, '../dist/index.html'),
		)
		yield* fs.copyFile(
			path.join(currentDir, '../src/ui/fonts/comfortaa-latin-ext.woff2'),
			path.join(currentDir, '../dist/comfortaa-latin-ext.woff2'),
		)
		yield* fs.copyFile(
			path.join(currentDir, '../src/ui/fonts/comfortaa-latin.woff2'),
			path.join(currentDir, '../dist/comfortaa-latin.woff2'),
		)
		yield* fs.watch(path.join(currentDir, '../src')).pipe(
			Stream.runForEach(
				Effect.fnUntraced(function* () {
					yield* build
					yield* publish
				}),
			),
		)
	}).pipe(
		Effect.scoped,
		Effect.provide([EffBun.BunFileSystem.layer, EffBun.BunPath.layer]),
	),
)

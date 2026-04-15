import * as EffBun from '@effect/platform-bun'
import BunTailwind from 'bun-plugin-tailwind'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import { flow } from 'effect/Function'
import * as Path from 'effect/Path'
import * as Stream from 'effect/Stream'
import * as Cli from 'effect/unstable/cli'

const metaDir = Effect.sync(() => import.meta.dir)

const commonBuildConfig = Effect.gen(function* () {
	const path = yield* Path.Path
	const currentDir = yield* metaDir
	return {
		target: 'browser',
		entrypoints: [
			path.join(currentDir, '../src/sqlite-worker.ts'),
			path.join(currentDir, '../src/ui/ui.ts'),
			path.join(currentDir, '../src/app.ts'),
		],
		outdir: path.join(currentDir, '../dist'),
		plugins: [BunTailwind],
		loader: { '.css': 'css' },
		naming: {
			// default values
			entry: '[name].[ext]',
			chunk: '[name].[ext]',
			asset: '[name].[ext]',
		},
		external: ['*.woff2'],
	} satisfies Bun.BuildConfig
})

const buildDev = Effect.gen(function* () {
	const config = yield* commonBuildConfig
	yield* Effect.promise(() =>
		Bun.build({
			...config,
			sourcemap: 'inline',
		}),
	)
})

const buildProd = Effect.gen(function* () {
	const config = yield* commonBuildConfig
	yield* Effect.promise(() =>
		Bun.build({
			...config,
			minify: {
				whitespace: true,
				identifiers: true,
				syntax: true,
			},
			define: {
				// This forces 'process.env.NODE_ENV' to literally become the string "production"
				'process.env.NODE_ENV': '"production"',
			},
			sourcemap: 'none',
		}),
	)
})

const prepareDist = Effect.gen(function* () {
	const path = yield* Path.Path
	const fs = yield* FS.FileSystem
	const currentDir = yield* metaDir
	yield* fs.remove(path.join(currentDir, '../dist'), {
		force: true,
		recursive: true,
	})
	yield* fs.makeDirectory(path.join(currentDir, '../dist'))
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
})

const serveCommand = Cli.Command.make(
	'serve',
	{},
	Effect.fn(function* () {
		const fs = yield* FS.FileSystem
		const path = yield* Path.Path
		const currentDir = yield* metaDir
		const server = yield* Effect.sync(() =>
			Bun.serve({
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
			}),
		)
		yield* prepareDist
		yield* buildDev
		const publish = Effect.sync(() => server.publish('refresh', 'reload-page'))
		return yield* fs.watch(path.join(currentDir, '../src/ui')).pipe(
			Stream.tap(
				Effect.fnUntraced(
					function* () {
						yield* buildDev
						yield* publish
					},
					Effect.catchCause(flow(Cause.squash, Effect.logError)),
				),
			),
			Stream.runDrain,
		)
	}),
)

const buildCommand = Cli.Command.make(
	'build',
	{},
	Effect.fn(function* () {
		yield* prepareDist
		return yield* buildProd
	}),
)

EffBun.BunRuntime.runMain(
	Cli.Command.run(
		Cli.Command.make('cli.ts').pipe(
			Cli.Command.withSubcommands([buildCommand, serveCommand]),
		),
		{
			version: '1.0',
		},
	).pipe(Effect.provide([EffBun.BunServices.layer])),
)

import * as EffBun from '@effect/platform-bun'
import BunTailwind from 'bun-plugin-tailwind'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import { flow } from 'effect/Function'
import * as Path from 'effect/Path'
import * as Stream from 'effect/Stream'
import * as Cli from 'effect/unstable/cli'

const makeRootResolver = Effect.gen(function* () {
	const path = yield* Path.Path
	const currentDir = yield* Effect.sync(() => import.meta.dir)
	return (...parts: ReadonlyArray<string>) =>
		path.join(currentDir, '..', ...parts)
})

const commonBuildConfig = Effect.gen(function* () {
	const resolve = yield* makeRootResolver
	return {
		target: 'browser',
		entrypoints: [
			resolve('./src/sqlite-worker.ts'),
			resolve('./src/ui/ui.ts'),
			resolve('./src/app.ts'),
		],
		outdir: resolve('./dist'),
		plugins: [BunTailwind],
		loader: { '.css': 'css' },
		naming: {
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
			env: 'inline',
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
				'process.env.NODE_ENV': '"production"',
			},
			sourcemap: 'none',
		}),
	)
})

const prepareDist = Effect.gen(function* () {
	const resolve = yield* makeRootResolver
	const fs = yield* FS.FileSystem
	yield* fs.remove(resolve('./dist'), {
		force: true,
		recursive: true,
	})
	yield* fs.makeDirectory(resolve('./dist'))
	yield* fs.copyFile(
		resolve('./node_modules/@effect/wa-sqlite/dist/wa-sqlite.wasm'),
		resolve('./dist/wa-sqlite.wasm'),
	)
	yield* fs.copyFile(
		resolve('./src/ui/index.html'),
		resolve('./dist/index.html'),
	)
	yield* fs.copyFile(
		resolve('./src/ui/fonts/comfortaa-latin-ext.woff2'),
		resolve('./dist/comfortaa-latin-ext.woff2'),
	)
	yield* fs.copyFile(
		resolve('./src/ui/fonts/comfortaa-latin.woff2'),
		resolve('./dist/comfortaa-latin.woff2'),
	)
})

const serveCommand = Cli.Command.make(
	'serve',
	{},
	Effect.fn(function* () {
		const fs = yield* FS.FileSystem
		const resolve = yield* makeRootResolver
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
		return yield* fs.watch(resolve('./src/ui')).pipe(
			Stream.runForEach(
				Effect.fn(
					function* () {
						yield* buildDev
						yield* publish
					},
					Effect.catchCause(flow(Cause.squash, Effect.logError)),
				),
			),
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
	Cli.Command.make('cli.ts').pipe(
		Cli.Command.withSubcommands([buildCommand, serveCommand]),
		Cli.Command.run({
			version: '1.0',
		}),
		Effect.provide([EffBun.BunServices.layer]),
	),
)

import * as EffBun from '@effect/platform-bun'
import BunTailwind from 'bun-plugin-tailwind'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import { flow } from 'effect/Function'
import * as Path from 'effect/Path'
import * as Stream from 'effect/Stream'
import * as Terminal from 'effect/Terminal'
import * as Cli from 'effect/unstable/cli'

const makeRootResolver = Effect.gen(function* () {
	const path = yield* Path.Path
	const currentDir = yield* Effect.sync(() => import.meta.dir)
	return (...parts: ReadonlyArray<string>) =>
		path.join(currentDir, '..', ...parts)
})

const rendererPath = './src/infrastructure/adapters/outbound/web-snabbdom/'

const commonBuildConfig = Effect.gen(function* () {
	const resolve = yield* makeRootResolver

	return {
		entrypoints: [
			resolve('./src/infrastructure/shared/sqlite/sqlite.worker.ts'),
			resolve('./src/app.ts'),
			resolve(rendererPath, './css/styles.css'),
		],
		env: 'inline',
		loader: { '.css': 'css', '.woff2': 'file' },
		naming: {
			asset: '[name].[ext]',
			chunk: '[name].[ext]',
			entry: '[name].[ext]',
		},
		outdir: resolve('./dist'),
		plugins: [BunTailwind],
		target: 'browser',
	} satisfies Bun.BuildConfig
})

const buildDev = Effect.gen(function* () {
	const resolve = yield* makeRootResolver
	const config = yield* commonBuildConfig
	yield* Effect.promise(() =>
		Bun.build({
			...config,
			entrypoints: [
				...config.entrypoints,
				resolve(rendererPath, './pages/view.tsx'),
			],
			sourcemap: 'inline',
		}),
	)
})

const buildProd = Effect.gen(function* () {
	const config = yield* commonBuildConfig
	yield* Effect.promise(() =>
		Bun.build({
			...config,
			define: {
				'process.env.NODE_ENV': '"production"',
			},
			minify: {
				identifiers: true,
				syntax: true,
				whitespace: true,
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
		resolve(rendererPath, './index.html'),
		resolve('./dist/index.html'),
	)
})

const watchCommand = Cli.Command.make(
	'watch',
	{},
	Effect.fn(function* () {
		const fs = yield* FS.FileSystem
		const resolve = yield* makeRootResolver
		yield* prepareDist
		yield* buildDev
		const server = yield* Effect.acquireRelease(
			Effect.sync(() =>
				Bun.serve({
					fetch(req, server) {
						if (server.upgrade(req)) return
						return new Response('HMR Server Active')
					},
					// @ts-expect-error
					hostname: process.env.UI_EMITTER_WEBSOCKET_HOST!,
					// @ts-expect-error
					port: process.env.UI_EMITTER_WEBSOCKET_PORT!,
					websocket: {
						message() {},
						open(ws) {
							ws.subscribe('refresh')
						},
					},
				}),
			),
			s => Effect.promise(() => s.stop(true)),
		)
		const publish = Effect.sync(() => server.publish('refresh', 'reload-page'))
		const terminal = yield* Terminal.Terminal
		const input = yield* terminal.readInput
		const display = terminal.display(
			//@ts-expect-error
			`\nHMR running at ws://${process.env.UI_EMITTER_WEBSOCKET_HOST}:${process.env.UI_EMITTER_WEBSOCKET_PORT}\nPress Ctrl+c to stop\n`,
		)
		return yield* Effect.race(
			Stream.fromQueue(input).pipe(
				Stream.onStart(display),
				Stream.filter(() => input.state._tag === 'Open'),
				Stream.tap(() => display),
				Stream.runDrain,
			),
			Stream.mergeAll(
				[
					fs.watch(resolve(rendererPath, './pages')),
					fs.watch(resolve(rendererPath, './css')),
				],
				{ concurrency: 'unbounded' },
			).pipe(
				Stream.debounce('100 millis'),
				Stream.runForEach(
					Effect.fn(
						function* () {
							yield* buildDev
							yield* publish
						},
						Effect.catchCause(flow(Cause.squash, Effect.logError)),
					),
				),
			),
		)
	}, Effect.scoped),
)

const buildCommand = Cli.Command.make(
	'build',
	{},
	Effect.fn(function* () {
		yield* prepareDist
		return yield* buildProd
	}),
)

const setupEnv = Effect.gen(function* () {
	const fs = yield* FS.FileSystem
	const resolve = yield* makeRootResolver
	yield* fs.copy(resolve('./.env.default'), resolve('./.env'), {
		overwrite: false,
	})
})

EffBun.BunRuntime.runMain(
	Effect.zipWith(
		setupEnv,
		Cli.Command.make('cli.ts').pipe(
			Cli.Command.withSubcommands([buildCommand, watchCommand]),
			Cli.Command.run({
				version: '1.0',
			}),
		),
		(a, b) => b,
	).pipe(Effect.provide([EffBun.BunServices.layer])),
)

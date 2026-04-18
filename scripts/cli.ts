import * as EffBun from '@effect/platform-bun'
import BunTailwind from 'bun-plugin-tailwind'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import { flow, pipe } from 'effect/Function'
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

const commonBuildConfig = Effect.gen(function* () {
	const resolve = yield* makeRootResolver
	return {
		target: 'browser',
		entrypoints: [
			resolve('./src/sqlite-worker.ts'),
			resolve('./src/infrastructure/adapters/renderer/pages/view.tsx'),
			resolve('./src/app.ts'),
			resolve('./src/ui/css/styles.css'),
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
		env: 'inline',
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

const watchCommand = Cli.Command.make(
	'watch',
	{},
	Effect.fn(function* () {
		const fs = yield* FS.FileSystem
		const resolve = yield* makeRootResolver
		const server = yield* Effect.acquireRelease(
			Effect.sync(() =>
				Bun.serve({
					// @ts-expect-error
					port: process.env.UI_EMITTER_WEBSOCKET_PORT!,
					// @ts-expect-error
					hostname: process.env.UI_EMITTER_WEBSOCKET_HOST!,
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
			),
			s => Effect.promise(() => s.stop(true)),
		)
		const publish = Effect.sync(() => server.publish('refresh', 'reload-page'))
		const terminal = yield* Terminal.Terminal
		const input = yield* terminal.readInput
		yield* buildDev
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
			fs.watch(resolve('./src/infrastructure/adapters/renderer/pages')).pipe(
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

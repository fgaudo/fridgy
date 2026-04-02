import * as EffBun from '@effect/platform-bun'
import P from 'bun-plugin-tailwind'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import * as Path from 'effect/Path'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import { WebSocketServer } from 'ws'

const ws = new WebSocketServer({ port: 35729 })
const buildApp = Effect.promise(() =>
	Bun.build({
		entrypoints: ['./src/app.ts'],
		target: 'browser',
		outdir: './dist',
		plugins: [P],

		sourcemap: 'inline',
	}),
)

await Effect.runPromise(
	Effect.provide(
		Effect.gen(function* () {
			const fs = yield* FS.FileSystem
			const path = yield* Path.Path

			yield* fs.remove('./dist', { force: true, recursive: true })
			yield* fs.makeDirectory('./dist')
			yield* buildApp
			yield* fs.copyFile('src/index.html', 'dist/index.html')

			yield* fs.watch('src').pipe(
				Stream.tap(a => Effect.log(path.join('src', a.path))),
				Stream.mapEffect(
					a =>
						Effect.all([buildApp, fs.readFile(path.join('src', a.path))], {
							mode: 'result',
							concurrency: 'unbounded',
						}).pipe(
							Effect.flatMap(([, a]) =>
								Result.match(a, {
									onSuccess: a =>
										Effect.sync(() => {
											console.log('sto a manda')
											ws.clients.forEach(client => {
												client.send(a)
											})
										}),
									onFailure: Effect.logError,
								}),
							),
						),
					{ concurrency: 1 },
				),
				Stream.runDrain,
				Effect.forkDetach,
			)
		}),
		[EffBun.BunFileSystem.layer, EffBun.BunPath.layer],
	),
)

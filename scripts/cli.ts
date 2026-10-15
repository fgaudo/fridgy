import * as EffBun from '@effect/platform-bun'
import BunTailwind from 'bun-plugin-tailwind'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import { flow } from 'effect/Function'
import * as Path from 'effect/Path'
import * as Stream from 'effect/Stream'
import * as Terminal from 'effect/Terminal'
import * as Cli from 'effect/cli'

const makeRootResolver = Effect.gen(function*() {
  const path = yield* Path.Path
  const currentDir = yield* Effect.sync(() => import.meta.dir)
  return (...parts: ReadonlyArray<string>) => path.join(currentDir, '..', ...parts)
})

const commonBuildConfig = Effect.gen(function*() {
  const resolve = yield* makeRootResolver

  return {
    entrypoints: [resolve('./src/assets/css/styles.css')],
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

const buildDev = Effect.gen(function*() {
  const resolve = yield* makeRootResolver
  const config = yield* commonBuildConfig
  yield* Effect.promise(() =>
    Bun.build({
      ...config,
      entrypoints: [
        ...config.entrypoints,
        resolve('./src/entrypoints/development.ts'),
        // Built separately so it can be hot reloaded.
        resolve('./src/app/view.ts'),
      ],
      sourcemap: 'inline',
    })
  )
})

const buildProd = Effect.gen(function*() {
  const resolve = yield* makeRootResolver
  const config = yield* commonBuildConfig
  yield* Effect.promise(() =>
    Bun.build({
      ...config,
      entrypoints: [
        ...config.entrypoints,
        resolve('./src/entrypoints/production.ts'),
        resolve('./src/infrastructure/sqlite/sqlite.worker.ts'),
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      minify: {
        identifiers: true,
        syntax: true,
        whitespace: true,
      },
      sourcemap: 'none',
    })
  )
})

// `entry` is the name of the entrypoint bundle that index.html loads.
const prepareDist = Effect.fn(function*(entry: 'development' | 'production') {
  const resolve = yield* makeRootResolver
  const fs = yield* FS.FileSystem
  yield* fs.remove(resolve('./dist'), {
    force: true,
    recursive: true,
  })
  yield* fs.makeDirectory(resolve('./dist'))
  // Only production uses sqlite: development keeps data in memory.
  if (entry === 'production') {
    yield* fs.copyFile(
      resolve('./node_modules/@effect/wa-sqlite/dist/wa-sqlite.wasm'),
      resolve('./dist/wa-sqlite.wasm'),
    )
  }
  const html = yield* fs.readFileString(resolve('./src/assets/index.html'))
  yield* fs.writeFileString(
    resolve('./dist/index.html'),
    html.replaceAll('%ENTRY%', entry),
  )
})

const watchCommand = Cli.Command.make(
  'watch',
  {},
  Effect.fn(function*() {
    const fs = yield* FS.FileSystem
    const resolve = yield* makeRootResolver
    yield* prepareDist('development')
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
        })
      ),
      (s) => Effect.promise(() => s.stop(true)),
    )
    const terminal = yield* Terminal.Terminal
    yield* terminal.display(
      // @ts-expect-error
      `HMR running at ws://${process.env.UI_EMITTER_WEBSOCKET_HOST}:${process.env.UI_EMITTER_WEBSOCKET_PORT}\n`,
    )
    const publish = Effect.sync(() => server.publish('refresh', 'reload-page'))
    return yield* Stream.mergeAll(
      [
        fs.watch(resolve('./src/app'), { recursive: true }),
        fs.watch(resolve(
          './src/assets/css',
        )),
      ],
      { concurrency: 'unbounded' },
    ).pipe(
      Stream.debounce('100 millis'),
      Stream.runForEach(
        Effect.fn(
          function*() {
            yield* buildDev
            yield* publish
          },
          Effect.catchCause(flow(Cause.squash, Effect.logError)),
        ),
      ),
    )
  }, Effect.scoped),
)

const buildCommand = Cli.Command.make(
  'build',
  {},
  Effect.fn(function*() {
    yield* prepareDist('production')
    return yield* buildProd
  }),
)

const setupEnv = Effect.gen(function*() {
  const fs = yield* FS.FileSystem
  const resolve = yield* makeRootResolver
  yield* fs.copy(resolve('./.env.default'), resolve('./.env'), {
    overwrite: false,
  })
})

EffBun.BunRuntime.runMain(
  setupEnv.pipe(
    Effect.andThen(
      () =>
        Cli.Command.make('cli.ts').pipe(
          Cli.Command.withSubcommands([buildCommand, watchCommand]),
          Cli.Command.run({
            version: '1.0',
          }),
        ),
    ),
    Effect.provide([EffBun.BunServices.layer]),
  ),
)

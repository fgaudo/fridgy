import * as EffBun from '@effect/platform-bun'
import BunTailwind from 'bun-plugin-tailwind'
import * as Config from 'effect/Config'
import * as ConfigProvider from 'effect/ConfigProvider'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import * as HashSet from 'effect/HashSet'
import * as Layer from 'effect/Layer'
import * as Path from 'effect/Path'
import * as Ref from 'effect/Ref'
import * as Stream from 'effect/Stream'
import * as Cli from 'effect/cli'

type Mode = 'development' | 'production'

// Copied into dist/fonts/ as they are, and linked from index.html: the CSS bundler would inline every font file
// up to ~128 KB as a `data:` URL, putting megabytes of fonts in styles.css.
const fontStylesheets = [
  '@fontsource-variable/noto-sans/standard.css',
  '@fontsource-variable/noto-sans/standard-italic.css',
  '@fontsource-variable/noto-sans-arabic/standard.css',
  '@fontsource-variable/noto-nastaliq-urdu/index.css',
  '@fontsource-variable/noto-sans-hebrew/standard.css',
  '@fontsource-variable/noto-sans-bengali/standard.css',
  '@fontsource-variable/noto-sans-gujarati/standard.css',
  '@fontsource-variable/noto-sans-gurmukhi/standard.css',
  '@fontsource-variable/noto-sans-kannada/standard.css',
  '@fontsource-variable/noto-sans-malayalam/standard.css',
  '@fontsource-variable/noto-sans-oriya/standard.css',
  '@fontsource-variable/noto-sans-tamil/standard.css',
  '@fontsource-variable/noto-sans-telugu/standard.css',
  '@fontsource-variable/noto-sans-thai/standard.css',
  '@fontsource-variable/noto-sans-sc/index.css',
  '@fontsource-variable/noto-sans-tc/index.css',
  '@fontsource-variable/noto-sans-jp/index.css',
  '@fontsource-variable/noto-sans-kr/index.css',
]

const modes = {
  development: {
    entrypoints: [
      'src/entrypoints/development.ts',
      // Built separately so it can be hot reloaded.
      'src/app/view.tsx',
    ],
    assets: [],
    options: { sourcemap: 'inline' },
  },
  production: {
    entrypoints: ['src/entrypoints/production.ts', 'src/infrastructure/sqlite/sqlite.worker.ts'],
    assets: ['node_modules/@effect/wa-sqlite/dist/wa-sqlite.wasm'],
    options: { sourcemap: 'none', minify: true },
  },
} satisfies Record<
  Mode,
  {
    entrypoints: ReadonlyArray<string>
    assets: ReadonlyArray<string>
    options: Partial<Bun.BuildConfig>
  }
>

class BuildFailed extends Data.TaggedError('BuildFailed')<{ readonly logs: string }> {}

const root = Effect.gen(function*() {
  const path = yield* Path.Path
  return (...parts: ReadonlyArray<string>) => path.join(import.meta.dir, '..', ...parts)
})

const build = Effect.fn('build')(function*(mode: Mode) {
  const resolve = yield* root
  const { entrypoints, options } = modes[mode]
  const output = yield* Effect.tryPromise({
    try: () =>
      Bun.build({
        entrypoints: [resolve('src/styles.css'), ...entrypoints.map((entry) => resolve(entry))],
        outdir: resolve('dist'),
        target: 'browser',
        loader: { '.css': 'css', '.woff2': 'file' },
        naming: { asset: '[name].[ext]', chunk: '[name].[ext]', entry: '[name].[ext]' },
        plugins: [BunTailwind],
        define: { 'process.env.NODE_ENV': `"${mode}"` },
        throw: false,
        ...options,
      }),
    catch: (error) => new BuildFailed({ logs: String(error) }),
  })
  if (!output.success) {
    return yield* new BuildFailed({ logs: output.logs.map(String).join('\n') })
  }
})

const prepareDist = Effect.fn('prepareDist')(function*(mode: Mode) {
  const resolve = yield* root
  const path = yield* Path.Path
  const fs = yield* FS.FileSystem
  yield* fs.remove(resolve('dist'), { force: true, recursive: true })
  yield* fs.makeDirectory(resolve('dist'))
  for (const asset of modes[mode].assets) {
    yield* fs.copyFile(resolve(asset), resolve('dist', path.basename(asset)))
  }
  const fontLinks = yield* Effect.forEach(
    fontStylesheets,
    Effect.fn('copyFontStylesheet')(function*(stylesheet) {
      // `@fontsource-variable/noto-sans-jp/index.css` → `fonts/noto-sans-jp/index.css`, next to its files.
      const target = path.join('fonts', path.basename(path.dirname(stylesheet)), path.basename(stylesheet))
      const css = yield* fs.readFileString(resolve('node_modules', stylesheet))
      yield* fs.makeDirectory(resolve('dist', path.dirname(target), 'files'), { recursive: true })
      yield* fs.writeFileString(resolve('dist', target), css)
      // Only the files this stylesheet refers to: a package also ships other subsets and styles.
      for (const [, file] of css.matchAll(/url\(\.\/files\/([^)]+)\)/g)) {
        yield* fs.copyFile(
          resolve('node_modules', path.dirname(stylesheet), 'files', file ?? ''),
          resolve('dist', path.dirname(target), 'files', file ?? ''),
        )
      }
      return `<link rel="stylesheet" href="./${target.replaceAll('\\', '/')}" />`
    }),
  )
  const html = yield* fs.readFileString(resolve('src/index.html'))
  yield* fs.writeFileString(
    resolve('dist', 'index.html'),
    html.replaceAll('%ENTRY%', mode).replace('%FONTS%', fontLinks.join('\n\t\t')),
  )
})

const devServerConfig = Config.all({
  host: Config.String('DEV_SERVER_HOST').pipe(Config.withDefault('localhost')),
  port: Config.Port('DEV_SERVER_PORT').pipe(Config.withDefault(3000)),
})

/**
 * Views (the only `.tsx` files) and styles can be swapped in place; any other
 * change needs a full page reload.
 */
const reloadFor = (path: Path.Path, changed: HashSet.HashSet<string>) =>
  HashSet.every(changed, (file) => ['.tsx', '.css'].includes(path.extname(file)))
    ? 'reload-view'
    : 'reload-page'

const watchCommand = Cli.Command.make(
  'watch',
  {},
  Effect.fn(function*() {
    const resolve = yield* root
    const path = yield* Path.Path
    const fs = yield* FS.FileSystem
    const { host, port } = yield* devServerConfig
    const dist = resolve('dist')
    yield* prepareDist('development')
    yield* build('development')
    const server = yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve({
          hostname: host,
          port,
          async fetch(request, server) {
            const { pathname } = new URL(request.url)
            if (pathname === '/hot-reload') {
              return server.upgrade(request) ? undefined : new Response('Upgrade failed', { status: 400 })
            }
            const file = path.join(dist, pathname === '/' ? 'index.html' : pathname)
            const isInDist = file.startsWith(dist)
            return isInDist && (await Bun.file(file).exists())
              ? new Response(Bun.file(file))
              : new Response('Not found', { status: 404 })
          },
          websocket: {
            message() {},
            open(socket) {
              socket.subscribe('reload')
            },
          },
        })
      ),
      (server) => Effect.promise(() => server.stop(true)),
    )
    yield* Effect.logInfo(`Serving dist/ at http://${host}:${port}`)
    const changed = yield* Ref.make(HashSet.empty<string>())
    return yield* fs.watch(resolve('src'), { recursive: true }).pipe(
      Stream.tap((event) => Ref.update(changed, HashSet.add(event.path))),
      Stream.debounce('100 millis'),
      Stream.runForEach(
        Effect.fn('rebuild')(
          function*() {
            const files = yield* Ref.getAndSet(changed, HashSet.empty())
            yield* build('development')
            server.publish('reload', reloadFor(path, files))
          },
          Effect.catchTag('BuildFailed', ({ logs }) => Effect.logError(`Build failed:\n${logs}`)),
        ),
      ),
    )
  }, Effect.scoped),
)

const buildCommand = Cli.Command.make(
  'build',
  {},
  Effect.fn('buildCommand')(function*() {
    yield* prepareDist('production')
    yield* build('production')
  }),
)

// `.env` is created from `.env.default` on the first run, then read from disk:
// Bun only loads it when the process starts, before it exists.
const DotEnv = Layer.unwrap(Effect.gen(function*() {
  const resolve = yield* root
  const fs = yield* FS.FileSystem
  yield* fs.copy(resolve('.env.default'), resolve('.env'), { overwrite: false })
  const dotEnv = yield* ConfigProvider.fromDotEnv({ path: resolve('.env') })
  return ConfigProvider.layer(ConfigProvider.orElse(dotEnv, ConfigProvider.fromEnv()))
}))

EffBun.BunRuntime.runMain(
  Cli.Command.make('cli.ts').pipe(
    Cli.Command.withSubcommands([buildCommand, watchCommand]),
    Cli.Command.run({ version: '1.0' }),
    Effect.provide(Layer.provideMerge(DotEnv, EffBun.BunServices.layer)),
  ),
)

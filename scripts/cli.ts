import * as EffBun from '@effect/platform-bun'
import * as Config from 'effect/Config'
import * as ConfigProvider from 'effect/ConfigProvider'
import * as Cli from 'effect/cli'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import * as HashSet from 'effect/HashSet'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Path from 'effect/Path'
import * as Process from 'effect/process'
import * as Ref from 'effect/Ref'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'
import * as LicenseChecker from 'license-checker-rseidelsohn'
import { palette, surface } from './palette.ts'
import { tailwind } from './tailwind.ts'

type Mode = 'development' | 'production'

const modes = {
  development: {
    entrypoints: [
      'src/entrypoints/development.ts',
      // Built separately so it can be hot reloaded.
      'src/app/view.tsx',
    ],
    assets: ['node_modules/@effect/wa-sqlite/dist/wa-sqlite.wasm', 'assets/logo.svg'],
    options: { sourcemap: 'inline' },
  },
  production: {
    entrypoints: ['src/entrypoints/production.ts', 'src/infrastructure/storage/sqlite.opfs.worker.ts'],
    assets: ['node_modules/@effect/wa-sqlite/dist/wa-sqlite.wasm', 'assets/logo.svg', 'src/error.html'],
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
  const path = yield* Path.Path
  const { entrypoints, options } = modes[mode]
  const output = yield* Effect.tryPromise({
    try: () =>
      Bun.build({
        entrypoints: [resolve('src/styles.css'), ...entrypoints.map((entry) => resolve(entry))],
        outdir: resolve('dist'),
        target: 'browser',
        loader: { '.css': 'css', '.woff2': 'file' },
        naming: { asset: '[name].[ext]', chunk: '[name].[ext]', entry: '[name].[ext]' },
        plugins: [tailwind(resolve(), path)],
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

/**
 * Writes Material Symbols into `dist/fonts/`, whole: every icon, so that a view may name any. Its stylesheet goes
 * in the `base` layer, so that a view's size wins over the icons' own. Linked from `index.html`, not imported in
 * `styles.css`: the CSS bundler would inline it.
 */
const writeIconFont = Effect.fn('writeIconFont')(function*() {
  const resolve = yield* root
  const fs = yield* FS.FileSystem
  const css = yield* fs.readFileString(resolve('node_modules/material-symbols/rounded.css'))
  yield* fs.makeDirectory(resolve('dist/fonts'), { recursive: true })
  yield* fs.copyFile(
    resolve('node_modules/material-symbols/material-symbols-rounded.woff2'),
    resolve('dist/fonts/material-symbols-rounded.woff2'),
  )
  yield* fs.writeFileString(resolve('dist/fonts/material-symbols-rounded.css'), `@layer base {\n${css}}\n`)
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
  const html = yield* fs.readFileString(resolve('src/index.html'))
  yield* fs.writeFileString(resolve('dist', 'index.html'), html.replaceAll('%ENTRY%', mode))
  yield* writeIconFont()
})

const devServerConfig = Config.all({
  host: Config.String('DEV_SERVER_HOST').pipe(Config.withDefault('localhost')),
  port: Config.Port('DEV_SERVER_PORT').pipe(Config.withDefault(3000)),
})

/** Views (the only `.tsx` files) and styles can be swapped in place; any other change needs a full page reload. */
const reloadFor = (path: Path.Path, changed: HashSet.HashSet<string>) =>
  HashSet.every(changed, (file) => ['.tsx', '.css'].includes(path.extname(file))) ? 'reload-view' : 'reload-page'

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

class LicensesFailed extends Data.TaggedError('LicensesFailed')<{ readonly cause: unknown }> {}

// Only whether a package declares a description: the rest of its package.json is left alone.
const PackageJson = Schema.fromJsonString(Schema.Struct({ description: Schema.optional(Schema.Unknown) }))

const hasDeclaredDescription = (packageJson: string) =>
  Opt.exists(Schema.decodeOption(PackageJson)(packageJson), (pkg) => typeof pkg.description === 'string')

/** What the About page shows of each package: the shape of `licenses.generated.json`. */
const LicensesJson = Schema.fromJsonString(
  Schema.Record(
    Schema.String,
    Schema.Struct({
      licenses: Schema.optional(Schema.String),
      repository: Schema.optional(Schema.String),
      publisher: Schema.optional(Schema.String),
      email: Schema.optional(Schema.String),
      copyright: Schema.optional(Schema.String),
      name: Schema.optional(Schema.String),
      description: Schema.optional(Schema.String),
    }),
  ),
  { space: 4 },
)

const licensesCommand = Cli.Command.make(
  'licenses',
  {},
  Effect.fn('licensesCommand')(function*() {
    const resolve = yield* root
    const path = yield* Path.Path
    const fs = yield* FS.FileSystem
    const found = yield* Effect.tryPromise({
      try: () =>
        new Promise<LicenseChecker.ModuleInfos>((resolvePromise, reject) =>
          LicenseChecker.init(
            {
              start: resolve(),
              production: true,
              excludePackages: 'fridgy',
              customFormat: { name: '', description: '', copyright: '' },
            },
            // It reports success with `null`, not the `undefined` of its types.
            (error, modules) => (error instanceof Error ? reject(error) : resolvePromise(modules)),
          )
        ),
      catch: (cause) => new LicensesFailed({ cause }),
    })
    const entries = yield* Effect.forEach(
      Object.entries(found),
      Effect.fn('readLicense')(function*([id, info]) {
        // A package without a description gets the first paragraph of its README instead (npm's normalization of
        // package.json), which may be markdown, such as a badge.
        const isDeclared = hasDeclaredDescription(
          yield* fs.readFileString(path.join(String(info.path), 'package.json')),
        )
        const { licenses, repository, publisher, email, copyright, name, description } = info
        return [id, {
          // A package may be under several licenses.
          licenses: Array.isArray(licenses) ? licenses.join(', ') : licenses,
          repository,
          publisher,
          email,
          copyright,
          name,
          description: isDeclared ? description : undefined,
        }] as const
      }),
    )
    const json = yield* Schema.encodeEffect(LicensesJson)(Object.fromEntries(entries)).pipe(
      Effect.mapError((cause) => new LicensesFailed({ cause })),
    )
    yield* fs.writeFileString(
      resolve('src/app/children/about/services/licenses/licenses.generated.json'),
      `${json}\n`,
    )
  }),
)

const paletteCommand = Cli.Command.make(
  'palette',
  {},
  Effect.fn('paletteCommand')(function*() {
    const resolve = yield* root
    const fs = yield* FS.FileSystem
    yield* fs.writeFileString(resolve('src/palette.generated.css'), palette())
  }),
)

class AssetsFailed extends Data.TaggedError('AssetsFailed')<{ readonly exitCode: number }> {}

const generateAssets = Effect.fn('generateAssets')(function*(background: { light: string; dark: string }) {
  const resolve = yield* root
  const generate = yield* Process.ChildProcess.make('bun', [
    'x',
    '@capacitor/assets@3.0.5',
    'generate',
    '--android',
    '--iconBackgroundColor',
    background.light,
    '--iconBackgroundColorDark',
    background.dark,
    '--splashBackgroundColor',
    background.light,
    '--splashBackgroundColorDark',
    background.dark,
  ], { cwd: resolve(), stdout: 'inherit', stderr: 'inherit' })
  const exitCode = yield* generate.exitCode
  if (exitCode !== 0) {
    return yield* new AssetsFailed({ exitCode })
  }
}, Effect.scoped)

const assetsCommand = Cli.Command.make(
  'assets',
  {},
  Effect.fn('assetsCommand')(function*() {
    const resolve = yield* root
    const fs = yield* FS.FileSystem
    const manifest = resolve('android/app/src/main/AndroidManifest.xml')
    // The generator rewrites the manifest, reformatted: it is put back as it was, however the run ends.
    const manifestXml = yield* fs.readFileString(manifest)
    const outcome = yield* Effect.exit(generateAssets({ light: surface(false), dark: surface(true) }))
    yield* fs.writeFileString(manifest, manifestXml)
    return yield* outcome
  }),
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
    Cli.Command.withSubcommands([buildCommand, watchCommand, licensesCommand, paletteCommand, assetsCommand]),
    Cli.Command.run({ version: '1.0' }),
    Effect.provide(Layer.provideMerge(DotEnv, EffBun.BunServices.layer)),
  ),
)

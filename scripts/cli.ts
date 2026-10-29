import * as EffBun from '@effect/platform-bun'
import * as Config from 'effect/Config'
import * as Cli from 'effect/cli'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import * as HashSet from 'effect/HashSet'
import * as Opt from 'effect/Option'
import * as Path from 'effect/Path'
import * as Process from 'effect/process'
import * as Ref from 'effect/Ref'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'
import * as LicenseChecker from 'license-checker-rseidelsohn'
import { Entries } from '#app/children/about/services/licenses/licenses.bundled.ts'
import { palette, surface } from './palette.ts'
import { tailwind } from './tailwind.ts'

type Mode = 'development' | 'production'

// Each mode builds into a folder of its own, so that a production build (`bun run e2e`) while the watch runs
// never replaces what the watch serves.
const modes = {
  development: {
    outdir: 'dist-dev',
    entrypoints: [
      'src/entrypoints/development.ts',
      // Built separately so it can be hot reloaded.
      'src/app/view.tsx',
    ],
    assets: ['node_modules/@effect/wa-sqlite/dist/wa-sqlite.wasm', 'assets/logo.svg'],
    options: { sourcemap: 'inline' },
  },
  production: {
    outdir: 'dist',
    entrypoints: ['src/entrypoints/production.ts', 'src/infrastructure/storage/sqlite.opfs.worker.ts'],
    assets: ['node_modules/@effect/wa-sqlite/dist/wa-sqlite.wasm', 'assets/logo.svg', 'src/error.html'],
    options: { sourcemap: 'none', minify: true },
  },
} satisfies Record<
  Mode,
  {
    outdir: string
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
  const { outdir, entrypoints, options } = modes[mode]
  const output = yield* Effect.tryPromise({
    try: () =>
      Bun.build({
        entrypoints: [resolve('src/styles.css'), ...entrypoints.map((entry) => resolve(entry))],
        outdir: resolve(outdir),
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
 * Writes Material Symbols into the output's `fonts/`, whole: every icon, so that a view may name any. Its
 * stylesheet goes in the `base` layer, so that a view's size wins over the icons' own. Linked from `index.html`,
 * not imported in `styles.css`: the CSS bundler would inline it.
 */
const writeIconFont = Effect.fn('writeIconFont')(function*(outdir: string) {
  const resolve = yield* root
  const fs = yield* FS.FileSystem
  const css = yield* fs.readFileString(resolve('node_modules/material-symbols/rounded.css'))
  yield* fs.makeDirectory(resolve(outdir, 'fonts'), { recursive: true })
  yield* fs.copyFile(
    resolve('node_modules/material-symbols/material-symbols-rounded.woff2'),
    resolve(outdir, 'fonts/material-symbols-rounded.woff2'),
  )
  yield* fs.writeFileString(resolve(outdir, 'fonts/material-symbols-rounded.css'), `@layer base {\n${css}}\n`)
})

const prepareOutdir = Effect.fn('prepareOutdir')(function*(mode: Mode) {
  const resolve = yield* root
  const path = yield* Path.Path
  const fs = yield* FS.FileSystem
  const { outdir, assets } = modes[mode]
  yield* fs.remove(resolve(outdir), { force: true, recursive: true })
  yield* fs.makeDirectory(resolve(outdir))
  for (const asset of assets) {
    yield* fs.copyFile(resolve(asset), resolve(outdir, path.basename(asset)))
  }
  const html = yield* fs.readFileString(resolve('src/index.html'))
  yield* fs.writeFileString(resolve(outdir, 'index.html'), html.replaceAll('%ENTRY%', mode))
  yield* writeIconFont(outdir)
})

// `localhost` binds one loopback family only. On Windows, a second watch on the same port then binds the other,
// silently, and the browser reaches either. `PORT` comes from the preview tool, which moves off a taken port.
// Port 0 lets the system pick a free one.
const devServerConfig = Config.all({
  host: Config.String('DEV_SERVER_HOST').pipe(Config.withDefault('127.0.0.1')),
  port: Config.Port('PORT').pipe(
    Config.orElse(() => Config.Port('DEV_SERVER_PORT')),
    Config.withDefault(0),
  ),
})

class ServeFailed extends Data.TaggedError('ServeFailed')<{ readonly message: string }> {}

const serveFailed = (host: string, port: number) => (error: unknown) =>
  new ServeFailed({
    message: error instanceof Error && 'code' in error && error.code === 'EADDRINUSE'
      ? `Port ${port} of ${host} is in use (EADDRINUSE), perhaps by another watch: set another DEV_SERVER_PORT, or unset it to get a free port.`
      : `Cannot serve on ${host}:${port}: ${String(error)}`,
  })

/**
 * Views (the only `.tsx` files) and styles can be swapped in place; any other change needs a full page reload.
 * The signal goes over the `/hot-reload` socket to `src/infrastructure/hot-module.ts`, which reads these two words.
 */
const reloadFor = (path: Path.Path, changed: HashSet.HashSet<string>) =>
  HashSet.every(changed, (file) => ['.tsx', '.css'].includes(path.extname(file))) ? 'reload-view' : 'reload-page'

const watchCommand = Cli.Command.make(
  'watch',
  {},
  Effect.fn('watchCommand')(function*() {
    const resolve = yield* root
    const path = yield* Path.Path
    const fs = yield* FS.FileSystem
    const { host, port } = yield* devServerConfig
    if (host === 'localhost') {
      yield* Effect.logWarning(
        'DEV_SERVER_HOST is localhost: another watch on the same port may serve beside this one. Use 127.0.0.1.',
      )
    }
    const dist = resolve(modes.development.outdir)
    yield* prepareOutdir('development')
    yield* build('development')
    const server = yield* Effect.acquireRelease(
      Effect.try({
        try: () =>
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
          }),
        catch: serveFailed(host, port),
      }),
      (server) => Effect.promise(() => server.stop(true)),
    )
    yield* Effect.logInfo(`Serving ${modes.development.outdir}/ at ${server.url.href}`)
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

const LicensesJson = Schema.fromJsonString(Entries, { space: 4 })

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

// From Android 12 the system draws the splash itself, on `windowSplashScreenBackground`: the generator's images
// show only below it.
const splashColor = (color: string) =>
  `<?xml version="1.0" encoding="utf-8"?>
<!-- Written by \`bun run update-assets\` from scripts/palette.ts. -->
<resources>
    <color name="splash_background">${color}</color>
</resources>
`

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
    yield* outcome
    yield* fs.makeDirectory(resolve('android/app/src/main/res/values-night'), { recursive: true })
    yield* fs.writeFileString(
      resolve('android/app/src/main/res/values/splash.generated.xml'),
      splashColor(surface(false)),
    )
    yield* fs.writeFileString(
      resolve('android/app/src/main/res/values-night/splash.generated.xml'),
      splashColor(surface(true)),
    )
  }),
)

const buildCommand = Cli.Command.make(
  'build',
  {},
  Effect.fn('buildCommand')(function*() {
    yield* prepareOutdir('production')
    yield* build('production')
  }),
)

EffBun.BunRuntime.runMain(
  Cli.Command.make('cli.ts').pipe(
    Cli.Command.withSubcommands([buildCommand, watchCommand, licensesCommand, paletteCommand, assetsCommand]),
    Cli.Command.run({ version: '1.0' }),
    Effect.provide(EffBun.BunServices.layer),
  ),
)

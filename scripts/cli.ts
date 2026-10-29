import * as EffBun from '@effect/platform-bun'
import * as Cli from 'effect/cli'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import * as Opt from 'effect/Option'
import * as Path from 'effect/Path'
import * as Process from 'effect/process'
import * as Schema from 'effect/Schema'
import * as LicenseChecker from 'license-checker-rseidelsohn'
import * as Woff2 from 'wawoff2'
import { Entries } from '#app/children/about/services/licenses/licenses.bundled.ts'
import { paletteModule, surface } from './palette.ts'

const root = Effect.gen(function*() {
  const path = yield* Path.Path
  return (...parts: ReadonlyArray<string>) => path.join(import.meta.dir, '..', ...parts)
})

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
    yield* fs.writeFileString(resolve('src/palette.generated.ts'), paletteModule())
  }),
)

class IconsFailed extends Data.TaggedError('IconsFailed')<{ readonly cause: unknown }> {}

// Android reads TrueType, not WOFF2: the icon font is decompressed into the app's assets, where React Native finds
// a family by its file's name.
const iconsCommand = Cli.Command.make(
  'icons',
  {},
  Effect.fn('iconsCommand')(function*() {
    const resolve = yield* root
    const fs = yield* FS.FileSystem
    const woff2 = yield* fs.readFile(resolve('node_modules/material-symbols/material-symbols-rounded.woff2'))
    const ttf = yield* Effect.tryPromise({
      try: () => Woff2.decompress(woff2),
      catch: (cause) => new IconsFailed({ cause }),
    })
    const fonts = resolve('android-rn/app/src/main/assets/fonts')
    yield* fs.makeDirectory(fonts, { recursive: true })
    yield* fs.writeFile(`${fonts}/MaterialSymbolsRounded.ttf`, ttf)
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

EffBun.BunRuntime.runMain(
  Cli.Command.make('cli.ts').pipe(
    Cli.Command.withSubcommands([licensesCommand, paletteCommand, iconsCommand, assetsCommand]),
    Cli.Command.run({ version: '1.0' }),
    Effect.provide(EffBun.BunServices.layer),
  ),
)

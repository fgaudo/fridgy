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
import * as Licenses from './licenses.ts'
import { colorResources, paletteModule, surface } from './palette.ts'

const root = Effect.gen(function*() {
  const path = yield* Path.Path
  return (...parts: ReadonlyArray<string>) => path.join(import.meta.dir, '..', ...parts)
})

class LicensesFailed extends Data.TaggedError('LicensesFailed')<{ readonly cause: unknown }> {}

class CommandFailed
  extends Data.TaggedError('CommandFailed')<{ readonly command: string; readonly exitCode: number }>
{}

/** Runs a command to its end, its output shown, failing on an exit code other than 0. */
const run = Effect.fn('run')(function*(command: string, args: ReadonlyArray<string>, cwd: string) {
  const child = yield* Process.ChildProcess.make(command, args, { cwd, stdout: 'inherit', stderr: 'inherit' })
  const exitCode = yield* child.exitCode
  if (exitCode !== 0) {
    return yield* new CommandFailed({ command: [command, ...args].join(' '), exitCode })
  }
}, Effect.scoped)

// Only whether a package declares a description: the rest of its package.json is left alone.
const PackageJson = Schema.fromJsonString(Schema.Struct({ description: Schema.optional(Schema.Unknown) }))

const hasDeclaredDescription = (packageJson: string) =>
  Opt.exists(Schema.decodeOption(PackageJson)(packageJson), (pkg) => typeof pkg.description === 'string')

const LicensesJson = Schema.fromJsonString(Entries, { space: 4 })

/** Writes the entries, sorted by key, once each has a license the app may ship with. */
const writeEntries = Effect.fn('writeEntries')(
  function*(file: string, entries: ReadonlyArray<readonly [string, Licenses.Entry]>) {
    const resolve = yield* root
    const fs = yield* FS.FileSystem
    const refused = Licenses.disallowed(entries)
    if (refused.length > 0) {
      return yield* new LicensesFailed({
        cause: `Licenses the app may not ship with, or none (scripts/licenses.ts, ALLOWED):\n${refused.join('\n')}`,
      })
    }
    const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b))
    const json = yield* Schema.encodeEffect(LicensesJson)(Object.fromEntries(sorted)).pipe(
      Effect.mapError((cause) => new LicensesFailed({ cause })),
    )
    yield* fs.writeFileString(resolve('src/app/children/about/services/licenses', file), `${json}\n`)
  },
)

// The packages of the JavaScript the app ships: those Metro bundles from the entrypoint, read from its source map.
// React Native declares its build's tools as dependencies of its own, which the bundle leaves out.
const licensesCommand = Cli.Command.make(
  'licenses',
  {},
  Effect.fn('licensesCommand')(function*() {
    const resolve = yield* root
    const path = yield* Path.Path
    const fs = yield* FS.FileSystem
    yield* run('bun', [
      'x',
      'react-native',
      'bundle',
      '--platform',
      'android',
      '--dev',
      'false',
      '--entry-file',
      'src/entrypoints/native.tsx',
      '--bundle-output',
      'out/licenses.android.bundle',
      '--sourcemap-output',
      'out/licenses.android.bundle.map',
    ], resolve())
    const map = yield* Schema.decodeEffect(Licenses.SourceMap)(
      yield* fs.readFileString(resolve('out/licenses.android.bundle.map')),
    ).pipe(Effect.mapError((cause) => new LicensesFailed({ cause })))
    // A folder relative to the root, with forward slashes, as both the source map and the checker can name it.
    const folderOf = (folder: string) => path.relative(resolve(), path.resolve(resolve(), folder)).replaceAll('\\', '/')
    const bundled = new Set(
      [...Licenses.bundledPackages(map.sections.flatMap(({ map }) => map.sources))].map(folderOf),
    )
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
      Object.entries(found).filter(([, info]) => bundled.has(folderOf(String(info.path)))),
      Effect.fn('readLicense')(function*([id, info]) {
        // A package without a description gets the first paragraph of its README instead (npm's normalization of
        // package.json), which may be markdown, such as a badge.
        const isDeclared = hasDeclaredDescription(
          yield* fs.readFileString(path.join(String(info.path), 'package.json')),
        )
        const { licenses, repository, publisher, email, copyright, name, description } = info
        return [id, {
          // A package may be under several licenses, any of which applies.
          licenses: Array.isArray(licenses) ? licenses.join(' OR ') : licenses,
          repository,
          publisher,
          email,
          copyright,
          name,
          description: isDeclared ? description : undefined,
        }] as const
      }),
    )
    yield* writeEntries('licenses.npm.generated.json', entries)
  }),
)

// The Java and Kotlin libraries Gradle packages into the release, as AboutLibraries reads them from their POMs. It
// runs Gradle, which needs Android's SDK and `JAVA_HOME`, so it is a command of its own, run before a release and
// after a change of React Native or of a native module.
const androidLicensesCommand = Cli.Command.make(
  'android-licenses',
  {},
  Effect.fn('androidLicensesCommand')(function*() {
    const resolve = yield* root
    const fs = yield* FS.FileSystem
    const output = resolve('out/aboutlibraries.json')
    const exportTask = [
      ':app:exportLibraryDefinitions',
      `-PaboutLibraries.outputFile=${output}`,
      '-PaboutLibraries.exportVariant=release',
    ]
    // Windows starts a batch file only through its shell.
    yield* process.platform === 'win32'
      ? run('cmd', ['/c', resolve('android', 'gradlew.bat'), ...exportTask], resolve('android'))
      : run('./gradlew', exportTask, resolve('android'))
    const exported = yield* Schema.decodeEffect(Licenses.AboutLibraries)(yield* fs.readFileString(output)).pipe(
      Effect.mapError((cause) => new LicensesFailed({ cause })),
    )
    yield* writeEntries('licenses.android.generated.json', [
      ...Licenses.androidEntries(exported),
      ...Licenses.nativeEntries,
    ])
  }),
)

const paletteCommand = Cli.Command.make(
  'palette',
  {},
  Effect.fn('paletteCommand')(function*() {
    const resolve = yield* root
    const fs = yield* FS.FileSystem
    yield* fs.writeFileString(resolve('src/palette.generated.ts'), paletteModule())
    const res = resolve('android/app/src/main/res')
    yield* fs.makeDirectory(`${res}/values-night`, { recursive: true })
    yield* fs.writeFileString(`${res}/values/palette.generated.xml`, colorResources(false))
    yield* fs.writeFileString(`${res}/values-night/palette.generated.xml`, colorResources(true))
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
    const fonts = resolve('android/app/src/main/assets/fonts')
    yield* fs.makeDirectory(fonts, { recursive: true })
    yield* fs.writeFile(`${fonts}/MaterialSymbolsRounded.ttf`, ttf)
  }),
)

// The generator is Capacitor's, but writes plain Android resources: the launcher icons, and splash images that the
// app does not draw (`splashColor`), which are removed after it.
const generateAssets = Effect.fn('generateAssets')(function*(background: { light: string; dark: string }) {
  const resolve = yield* root
  yield* run('bun', [
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
  ], resolve())
})

// Android draws the splash itself, in this color: from Android 12 on `windowSplashScreenBackground`, before it on
// the window's background (`res/values*/styles.xml`).
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
    const res = resolve('android/app/src/main/res')
    const splashFolders = (yield* fs.readDirectory(res)).filter((name) => /^drawable-(port|land|night)/.test(name))
    yield* Effect.forEach(splashFolders, (name) => fs.remove(`${res}/${name}`, { recursive: true }))
    yield* fs.remove(`${res}/drawable/splash.png`, { force: true })
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
    Cli.Command.withSubcommands([licensesCommand, androidLicensesCommand, paletteCommand, iconsCommand, assetsCommand]),
    Cli.Command.run({ version: '1.0' }),
    Effect.provide(EffBun.BunServices.layer),
  ),
)

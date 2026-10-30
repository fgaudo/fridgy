// The app on Android, through React Native: op-sqlite as the storage, `fetch` as the HTTP client, Android's back
// button and keyboard, drawn by React, and the screen a crash leaves.
import * as Tea from '@fgaudo/effect-tea'
import * as Cause from 'effect/Cause'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as FetchHttpClient from 'effect/http/FetchHttpClient'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import { AppRegistry } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as AppLayer from '#app/layer.ts'
import * as App from '#app/program.ts'
import { view } from '#app/view.tsx'
import * as BackButtonReactNative from '#infrastructure/back-button/back-button.react-native.ts'
import * as KeyboardReactNative from '#infrastructure/keyboard/keyboard.react-native.ts'
import * as SqliteOpSqlite from '#infrastructure/storage/sqlite.op-sqlite.ts'
import * as Renderer from '#libs/tea-react/renderer.ts'
import * as Crash from './crash/view.tsx'

const layer = Layer.mergeAll(
  AppLayer.layer.pipe(Layer.provide([SqliteOpSqlite.layer, FetchHttpClient.layer])),
  BackButtonReactNative.layer,
  KeyboardReactNative.layer,
  DateTime.layerCurrentZoneLocal,
  Layer.succeed(References.MinimumLogLevel, 'Info'),
)

const { Root, render, show } = Renderer.make(view)

// The program never ends by itself: an end that is not an interruption is a bug. Its cause goes to the log, and the
// crash screen takes the page's place. Its button runs the program again, which builds a fresh layer: a restart
// from scratch, with no native code. A second press of it starts nothing.
const start = (): void => {
  let hasRestarted = false
  const restart = () => {
    if (hasRestarted) return
    hasRestarted = true
    start()
  }
  Effect.runFork(
    Tea.run(App.program, render).pipe(
      Effect.provide(layer),
      Effect.tapCause((cause) =>
        Cause.hasInterruptsOnly(cause)
          ? Effect.void
          : Effect.logError('The app crashed', cause).pipe(Effect.andThen(show(Crash.view(restart))))
      ),
    ),
  )
}

start()

// One provider measures the system bars and the other the keyboard, which the pages keep clear of. Both bars are
// translucent, the app drawing under them: the keyboard's height is then the window's own inset, the navigation
// bar it hides included, and a page keeps clear of the larger of the two. `preserveEdgeToEdge` keeps the library
// from ever padding the content itself, even when disabled: the pages do.
AppRegistry.registerComponent(
  'Fridgy',
  () => () => (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
      <SafeAreaProvider>
        <Root />
      </SafeAreaProvider>
    </KeyboardProvider>
  ),
)

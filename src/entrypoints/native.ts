// The app on Android, through React Native: op-sqlite as the storage, `fetch` as the HTTP client, Android's back
// button, drawn by React, and the screen a crash leaves.
import * as Tea from '@fgaudo/effect-tea'
import * as Cause from 'effect/Cause'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as FetchHttpClient from 'effect/http/FetchHttpClient'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import { createElement } from 'react'
import { AppRegistry } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as AppLayer from '#app/layer.ts'
import * as App from '#app/program.ts'
import { view } from '#app/view.tsx'
import * as BackButtonReactNative from '#infrastructure/back-button/back-button.react-native.ts'
import * as SqliteOpSqlite from '#infrastructure/storage/sqlite.op-sqlite.ts'
import * as Renderer from '#libs/tea-react/renderer.ts'
import * as Crash from './crash/view.tsx'

const layer = Layer.mergeAll(
  AppLayer.layer.pipe(Layer.provide([SqliteOpSqlite.layer, FetchHttpClient.layer])),
  BackButtonReactNative.layer,
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

// The provider measures the system bars, which each page keeps clear of.
AppRegistry.registerComponent('Fridgy', () => () => createElement(SafeAreaProvider, null, createElement(Root)))

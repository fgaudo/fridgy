// The app on Android, through React Native: op-sqlite as the storage, `fetch` as the HTTP client, Android's back
// button, drawn by React.
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

const layer = Layer.mergeAll(
  AppLayer.layer.pipe(Layer.provide([SqliteOpSqlite.layer, FetchHttpClient.layer])),
  BackButtonReactNative.layer,
  DateTime.layerCurrentZoneLocal,
  Layer.succeed(References.MinimumLogLevel, 'Info'),
)

const { Root, render } = Renderer.make(view)

// The program never ends by itself: an end that is not an interruption is a bug, logged before the app dies.
Effect.runFork(
  Tea.run(App.program, render).pipe(
    Effect.provide(layer),
    Effect.tapCause((cause) =>
      Cause.hasInterruptsOnly(cause) ? Effect.void : Effect.logError('The app crashed', cause)
    ),
  ),
)

// The provider measures the system bars, which each page keeps clear of.
AppRegistry.registerComponent('Fridgy', () => () => createElement(SafeAreaProvider, null, createElement(Root)))

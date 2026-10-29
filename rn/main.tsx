// The prototype's entrypoint: the whole root program, with the adapters React Native needs, drawn by React.
import * as Tea from '@fgaudo/effect-tea'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as FetchHttpClient from 'effect/http/FetchHttpClient'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import * as SqlResolver from 'effect/sql/SqlResolver'
import { AppRegistry } from 'react-native'
import * as About from '#app/children/about/layer.ts'
import * as AddProductsSql from '#app/children/add-products/services/add-products/add-products.sql.ts'
import * as AddDateOrderSql from '#app/children/add-products/services/date-order-setting/date-order-setting.sql.ts'
import * as ProductLookup from '#app/children/add-products/services/product-lookup/product-lookup.open-food-facts.ts'
import * as EditProduct from '#app/children/edit-product/layer.ts'
import * as Products from '#app/children/home/children/products/layer.ts'
import * as App from '#app/program.ts'
import { ProductStore } from '#infrastructure/storage/products.ts'
import * as Day from '#libs/dates/day.ts'
import * as Platform from './platform.ts'
import { makeRenderer } from './renderer.tsx'
import * as Sqlite from './sqlite.op-sqlite.ts'
import { view } from './view.tsx'

const pages = Layer.mergeAll(
  Products.layer,
  Platform.viewport,
  // AddProducts' layer, with the browser's scanner left out.
  AddProductsSql.layer,
  AddDateOrderSql.layer,
  ProductLookup.layer,
  Platform.scanner,
  EditProduct.layer,
  About.layer,
  Platform.haptics,
)

// One connection: the pages' adapters and the later write share it.
const layer = Layer.mergeAll(
  pages.pipe(Layer.provideMerge(Layer.mergeAll(Sqlite.layer, FetchHttpClient.layer))),
  Platform.backButton,
  DateTime.layerCurrentZoneLocal,
  Layer.succeed(References.MinimumLogLevel, 'Debug'),
)

// A write a few seconds after the start, while Home's list observes the storage: it shows only if op-sqlite's
// update hook reaches `sql.reactive`.
const laterWrite = Effect.gen(function*() {
  yield* Effect.sleep('3 seconds')
  const { insert } = yield* ProductStore
  const now = yield* DateTime.nowInCurrentZone
  yield* SqlResolver.request({
    name: `Written at ${DateTime.formatIso(now)}`,
    creationDate: DateTime.toUtc(now),
    maybeExpirationDate: Opt.some(Day.addDays(Day.fromDateTime(now), 2)),
  }, insert)
  yield* Effect.logInfo('Wrote a product after the start')
}).pipe(Effect.provide(ProductStore.layer))

const { Root, render } = makeRenderer(view)

Effect.runFork(
  Effect.gen(function*() {
    yield* Effect.forkChild(laterWrite)
    yield* Tea.run(App.program, render)
  }).pipe(
    Effect.provide(layer),
    Effect.tapCause((cause) => Effect.logError('The app crashed', cause)),
  ),
)

AppRegistry.registerComponent('Fridgy', () => Root)

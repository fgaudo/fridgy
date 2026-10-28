// The root's tests act like a user: each message is one the shown page's model
// holds, never one built by hand. Nothing runs by itself: a command runs,
// on the app's layer over a database in memory, and a subscription sends, when the test says so.
import { type Rehearsal, rehearse } from '@fgaudo/effect-tea/testing'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as HttpClient from 'effect/http/HttpClient'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import { Haptics } from '#infrastructure/haptics/haptics.ts'
import * as SqliteMemory from '#infrastructure/storage/sqlite.memory.ts'
import type { DateOrder } from '#libs/dates/date-order.ts'
import { tagPath } from '#libs/testing/tag-path.test_support.ts'
import type * as AddProducts from './children/add-products/program.ts'
import { ProductLookup } from './children/add-products/services/product-lookup/product-lookup.ts'
import { Scanner } from './children/add-products/services/scanner/scanner.ts'
import type * as EditProduct from './children/edit-product/program.ts'
import type * as Products from './children/home/children/products/program.ts'
import type * as Home from './children/home/program.ts'
import * as App from './layer.ts'
import { type Command, type Deps, type Message, type Model, program, type State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

export type User = Rehearsal<State, Model, Message, Command, never, Deps>

/** A message of the shown page, when its model holds it, as the root receives it. */
export type Choice = (model: Model) => Opt.Option<Message>

// The models hold each program's own messages: wrapped here as the view's `dispatchTo` wraps them.
const onHome = (pick: (model: Home.Model) => Opt.Option<Home.Message>): Choice => ({ page }) =>
  page._tag === 'Home' ? Opt.map(pick(page.model), (message) => Msg.Home({ message })) : Opt.none()

const onAddProducts = (pick: (model: AddProducts.Model) => Opt.Option<AddProducts.Message>): Choice => ({ page }) =>
  page._tag === 'AddProducts' ? Opt.map(pick(page.model), (message) => Msg.AddProducts({ message })) : Opt.none()

const onEditProduct = (pick: (model: EditProduct.Model) => Opt.Option<EditProduct.Message>): Choice => ({ page }) =>
  page._tag === 'EditProduct' ? Opt.map(pick(page.model), (message) => Msg.EditProduct({ message })) : Opt.none()

export const openMenu = onHome(({ menu }) => menu._tag === 'Closed' ? Opt.some(menu.open) : Opt.none())

export const requestInfo = onHome(({ menu }) => menu._tag === 'Open' ? Opt.some(menu.requestInfo) : Opt.none())

/** About is reached from Home's menu. */
export const openAbout = [openMenu, requestInfo]

/** The page that adds products is reached from Home's button. */
export const openAddProducts = onHome(({ add }) => Opt.some(add))

/** The answer to the page that adds products, which asks when it opens whether the device can read barcodes. */
export const checkCamera = (user: User) => user.run((command) => tagPath(command) === 'AddProducts › CheckCamera')

// Home's child draws its pieces in Home: its messages are wrapped twice.
const onProducts = (pick: (model: Products.Model) => Opt.Option<Products.Message>): Choice =>
  onHome(({ products }) => Opt.map(pick(products), (message) => ({ _tag: 'Products', message })))

/** A long press on the first product of the list, which selects it. */
export const selectFirstProduct = onProducts(({ list }) =>
  list._tag === 'Available' && list.products[0]._tag !== 'Corrupt' ? list.products[0].selection.maybeToggle : Opt.none()
)

/** A tap on the first product of the list: it opens the product, or toggles it once something is selected. */
export const tapFirstProduct = onProducts(({ list }) =>
  list._tag === 'Available' && list.products[0]._tag !== 'Corrupt' ? list.products[0].selection.maybeTap : Opt.none()
)

/** The contextual top app bar's delete button. */
export const deleteSelected = onProducts(({ list }) =>
  list._tag === 'Available' && list.deletion._tag === 'Possible' ? Opt.some(list.deletion.deleteSelected) : Opt.none()
)

/** The snackbar's "Undo", while the last deletion can be undone. */
export const undoDeletion = onProducts(({ lastDeletion }) =>
  lastDeletion._tag === 'Deleted' ? lastDeletion.maybeUndo : Opt.none()
)

export const typeName = (name: string) =>
  onAddProducts((form) => form._tag === 'Naming' ? Opt.some(form.changeName(name)) : Opt.none())

/** The name field's clear button, while there is a name. */
export const clearName = onAddProducts((form) => form._tag === 'Naming' ? form.maybeClearName : Opt.none())

/** The first step's "Set expiration", while the name is a product's. */
export const requestDate = onAddProducts((form) => form._tag === 'Naming' ? form.maybeRequestDate : Opt.none())

/** The keypad's key of a digit, on the second step, while a digit can be typed. */
export const typeDigit = (digit: AddProducts.Digit) =>
  onAddProducts((form) => form._tag === 'Dating' ? Opt.map(form.maybeTypeDigit, (type) => type(digit)) : Opt.none())

/** A segment of the second step's segmented button: an order other than the one in use, once it is known. */
export const pickOrder = (picked: DateOrder) =>
  onAddProducts((form) =>
    form._tag === 'Dating' && form.order._tag === 'Known'
      ? Arr.findFirst(form.order.choices, ({ order }) => order === picked).pipe(
        Opt.flatMap(({ choice }) => choice._tag === 'Offered' ? choice.maybePick : Opt.none()),
      )
      : Opt.none()
  )

/** The name field's scan button, while the camera is on. */
export const openScanner = onAddProducts((form) => form._tag === 'Naming' ? form.maybeScan : Opt.none())

/** Opens the scanner, which reads `barcode`: the page then looks it up. */
export const scan = Effect.fnUntraced(function*(user: User, barcode: string) {
  yield* user.send(openScanner)
  yield* user.hear(['AddProducts', 'scanner'], Msg.AddProducts({ message: { _tag: 'Scanned', barcode } }))
})

/** The first step's "Cancel", while a scanned barcode is looked up. */
export const cancelLookup = onAddProducts((form) =>
  form._tag === 'LookingUp' ? Opt.some(form.cancelLookup) : Opt.none()
)

/** The button that adds the product the step describes: on the first step, one that never expires. */
export const addProduct = onAddProducts((form) =>
  form._tag === 'Naming' || form._tag === 'Dating' ? form.maybeAdd : Opt.none()
)

/** The page that edits a product shows its fields once it knows the time and the order of a date's digits. */
export const loadEditPage = Effect.fnUntraced(function*(user: User) {
  yield* user.hearNext(['EditProduct', 'clock'])
  yield* user.hearNext(['EditProduct', 'date-order'])
})

export const typeEditedName = (name: string) =>
  onEditProduct((form) => form._tag === 'Editing' ? Opt.some(form.changeName(name)) : Opt.none())

/** The keypad's clear key, on the page that edits a product, while there are digits. */
export const clearEditedDate = onEditProduct((form) => form._tag === 'Editing' ? form.maybeClearDate : Opt.none())

/** "Save", on the page that edits a product, once the fields describe a product other than the stored one. */
export const saveProduct = onEditProduct((form) => form._tag === 'Editing' ? form.maybeSave : Opt.none())

/** Sends each message in turn, each from the model the previous one left. */
export const perform = Effect.fnUntraced(function*(user: User, choices: ReadonlyArray<Choice>) {
  for (const choice of choices) {
    yield* user.send(choice)
  }
})

/** The back button, heard by the shown page; the test fails when the page does not observe it. */
export const back = Effect.fnUntraced(function*(user: User) {
  const shown = Arr.lastNonEmpty((yield* user.state).stack)
  const pressed = Match.valueTags(shown, {
    Home: () => Msg.Home({ message: { _tag: 'BackPressed' } }),
    AddProducts: () => Msg.AddProducts({ message: { _tag: 'BackPressed' } }),
    EditProduct: () => Msg.EditProduct({ message: { _tag: 'BackPressed' } }),
    About: () => Msg.About({ message: { _tag: 'BackPressed' } }),
  })
  yield* user.hear([shown._tag, 'back-button'], pressed)
})

// The platform's back button is out of reach: it is heard through `back`.
const backButton = Layer.succeed(BackButton, { presses: Channel.never })

// A device without a vibrator: a vibration does nothing, and answers nothing.
const haptics = Layer.succeed(Haptics, { perform: () => Effect.void })

/** Whether the command is a vibration, of any page. */
const isVibration = (command: Command) => tagPath(command).endsWith(' › Vibrate')

/** The commands still pending that would write or answer: what a vibration is not. */
export const pendingWork = (user: User) => Effect.map(user.pending, Arr.filter((command) => !isVibration(command)))

/** Runs the vibrations still pending: what a scenario leaves of them is not its concern. */
const vibrateAll = (user: User): Effect.Effect<void, never, Deps> =>
  Effect.flatMap(
    user.pending,
    (pending) => Arr.some(pending, isVibration) ? Effect.andThen(user.run(isVibration), vibrateAll(user)) : Effect.void,
  )

// A device that reads barcodes, whose camera reads nothing by itself: the barcodes are heard through `hear`.
const scanner = Layer.succeed(Scanner, { isAvailable: Effect.succeed(true), barcodes: Channel.never })

// A lookup that never answers by itself: its answers are heard through `hear`.
const productLookup = Layer.succeed(ProductLookup, { lookup: () => Effect.never })

// The app's layer holds the browser's scanner, which cannot read barcodes here, and the lookup on Open Food Facts,
// which the tests do not reach: merged after it, the test's ones win, as the last of a merge does. Its client
// is never asked.
const layer = Layer.mergeAll(
  App.layer.pipe(
    Layer.provide([
      SqliteMemory.layer,
      Layer.succeed(HttpClient.HttpClient, HttpClient.make(() => Effect.die('No network in tests'))),
    ]),
  ),
  backButton,
  haptics,
  scanner,
  productLookup,
)

/** Rehearses the app from its start; fails when a command other than a vibration is still pending at the end. */
export const rehearsed = <A>(scenario: (user: User) => Effect.Effect<A, never, Deps>) =>
  Effect.runPromise(
    rehearse(program, (user) => Effect.tap(scenario(user), () => vibrateAll(user))).pipe(
      Effect.provide(layer),
      // Every rehearsal builds a storage, which logs that it is ready: only warnings are worth showing.
      Effect.provideService(References.MinimumLogLevel, 'Warn'),
    ),
  )

// The root's tests act like a user: each message is one the shown page's model
// holds, never one built by hand. Nothing runs by itself: a command runs,
// on the app's layer over a database in memory, and a subscription sends, when the test says so.
import type * as Tea from '@fgaudo/effect-tea'
import { type Rehearsal, rehearse } from '@fgaudo/effect-tea/testing'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import * as TestClock from 'effect/testing/TestClock'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import { BarcodeCamera } from '#infrastructure/barcode-camera/barcode-camera.ts'
import { Haptics } from '#infrastructure/haptics/haptics.ts'
import { Keyboard } from '#infrastructure/keyboard/keyboard.ts'
import { Links } from '#infrastructure/links/links.ts'
import { ProductLookup } from '#infrastructure/product-lookup/product-lookup.ts'
import * as SqliteMemory from '#infrastructure/storage/sqlite.memory.ts'
import type { DateOrder } from '#libs/dates/date-order.ts'
import type * as Day from '#libs/dates/day.ts'
import * as DigitDates from '#libs/dates/digit-dates.ts'
import { tagPath } from '#libs/testing/tag-path.test_support.ts'
import type * as About from './children/about/program.ts'
import type * as AddProducts from './children/add-products/program.ts'
import type * as EditProduct from './children/edit-product/program.ts'
import type * as Products from './children/home/children/products/program.ts'
import type * as Home from './children/home/program.ts'
import * as App from './layer.ts'
import { type Command, type Message, type Model, program } from './program.ts'
import type * as Expiration from './programs/expiration/program.ts'

/** The whole state of the app: the root's own, and the pages the library keeps. */
export type State = Tea.StateOf<typeof program>

/** A key of the app's subscriptions, as the root lists it. */
type Key = Tea.KeyOf<typeof program>

/** What the app's commands and subscriptions need: what the test's layer gives. */
type Deps = Tea.CommandServicesOf<typeof program> | Tea.SubscriptionServicesOf<typeof program>

export type User = Rehearsal<
  State,
  Model,
  Message,
  Command,
  never,
  Tea.CommandServicesOf<typeof program>,
  Tea.SubscriptionServicesOf<typeof program>
>

/** A message of the shown page, when its model holds it, as the root receives it. */
export type Choice = (model: Model) => Opt.Option<Message>

// The models hold each program's own messages: wrapped here as the view's `forwardTo` wraps them, a page over Home
// by the number of its visit.
export const onHome = (pick: (model: Home.Model) => Opt.Option<Home.Message>): Choice => ({ page }) =>
  page._tag === 'Home' ? Opt.map(pick(page.model), (message) => ({ _tag: 'Home', message })) : Opt.none()

const onAddProducts = (pick: (model: AddProducts.Model) => Opt.Option<AddProducts.Message>): Choice => ({ page }) =>
  page._tag === 'AddProducts'
    ? Opt.map(pick(page.model), (message) => ({ _tag: 'AddProducts', id: page.visit, message }))
    : Opt.none()

const onEditProduct = (pick: (model: EditProduct.Model) => Opt.Option<EditProduct.Message>): Choice => ({ page }) =>
  page._tag === 'EditProduct'
    ? Opt.map(pick(page.model), (message) => ({ _tag: 'EditProduct', id: page.visit, message }))
    : Opt.none()

const onAbout = (pick: (model: About.Model) => Opt.Option<About.Message>): Choice => ({ page }) =>
  page._tag === 'About'
    ? Opt.map(pick(page.model), (message) => ({ _tag: 'About', id: page.visit, message }))
    : Opt.none()

/** The number of the visit of the page shown over Home: the test fails on Home. */
export const visitShown = (user: User) =>
  Effect.flatMap(
    user.model,
    ({ page }) =>
      page._tag === 'Home' ? Effect.die(new Error('Home is shown: no page is visited')) : Effect.succeed(page.visit),
  )

/** A key by what it is, without its data: its tag, then those of what it wraps (`Home › Products › changes`). */
const keyPath = (key: unknown): string =>
  typeof key === 'string'
    ? key
    : typeof key === 'object' && key !== null && '_tag' in key && typeof key._tag === 'string'
    ? 'key' in key ? `${key._tag} › ${keyPath(key.key)}` : key._tag
    : String(key)

/** What the app listens to in a state, each key by what it is. */
export const listenedIn = (state: State) => Arr.map(program.subscriptions(state), keyPath)

/** The key that `path` names among those of the current state: the test fails when there is none. */
const keyAt = (user: User, path: string): Effect.Effect<Key> =>
  Effect.flatMap(
    user.state,
    (state) =>
      Opt.match(Arr.findFirst(program.subscriptions(state), (key) => keyPath(key) === path), {
        onNone: () => Effect.die(new Error(`No subscription under ${path}: ${listenedIn(state).join(', ')}`)),
        onSome: Effect.succeed,
      }),
  )

/** The next message of the subscription that `path` names, heard as it sends it. */
export const hearNext = (user: User, path: string) => Effect.flatMap(keyAt(user, path), user.hearNext)

/** `message`, as the subscription that `path` names would send it: the subscription does not run. */
export const hear = (user: User, path: string, message: Message) =>
  Effect.flatMap(keyAt(user, path), (key) => user.hear(key, message))

export const openMenu = onHome(({ menu }) => menu._tag === 'Closed' ? Opt.some(menu.open) : Opt.none())

export const requestInfo = onHome(({ menu }) => menu._tag === 'Open' ? Opt.some(menu.requestInfo) : Opt.none())

/** About is reached from Home's menu. */
export const openAbout = [openMenu, requestInfo]

/** About's own back button, in the top app bar. */
export const closeAbout = onAbout(({ back }) => Opt.some(back))

/** The page that adds products is reached from Home's button. */
export const openAddProducts = onHome(({ add }) => Opt.some(add))

/** The close button of the page that adds products, on the first step. */
export const closeAddProducts = onAddProducts((form) =>
  form._tag === 'Naming' || form._tag === 'LookingUp' ? Opt.some(form.close) : Opt.none()
)

/** The answer to the page that adds products, which asks when it opens whether the device can read barcodes. */
export const checkCamera = (user: User) => user.run((command) => tagPath(command) === 'AddProducts › CheckCamera')

// Home's child draws its pieces in Home: its messages are wrapped twice.
const onProducts = (pick: (model: Products.Model) => Opt.Option<Products.Message>): Choice =>
  onHome(({ products }) => Opt.map(pick(products), (message) => ({ _tag: 'Products', message })))

/** A long press on the first product of the list, which selects it. */
export const selectFirstProduct = onProducts(({ list }) =>
  list._tag === 'Available' ? list.products[0].selection.maybeToggle : Opt.none()
)

/** A tap on the first product of the list: it opens the product, or toggles it once something is selected. */
export const tapFirstProduct = onProducts(({ list }) =>
  list._tag === 'Available' ? list.products[0].selection.maybeTap : Opt.none()
)

/** The contextual top app bar's delete button. */
export const deleteSelected = onProducts(({ list }) =>
  list._tag === 'Available' && list.deletion._tag === 'Possible' ? Opt.some(list.deletion.deleteSelected) : Opt.none()
)

/** The snackbar's "Undo", while the last deletion can be undone. */
export const undoDeletion = onProducts(({ snackbar }) =>
  Opt.flatMap(snackbar, ({ notice }) => notice._tag === 'Deleted' ? notice.maybeUndo : Opt.none())
)

/** What the name field gives as the user types `name`, on the first step. */
export const typeName = (name: string) =>
  onAddProducts((form) => form._tag === 'Naming' ? Opt.some({ ...form.nameTyped, value: name }) : Opt.none())

/** The name field's clear button, while there is a name. */
export const clearName = onAddProducts((form) => form._tag === 'Naming' ? form.maybeClearName : Opt.none())

/** The first step's "Set expiration", while the name is a product's. */
export const requestDate = onAddProducts((form) => form._tag === 'Naming' ? form.maybeRequestDate : Opt.none())

/** The name field's scan button, while the camera is on. */
export const openScanner = onAddProducts((form) => form._tag === 'Naming' ? form.maybeScan : Opt.none())

/** Opens the scanner, which reads `barcode`: the page then looks it up. */
export const scan = Effect.fnUntraced(function*(user: User, barcode: string) {
  yield* user.send(openScanner)
  const id = yield* visitShown(user)
  yield* hear(user, 'AddProducts › scanner', { _tag: 'AddProducts', id, message: { _tag: 'Scanned', barcode } })
})

/** The first step's "Cancel", while a scanned barcode is looked up. */
export const cancelLookup = onAddProducts((form) =>
  form._tag === 'LookingUp' ? Opt.some(form.cancelLookup) : Opt.none()
)

/** The button that adds the product the step describes: on the first step, one that never expires. */
export const addProduct = onAddProducts((form) =>
  form._tag === 'Naming' || form._tag === 'Dating' ? form.maybeAdd : Opt.none()
)

/** The expiration date's controls, on either page that shows them: the page's child, wrapped as its view wraps it. */
const onExpiration = (pick: (model: Expiration.Model) => Opt.Option<Expiration.Message>): Choice => (model) =>
  model.page._tag === 'AddProducts'
    ? onAddProducts((form) =>
      form._tag === 'Dating'
        ? Opt.map(pick(form.expiration), (message) => ({ _tag: 'Expiration', message }))
        : Opt.none()
    )(model)
    : onEditProduct((form) =>
      form._tag === 'Editing'
        ? Opt.map(pick(form.expiration), (message) => ({ _tag: 'Expiration', message }))
        : Opt.none()
    )(model)

/** The keypad's key of a digit, while a digit can be typed. */
export const typeDigit = (digit: Expiration.Digit) =>
  onExpiration(({ maybeKeys }) =>
    Opt.flatMap(maybeKeys, ({ maybeTypeDigit }) => Opt.map(maybeTypeDigit, (keys) => keys[digit]))
  )

/** The keypad's clear key, while there are digits. */
export const clearDate = onExpiration(({ maybeKeys }) => Opt.flatMap(maybeKeys, ({ maybeClearDate }) => maybeClearDate))

/** A segment of the segmented button: an order other than the one in use, once it is known. */
export const pickOrder = (picked: DateOrder) =>
  onExpiration(({ order }) =>
    order._tag === 'Known'
      ? Arr.findFirst(order.choices, ({ order }) => order === picked).pipe(
        Opt.flatMap(({ choice }) => choice._tag === 'Offered' ? choice.maybePick : Opt.none()),
      )
      : Opt.none()
  )

/** The expiration's model, on either page that shows it. */
export const expirationShown = ({ page }: Model): Opt.Option<Expiration.Model> =>
  page._tag === 'AddProducts' && page.model._tag === 'Dating'
    ? Opt.some(page.model.expiration)
    : page._tag === 'EditProduct' && page.model._tag !== 'Loading'
    ? Opt.some(page.model.expiration)
    : Opt.none()

/** The order the date's digits are read in, once the page shows it. */
export const orderShown = (model: Model): Opt.Option<DateOrder> =>
  Opt.flatMap(expirationShown(model), ({ order }) => order._tag === 'Known' ? Opt.some(order.order) : Opt.none())

/** Types `day` on the keypad, in the order the page shows. */
export const typeDay = Effect.fnUntraced(function*(user: User, day: Day.Day) {
  const order = Opt.getOrThrowWith(orderShown(yield* user.model), () => new Error('The order is not shown'))
  yield* perform(user, Arr.map([...DigitDates.digitsOf(day, order)], (digit) => typeDigit(digit as Expiration.Digit)))
})

/** The page that edits a product shows its fields once it knows the time and the order of a date's digits. */
export const loadEditPage = Effect.fnUntraced(function*(user: User) {
  yield* hearNext(user, 'EditProduct › clock')
  // The date is there from the clock's first tick.
  yield* hearNext(user, 'EditProduct › Expiration › date-order')
})

/** What the name field gives as the user types `name`, while it takes input. */
export const typeEditedName = (name: string) =>
  onEditProduct((form) => form._tag === 'Editing' ? Opt.some({ ...form.nameTyped, value: name }) : Opt.none())

/** "Save", on the page that edits a product, once the fields describe a product other than the stored one. */
export const saveProduct = onEditProduct((form) => form._tag === 'Editing' ? form.maybeSave : Opt.none())

/** Sends each message in turn, each from the model the previous one left. */
export const perform = Effect.fnUntraced(function*(user: User, choices: ReadonlyArray<Choice>) {
  for (const choice of choices) {
    yield* user.send(choice)
  }
})

/** The press of the back button, as the program that observes it under `key` hears it. */
const pressedUnder = (key: Key): Opt.Option<Message> =>
  keyPath(key).endsWith(' › back-button')
    ? Opt.some(Match.valueTags(key, {
      Home: (): Message =>
        keyPath(key) === 'Home › back-button'
          ? { _tag: 'Home', message: { _tag: 'BackPressed' } }
          : { _tag: 'Home', message: { _tag: 'Products', message: { _tag: 'BackPressed' } } },
      AddProducts: ({ id }): Message => ({ _tag: 'AddProducts', id, message: { _tag: 'BackPressed' } }),
      EditProduct: ({ id }): Message => ({ _tag: 'EditProduct', id, message: { _tag: 'BackPressed' } }),
      About: ({ id }): Message => ({ _tag: 'About', id, message: { _tag: 'BackPressed' } }),
    }))
    : Opt.none()

/** The back button, heard by the program that observes it; the test fails when none does. */
export const back = Effect.fnUntraced(function*(user: User) {
  const state = yield* user.state
  const observers = Arr.getSomes(
    Arr.map(program.subscriptions(state), (key) => Opt.map(pressedUnder(key), (pressed) => ({ key, pressed }))),
  )
  // On Home, the list observes the button while it shows a selection, and Home while its menu is open: the list is
  // the last observer.
  const observer = Opt.orElse(
    Arr.findFirst(observers, ({ key }) => keyPath(key) === 'Home › Products › back-button'),
    () => Arr.head(observers),
  )
  const { key, pressed } = Opt.getOrThrowWith(observer, () => new Error('No program observes the back button'))
  yield* user.hear(key, pressed)
})

// The platform's back button is out of reach: it is heard through `back`.
const backButton = Layer.succeed(BackButton, { presses: Channel.never })

// A keyboard that never comes up: the pages are drawn whole.
const keyboard = Layer.succeed(Keyboard, { insets: Channel.never })

// A device without a vibrator: a vibration does nothing, and answers nothing.
const haptics = Layer.succeed(Haptics, { perform: () => Effect.void })

// A device that opens no link: a press does nothing that a test sees.
const links = Layer.succeed(Links, { open: () => Effect.void })

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
const barcodeCamera = Layer.succeed(BarcodeCamera, { isAvailable: Effect.succeed(true), barcodes: Channel.never })

// A lookup that never answers by itself: its answers are heard through `hear`.
const productLookup = Layer.succeed(ProductLookup, { lookup: () => Effect.never })

// The app's stores, over a database in memory, and the test's own device. A service left out fails the typecheck
// of `rehearsed`.
const layer = Layer.mergeAll(
  App.layer.pipe(Layer.provide(SqliteMemory.layer)),
  backButton,
  barcodeCamera,
  haptics,
  keyboard,
  links,
  productLookup,
)

/**
 * Rehearses the app from its start; fails when a command other than a vibration is still pending at the end. The
 * device is in `zone`, UTC unless given. At `time`, a test clock stands still: a timer never ends.
 */
export const rehearsed = <A>(
  scenario: (user: User) => Effect.Effect<A, never, Deps>,
  { zone = 'UTC', maybeTime = Opt.none() }: Readonly<{ zone?: string; maybeTime?: Opt.Option<DateTime.Utc> }> = {},
) =>
  Effect.runPromise(
    rehearse(program, (user) => Effect.tap(scenario(user), () => vibrateAll(user))).pipe(
      Effect.provide(layer),
      Effect.provideService(DateTime.CurrentTimeZone, DateTime.zoneMakeNamedUnsafe(zone)),
      (rehearsal) =>
        Opt.match(maybeTime, {
          onNone: () => rehearsal,
          onSome: (time) =>
            Effect.andThen(TestClock.setTime(DateTime.toEpochMillis(time)), rehearsal).pipe(
              Effect.provide(TestClock.layer()),
            ),
        }),
      // Every rehearsal builds a storage, which logs that it is ready: only warnings are worth showing.
      Effect.provideService(References.MinimumLogLevel, 'Warn'),
    ),
  )

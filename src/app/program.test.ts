import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as DigitDates from '#libs/dates/digit-dates.ts'
import { tagPath } from '#libs/testing/tag-path.test_support.ts'
import { outcomesOf } from '#libs/testing/update.test_support.ts'
import * as About from './children/about/program.ts'
import * as AddProducts from './children/add-products/program.ts'
import * as Home from './children/home/program.ts'
import { type Message, type Page, program, type State } from './program.ts'
import {
  addProduct,
  back,
  cancelLookup,
  checkCamera,
  clearEditedDate,
  clearName,
  deleteSelected,
  loadEditPage,
  openAbout,
  openAddProducts,
  openMenu,
  perform,
  pickOrder,
  rehearsed,
  requestDate,
  requestInfo,
  saveProduct,
  scan,
  selectFirstProduct,
  tapFirstProduct,
  typeDigit,
  typeEditedName,
  typeName,
  type User,
  undoDeletion,
} from './user.test_support.ts'
import { view } from './view.tsx'

const Page = Data.taggedEnum<Page>()
const Msg = Data.taggedEnum<Message>()
const HomeMsg = Data.taggedEnum<Home.Message>()
const AddProductsMsg = Data.taggedEnum<AddProducts.Message>()

const { step } = outcomesOf(program.update)

const tags = (state: State) => state.stack.map((page) => page._tag)

/** The state of Home, wherever it is in the stack. */
const homeState = (state: State) =>
  Opt.map(
    Arr.findFirst(state.stack, (page): page is Data.TaggedEnum.Value<Page, 'Home'> => page._tag === 'Home'),
    (page) => page.state,
  )

/** Whether the page that adds products looks a barcode up: its subscription's key is `lookup:<barcode>`. */
const looksUp = (state: State) =>
  Arr.some(
    Arr.fromIterable(HashMap.keys(Tea.subscriptionsOf(program)(state))),
    (key) => Array.isArray(key) && key[0] === 'AddProducts' && String(key[1]).startsWith('lookup:'),
  )

/** The pages whose subscriptions run, from the namespaced keys (`['Home', 'clock']`, …). */
const subscribedPages = (state: State) =>
  new Set(
    Array.from(HashMap.keys(Tea.subscriptionsOf(program)(state))).flatMap((key) => Array.isArray(key) ? [key[0]] : []),
  )

describe('Navigation', () => {
  test('starts on Home', () => {
    expect(tags(program.init.state)).toEqual(['Home'])
  })

  test('starts Home as Home starts, with its commands', () => {
    expect(homeState(program.init.state)).toEqual(Opt.some(Home.program.init.state))
    expect(program.init.commands).toEqual(
      (Home.program.init.commands ?? []).map((command) => ({ _tag: 'Home', command })),
    )
  })

  test('Home opens About on top, which loads its data', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      expect(tags(yield* user.state)).toEqual(['Home', 'About'])
      expect((yield* user.pending).map(tagPath)).toEqual(['About › LoadLicenses', 'About › LoadVersion'])
      yield* user.runAll
    })))

  // The menu's item tapped twice from the same frame: the second tap reaches a
  // state that has moved on, which the program ignores.
  test('About opens once on a double tap', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openMenu)
      const entry = requestInfo(yield* user.model)
      yield* user.send(() => entry)
      const state = yield* user.state
      expect(tags(state)).toEqual(['Home', 'About'])
      expect(Opt.map(entry, (message) => Tea.isRejected(program.update(message)(state)))).toEqual(Opt.some(true))
      yield* user.runAll
    })))

  // Home asks for About only from its menu, which the first request closes, so no user reaches this; the root
  // does not rely on how Home filters, though: a request for the page shown changes nothing, as it does for
  // AddProducts, which Home asks for on every tap.
  test('About requested while it is shown stays as it is, and is not started again', () => {
    const shown: State = {
      stack: [
        Page.Home({ state: { ...Home.program.init.state, isMenuOpen: true } }),
        Page.About({ state: About.program.init.state }),
      ],
    }
    const { after, commands } = step(Msg.Home({ message: HomeMsg.InfoRequested() }), shown)
    expect(tags(after)).toEqual(['Home', 'About'])
    expect(commands).toEqual([])
  })

  // A page asks to be left from its view or its back button, both its own only while it is shown, so the stack
  // the app builds never has one under another. Were it to, the root would not leave the wrong page.
  test('a page asking to be left while another is shown is a defect', () => {
    const covered: State = {
      stack: [
        Page.Home({ state: Home.program.init.state }),
        Page.AddProducts({ state: AddProducts.program.init.state }),
        Page.About({ state: About.program.init.state }),
      ],
    }
    expect(() => program.update(Msg.AddProducts({ message: AddProductsMsg.BackPressed() }))(covered)).toThrow()
  })

  // About left while its data loads, and opened again: a command cannot be cancelled, and its answer goes to
  // the About that is there when it arrives, so the second visit is loaded by the first one's answers, then
  // hears its own. This is why About accepts a load that completes on a page already loaded.
  test('About opened again while its first loads were pending is loaded once they all complete', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      yield* back(user)
      expect((yield* user.pending).map(tagPath)).toEqual(['About › LoadLicenses', 'About › LoadVersion'])
      yield* perform(user, openAbout)
      expect((yield* user.pending).length).toBe(4)
      yield* user.runAll
      const about = Arr.findFirst(
        (yield* user.state).stack,
        (page): page is Data.TaggedEnum.Value<Page, 'About'> => page._tag === 'About',
      )
      expect(Opt.map(about, ({ state }) => [state.licenses._tag, state.version._tag])).toEqual(
        Opt.some(['Loaded', 'Loaded']),
      )
    })))

  // Snabbdom patches an element with the same tag and key in place, keeping the
  // props the new page does not set: Home's `scroll-locked` stopped About from scrolling. Keyed by the page's
  // name, each page's element is its own, and leaves with its own transition.
  test('each page is drawn in an element of its own', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const drawn = Effect.map(user.model, (model) => view(model, () => Effect.void).key)
      expect(yield* drawn).toBe('Home')
      yield* perform(user, openAbout)
      expect(yield* drawn).toBe('About')
      yield* user.runAll
    })))

  test('back from About returns to Home, as it was', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      yield* user.runAll
      yield* back(user)
      const state = yield* user.state
      expect(tags(state)).toEqual(['Home'])
      expect(yield* user.pending).toEqual([])
      // Opening About closed the menu: Home is otherwise untouched.
      expect(Opt.map(homeState(state), (home) => home.isMenuOpen)).toEqual(Opt.some(false))
    })))

  test('back on Home first closes what is open', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openMenu)
      yield* back(user)
      const state = yield* user.state
      expect(tags(state)).toEqual(['Home'])
      expect(Opt.map(homeState(state), (home) => home.isMenuOpen)).toEqual(Opt.some(false))
      expect(yield* user.pending).toEqual([])
    })))

  // The add button tapped twice from the same frame: the second tap asks Home again, which changes nothing.
  test('Home opens the page that adds products on top, once on a double tap', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const add = openAddProducts(yield* user.model)
      yield* user.send(() => add)
      yield* user.send(() => add)
      expect(tags(yield* user.state)).toEqual(['Home', 'AddProducts'])
      expect((yield* user.pending).map(tagPath)).toEqual(['AddProducts › CheckCamera'])
      yield* checkCamera(user)
    })))

  // The check of the first opening answers the second page, and the second check finds the camera known.
  test('the page that adds products, opened again before its camera check answered, takes both answers', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openAddProducts)
      yield* back(user)
      yield* user.send(openAddProducts)
      expect((yield* user.pending).map(tagPath)).toEqual(['AddProducts › CheckCamera', 'AddProducts › CheckCamera'])
      yield* checkCamera(user)
      yield* checkCamera(user)
      expect(tags(yield* user.state)).toEqual(['Home', 'AddProducts'])
      expect((yield* user.ignored).map(tagPath)).toEqual(['AddProducts › CameraChecked'])
    })))

  /** The names of the valid products in Home's list. */
  const listedNames = (user: User) =>
    Effect.map(
      user.state,
      (state) =>
        Opt.map(homeState(state), ({ products: { list } }) =>
          list._tag === 'Loaded'
            ? list.items.flatMap((item): ReadonlyArray<string> => item._tag === 'Valid' ? [item.product.name] : [])
            : []),
    )

  test('a product added on its page is in the list of Home once the page is left', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Milk')])
      yield* checkCamera(user)
      // The page adds a product only once it knows the time.
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* user.send(addProduct)
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      yield* back(user)
      expect(tags(yield* user.state)).toEqual(['Home'])
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk']))
    })))

  test('a barcode read by the scanner is looked up, and the product found names the product added', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openAddProducts)
      // The scanner is offered once the page knows that the device can read barcodes.
      yield* checkCamera(user)
      yield* scan(user, '4006381333931')
      yield* user.hear(
        ['AddProducts', 'lookup:4006381333931'],
        Msg.AddProducts({
          message: AddProductsMsg.LookedUp({
            barcode: '4006381333931',
            outcome: { _tag: 'Found', name: 'Milk', url: 'https://world.openfoodfacts.org/product/4006381333931' },
          }),
        }),
      )
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* user.send(addProduct)
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      yield* back(user)
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk']))
    })))

  test('a barcode unknown to Open Food Facts names the product added', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openAddProducts)
      yield* checkCamera(user)
      yield* scan(user, '4006381333931')
      yield* user.hear(
        ['AddProducts', 'lookup:4006381333931'],
        Msg.AddProducts({
          message: AddProductsMsg.LookedUp({ barcode: '4006381333931', outcome: { _tag: 'NotFound' } }),
        }),
      )
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* user.send(addProduct)
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      yield* back(user)
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(yield* listedNames(user)).toEqual(Opt.some(['4006381333931']))
    })))

  // The page waits for the lookup: the name it would add may be replaced a moment later.
  test('a lookup cancelled stops, and the barcode names the product added', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openAddProducts)
      yield* checkCamera(user)
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* scan(user, '4006381333931')
      expect(looksUp(yield* user.state)).toBe(true)
      expect(addProduct(yield* user.model)).toEqual(Opt.none())
      yield* user.send(cancelLookup)
      expect(looksUp(yield* user.state)).toBe(false)
      yield* user.send(addProduct)
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      yield* back(user)
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(yield* listedNames(user)).toEqual(Opt.some(['4006381333931']))
    })))

  // The name stays once its product is added: a second package of it is one tap.
  test('a product added twice in a row from the first step is listed twice', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Milk')])
      yield* checkCamera(user)
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* user.send(addProduct)
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      // A moment later, as a user taps it again: the second is created at the clock's time.
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* user.send(addProduct)
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      yield* back(user)
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk', 'Milk']))
    })))

  // The order is the storage's when the page opens; a pick applies at once, and is kept there.
  test('the order picked for the date is kept, and the digits are read in it', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Milk')])
      yield* checkCamera(user)
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* user.hearNext(['AddProducts', 'date-order'])
      yield* perform(user, [requestDate, pickOrder('MDY')])
      yield* user.run((command) => tagPath(command) === 'AddProducts › KeepOrder')
      expect(yield* user.hearNext(['AddProducts', 'date-order'])).toEqual(
        Msg.AddProducts({ message: AddProductsMsg.OrderChanged({ order: 'MDY' }) }),
      )
      // Read month first, 1231 names December 31; day first, it would name a 31st month.
      yield* perform(user, [typeDigit('1'), typeDigit('2'), typeDigit('3'), typeDigit('1')])
      const { page } = yield* user.model
      const named = page._tag === 'AddProducts' && page.model._tag === 'Dating' && page.model.strip._tag === 'Naming'
        ? page.model.strip.choices.map(({ date }) => DateTime.toPartsUtc(date))
        : []
      expect(named.some(({ month, day }) => month === 12 && day === 31)).toBe(true)
    })))

  test('a product named anew, once the name is cleared, is listed with the first', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Milk')])
      yield* checkCamera(user)
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* user.send(addProduct)
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      yield* perform(user, [clearName, typeName('Bread'), addProduct])
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      yield* back(user)
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk', 'Bread']))
    })))

  /** Home's list: each valid product's id, name and whether it expires, in order. */
  const listed = (user: User) =>
    Effect.map(
      user.state,
      (state) =>
        Opt.map(homeState(state), ({ products: { list } }) =>
          list._tag === 'Loaded'
            ? list.items.flatMap((item): ReadonlyArray<Readonly<{ id: string; name: string; expires: boolean }>> =>
              item._tag === 'Valid'
                ? [{ id: item.id, name: item.product.name, expires: Opt.isSome(item.product.maybeExpirationDate) }]
                : []
            )
            : []),
    )

  /** Adds Salt, which never expires, then Milk, which expires at the end of 2099: Milk is listed first. */
  const addSaltAndMilk = Effect.fnUntraced(function*(user: User) {
    yield* perform(user, [openAddProducts, typeName('Salt')])
    yield* checkCamera(user)
    yield* user.hearNext(['AddProducts', 'clock'])
    const heard = yield* user.hearNext(['AddProducts', 'date-order'])
    const order = heard._tag === 'AddProducts' && heard.message._tag === 'OrderChanged' ? heard.message.order : 'DMY'
    yield* user.send(addProduct)
    yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
    yield* perform(user, [typeName('Milk'), requestDate])
    const digits = DigitDates.digitsOf(DateTime.makeUnsafe('2099-12-31T00:00:00Z'), order)
    yield* perform(user, Arr.map([...digits], (digit) => typeDigit(digit as AddProducts.Digit)))
    yield* user.send(addProduct)
    yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
    yield* back(user)
    yield* user.hearNext(['Home', ['Products', 'changes']])
    // The list is drawn once the time is known: Milk expires.
    yield* user.hearNext(['Home', ['Products', 'clock']])
  })

  // A double tap reaches a stack that has the page on top, which opens it once.
  test('a tap on a product opens the page that edits it on top, once on a double tap, with the product once loaded', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addSaltAndMilk(user)
      const tap = tapFirstProduct(yield* user.model)
      yield* user.send(() => tap)
      yield* user.send(() => tap)
      expect(tags(yield* user.state)).toEqual(['Home', 'EditProduct'])
      const loading = (yield* user.model).page
      expect(loading._tag === 'EditProduct' && loading.model._tag).toBe('Loading')
      yield* loadEditPage(user)
      const { page } = yield* user.model
      expect(page._tag === 'EditProduct' && page.model._tag === 'Editing' && page.model.name).toBe('Milk')
    })))

  test('a product renamed and saved is listed under its new name, with the same id, once the page has left', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addSaltAndMilk(user)
      const before = yield* listed(user)
      yield* user.send(tapFirstProduct)
      yield* loadEditPage(user)
      yield* perform(user, [typeEditedName('Oat milk'), saveProduct])
      yield* user.run((command) => tagPath(command) === 'EditProduct › Save')
      expect(tags(yield* user.state)).toEqual(['Home'])
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(Opt.map(yield* listed(user), Arr.map(({ id, name }) => [id, name]))).toEqual(
        Opt.map(before, Arr.map(({ id, name }) => [id, name === 'Milk' ? 'Oat milk' : name])),
      )
    })))

  test('a product whose expiration is cleared and saved is listed last, never expiring', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addSaltAndMilk(user)
      yield* user.send(tapFirstProduct)
      yield* loadEditPage(user)
      yield* perform(user, [clearEditedDate, saveProduct])
      yield* user.run((command) => tagPath(command) === 'EditProduct › Save')
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(Opt.map(yield* listed(user), Arr.map(({ name, expires }) => [name, expires]))).toEqual(
        Opt.some([['Salt', false], ['Milk', false]]),
      )
    })))

  test('back from the page that edits a product leaves it, the product as it was', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addSaltAndMilk(user)
      const before = yield* listed(user)
      yield* user.send(tapFirstProduct)
      yield* loadEditPage(user)
      yield* user.send(typeEditedName('Oat milk'))
      yield* back(user)
      expect(tags(yield* user.state)).toEqual(['Home'])
      expect(yield* user.pending).toEqual([])
      expect(yield* listed(user)).toEqual(before)
    })))

  test('a tap on a product while it is selected deselects it, and opens nothing', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addSaltAndMilk(user)
      yield* user.send(selectFirstProduct)
      yield* user.send(tapFirstProduct)
      expect(tags(yield* user.state)).toEqual(['Home'])
      expect(Opt.map(homeState(yield* user.state), ({ products }) => products.selection._tag)).toEqual(
        Opt.some('Idle'),
      )
    })))

  test('a product deleted from the list comes back when the deletion is undone in time', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Milk')])
      yield* checkCamera(user)
      yield* user.hearNext(['AddProducts', 'clock'])
      yield* user.send(addProduct)
      yield* user.run((command) => tagPath(command) === 'AddProducts › Add')
      yield* back(user)
      yield* user.hearNext(['Home', ['Products', 'changes']])
      yield* perform(user, [selectFirstProduct, deleteSelected])
      yield* user.run((command) => tagPath(command) === 'Home › Products › Delete')
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(yield* listedNames(user)).toEqual(Opt.some([]))
      yield* user.send(undoDeletion)
      yield* user.run((command) => tagPath(command) === 'Home › Products › Restore')
      yield* user.hearNext(['Home', ['Products', 'changes']])
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk']))
    })))
})

describe('Subscriptions', () => {
  test('Home listens while it is shown', () => {
    expect(subscribedPages(program.init.state)).toEqual(new Set(['Home']))
  })

  // Home's scrolling subscriptions would otherwise react to About's scrolling, e.g. scroll it to the top.
  test('a page under another one stops listening', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      expect(subscribedPages(yield* user.state).has('Home')).toBe(false)
      yield* user.runAll
    })))

  test('a page listens again once it is shown again', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      yield* user.runAll
      yield* back(user)
      expect(subscribedPages(yield* user.state)).toEqual(new Set(['Home']))
    })))

  // Otherwise the button is the platform's, which leaves the app. Each page observes the button under its own
  // key (`['Home', 'back-button']`, …): what matters here is that exactly the shown page does, when it should.
  test('the back button is observed only while the shown page has something to close', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const listensToBack = Effect.map(
        user.state,
        (state) =>
          Arr.some(
            Arr.fromIterable(HashMap.keys(Tea.subscriptionsOf(program)(state))),
            (key) => Array.isArray(key) && key[1] === 'back-button',
          ),
      )
      expect(yield* listensToBack).toBe(false)
      yield* user.send(openMenu)
      expect(yield* listensToBack).toBe(true)
      yield* back(user)
      expect(yield* listensToBack).toBe(false)
      yield* perform(user, openAbout)
      expect(yield* listensToBack).toBe(true)
      yield* user.runAll
      yield* back(user)
      expect(yield* listensToBack).toBe(false)
      yield* user.send(openAddProducts)
      expect(yield* listensToBack).toBe(true)
      yield* checkCamera(user)
    })))
})

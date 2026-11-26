import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import { isValidElement, type ReactNode } from 'react'
import type { ProductId } from '#domain/product.ts'
import type { DateOrder } from '#libs/dates/date-order.ts'
import * as Day from '#libs/dates/day.ts'
import { tagPath } from '#libs/testing/tag-path.test_support.ts'
import * as Home from './children/home/program.ts'
import { type Command, type Model, program } from './program.ts'
import type * as Expiration from './programs/expiration/program.ts'
import {
  addProduct,
  back,
  cancelLookup,
  checkCamera,
  clearDate,
  clearName,
  closeAbout,
  closeAddProducts,
  deleteSelected,
  expirationShown,
  hear,
  hearNext,
  listenedIn,
  loadEditPage,
  onHome,
  openAbout,
  openAddProducts,
  openMenu,
  orderShown,
  pendingWork,
  perform,
  pickOrder,
  rehearsed,
  requestDate,
  requestInfo,
  type State,
  saveProduct,
  scan,
  selectFirstProduct,
  tapFirstProduct,
  typeDay,
  typeDigit,
  typeEditedName,
  typeName,
  type User,
  undoDeletion,
  visitShown,
} from './user.test_support.ts'
import { view } from './view.tsx'

const day = Schema.decodeSync(Day.Schema)

const isAdd = (command: Command) => tagPath(command) === 'AddProducts › Add'

const isSave = (command: Command) => tagPath(command) === 'EditProduct › Save'

/** The page the model draws. */
const shown = (user: User) => Effect.map(user.model, ({ page }) => page._tag)

/** Home's model, while Home is shown. */
const homeShown = ({ page }: Model): Opt.Option<Home.Model> => page._tag === 'Home' ? Opt.some(page.model) : Opt.none()

/** Home's list, while Home is shown: each valid product's id, name and whether it expires, in order. */
const listed = (user: User) =>
  Effect.map(user.model, (model) =>
    Opt.map(homeShown(model), ({ products: { list } }) =>
      list._tag === 'Available'
        ? list.products.flatMap((row): ReadonlyArray<Readonly<{ id: ProductId; name: string; expires: boolean }>> =>
          row._tag === 'Valid' && row.presence !== 'Leaving'
            ? [{ id: row.id, name: row.name, expires: row.status._tag !== 'Everlasting' }]
            : []
        )
        : []))

/** The names of the valid products in Home's list, while Home is shown. */
const listedNames = (user: User) => Effect.map(listed(user), Opt.map(Arr.map(({ name }) => name)))

/** What the contextual top app bar offers for the selection, while Home shows its list. */
const deletionShown = (model: Model) =>
  Opt.flatMap(
    homeShown(model),
    ({ products: { list } }) => list._tag === 'Available' ? Opt.some(list.deletion._tag) : Opt.none(),
  )

/** The days the date's digits name, as the strip under the field offers them. */
const daysNamed = (model: Model) =>
  Opt.match(expirationShown(model), {
    onNone: () => [],
    onSome: ({ strip }) => strip._tag === 'Naming' ? strip.choices.map(({ date }) => date) : [],
  })

/** The order other than `inUse` that a test picks: whichever is not in use. */
const otherThan = (inUse: Opt.Option<DateOrder>): DateOrder => Opt.contains(inUse, 'MDY') ? 'DMY' : 'MDY'

/** Adds Milk, which never expires, from the first step, and leaves the page: Home lists it. */
const addMilk = Effect.fnUntraced(function*(user: User) {
  yield* perform(user, [openAddProducts, typeName('Milk')])
  yield* checkCamera(user)
  // The page adds a product only once it knows the time.
  yield* hearNext(user, 'AddProducts › clock')
  yield* user.send(addProduct)
  yield* user.run(isAdd)
  yield* back(user)
  yield* hearNext(user, 'Home › Products › changes')
})

/** Adds Salt, which never expires, then Milk, which expires at the end of 2099: Milk is listed first. */
const addSaltAndMilk = Effect.fnUntraced(function*(user: User) {
  yield* perform(user, [openAddProducts, typeName('Salt')])
  yield* checkCamera(user)
  yield* hearNext(user, 'AddProducts › clock')
  yield* user.send(addProduct)
  yield* user.run(isAdd)
  yield* perform(user, [typeName('Milk'), requestDate])
  // The date reads its order as the second step is shown.
  yield* hearNext(user, 'AddProducts › Expiration › date-order')
  yield* typeDay(user, day('2099-12-31'))
  yield* user.send(addProduct)
  yield* user.run(isAdd)
  yield* back(user)
  yield* hearNext(user, 'Home › Products › changes')
  // The list is drawn once the time is known: Milk expires.
  yield* hearNext(user, 'Home › Products › clock')
})

describe('Navigation', () => {
  test('starts on Home, with no page over it', () => {
    expect(program.init.state.own).toEqual({ visits: 0, maybeVisit: Opt.none() })
    expect(program.makeModel(program.init.state).page._tag).toBe('Home')
  })

  test('starts Home as Home starts, with no command', () => {
    const { page } = program.makeModel(program.init.state)
    expect(page._tag === 'Home' && page.model).toEqual(Home.program.makeModel(Home.program.init.state))
    expect(program.init.commands ?? []).toEqual([])
    expect(Home.program.init.commands ?? []).toEqual([])
  })

  test('Home opens About over it, which loads its data', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      expect(yield* shown(user)).toBe('About')
      expect((yield* user.pending).map(tagPath)).toEqual(['About › LoadLicenses'])
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
      expect(yield* shown(user)).toBe('About')
      expect(state.own.visits).toBe(1)
      expect(Opt.map(entry, (message) => program.update(message)(state) === Tea.reject)).toEqual(Opt.some(true))
      yield* user.runAll
    })))

  // React reuses an element of the same type in the same place: a page drawn in another's, or in an earlier visit's
  // of its own, would keep its native views, and the text of their fields.
  test('each page is drawn in an element of its own, keyed by its name and its visit', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const keysOf = (node: ReactNode): ReadonlyArray<string> =>
        typeof node === 'object' && node !== null && Symbol.iterator in node
          ? Arr.flatMap(Arr.fromIterable(node), keysOf)
          : isValidElement<{ children?: ReactNode }>(node)
          ? [...(node.key === null ? [] : [node.key]), ...keysOf(node.props.children)]
          : []
      const drawn = Effect.map(
        user.model,
        (model) =>
          keysOf(view(model, () => undefined)).filter((key) => /^(Home|AddProducts|EditProduct|About)/.test(key)),
      )
      expect(yield* drawn).toEqual(['Home'])
      yield* perform(user, openAbout)
      const first = yield* visitShown(user)
      expect(yield* drawn).toEqual([`About-${first}`])
      yield* back(user)
      yield* perform(user, openAbout)
      const second = yield* visitShown(user)
      expect(second).not.toBe(first)
      expect(yield* drawn).toEqual([`About-${second}`])
      yield* user.runAll
    })))

  test('back from About returns to Home, as it was', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      yield* user.runAll
      yield* back(user)
      expect(yield* shown(user)).toBe('Home')
      expect(yield* user.pending).toEqual([])
      // Opening About closed the menu: Home is otherwise untouched.
      expect(Opt.map(homeShown(yield* user.model), ({ menu }) => menu._tag)).toEqual(Opt.some('Closed'))
    })))

  test('back on Home first closes what is open', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openMenu)
      yield* back(user)
      expect(yield* shown(user)).toBe('Home')
      expect(Opt.map(homeShown(yield* user.model), ({ menu }) => menu._tag)).toEqual(Opt.some('Closed'))
      expect(yield* user.pending).toEqual([])
    })))

  // The add button tapped twice from the same frame: the second tap asks Home again, which changes nothing.
  test('Home opens the page that adds products over it, once on a double tap', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const add = openAddProducts(yield* user.model)
      yield* user.send(() => add)
      const opened = (yield* user.state).own
      yield* user.send(() => add)
      expect((yield* user.state).own).toBe(opened)
      expect(yield* shown(user)).toBe('AddProducts')
      expect((yield* user.pending).map(tagPath)).toEqual(['AddProducts › CheckCamera'])
      yield* checkCamera(user)
    })))

  test('a product added on its page is in the list of Home once the page is left', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addMilk(user)
      expect(yield* shown(user)).toBe('Home')
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk']))
    })))

  test('a barcode read by the scanner is looked up, and the product found names the product added', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openAddProducts)
      // The scanner is offered once the page knows that the device can read barcodes.
      yield* checkCamera(user)
      yield* scan(user, '4006381333931')
      yield* hear(user, 'AddProducts › Lookup', {
        _tag: 'AddProducts',
        id: yield* visitShown(user),
        message: {
          _tag: 'LookedUp',
          barcode: '4006381333931',
          outcome: { _tag: 'Found', name: 'Milk', url: 'https://world.openfoodfacts.org/product/4006381333931' },
        },
      })
      yield* hearNext(user, 'AddProducts › clock')
      yield* user.send(addProduct)
      yield* user.run(isAdd)
      yield* back(user)
      yield* hearNext(user, 'Home › Products › changes')
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk']))
    })))

  // The name typed before the scan is gone: nothing is added before the user has seen the answer.
  test('a barcode unknown to Open Food Facts leaves the name to type before the product can be added', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Bread')])
      yield* checkCamera(user)
      yield* scan(user, '4006381333931')
      yield* hear(user, 'AddProducts › Lookup', {
        _tag: 'AddProducts',
        id: yield* visitShown(user),
        message: { _tag: 'LookedUp', barcode: '4006381333931', outcome: { _tag: 'NotFound' } },
      })
      yield* hearNext(user, 'AddProducts › clock')
      expect(addProduct(yield* user.model)).toEqual(Opt.none())
      yield* perform(user, [typeName('Milk'), addProduct])
      yield* user.run(isAdd)
      yield* back(user)
      yield* hearNext(user, 'Home › Products › changes')
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk']))
    })))

  // The page waits for the lookup: the name it would add may be replaced a moment later.
  test('a lookup cancelled stops, and leaves the name to type before the product can be added', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const looksUp = Effect.map(user.state, (state) => listenedIn(state).includes('AddProducts › Lookup'))
      yield* user.send(openAddProducts)
      yield* checkCamera(user)
      yield* hearNext(user, 'AddProducts › clock')
      yield* scan(user, '4006381333931')
      expect(yield* looksUp).toBe(true)
      expect(addProduct(yield* user.model)).toEqual(Opt.none())
      yield* user.send(cancelLookup)
      expect(yield* looksUp).toBe(false)
      expect(addProduct(yield* user.model)).toEqual(Opt.none())
      yield* perform(user, [typeName('Milk'), addProduct])
      yield* user.run(isAdd)
      yield* back(user)
      yield* hearNext(user, 'Home › Products › changes')
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk']))
    })))

  // The name stays once its product is added: a second package of it is one tap.
  test('a product added twice in a row from the first step is listed twice', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Milk')])
      yield* checkCamera(user)
      yield* hearNext(user, 'AddProducts › clock')
      yield* user.send(addProduct)
      yield* user.run(isAdd)
      // A moment later, as a user taps it again: the second is created at the clock's time.
      yield* hearNext(user, 'AddProducts › clock')
      yield* user.send(addProduct)
      yield* user.run(isAdd)
      yield* back(user)
      yield* hearNext(user, 'Home › Products › changes')
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk', 'Milk']))
    })))

  // The order is the storage's when the date is shown, the machine's locale's until one is kept: the test picks
  // whichever is not in use. A pick applies at once, and is kept there.
  test('the order picked for the date is kept, and the digits are read in it', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Milk')])
      yield* checkCamera(user)
      yield* hearNext(user, 'AddProducts › clock')
      yield* user.send(requestDate)
      yield* hearNext(user, 'AddProducts › Expiration › date-order')
      const picked = otherThan(orderShown(yield* user.model))
      yield* user.send(pickOrder(picked))
      expect(orderShown(yield* user.model)).toEqual(Opt.some(picked))
      yield* user.run((command) => tagPath(command) === 'AddProducts › Expiration › KeepOrder')
      expect(yield* hearNext(user, 'AddProducts › Expiration › date-order')).toMatchObject({
        message: { message: { _tag: 'OrderChanged', order: picked } },
      })
      // December 31 in the order picked: 1231 month first, 3112 day first. Read in the other, they name a 31st month.
      const digits = picked === 'MDY' ? '1231' : '3112'
      yield* perform(user, Arr.map([...digits], (digit) => typeDigit(digit as Expiration.Digit)))
      const named = daysNamed(yield* user.model).map(Day.toParts)
      expect(named.some(({ month, day }) => month === 12 && day === 31)).toBe(true)
    })))

  test('a product named anew, once the name is cleared, is listed with the first', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [openAddProducts, typeName('Milk')])
      yield* checkCamera(user)
      yield* hearNext(user, 'AddProducts › clock')
      yield* user.send(addProduct)
      yield* user.run(isAdd)
      yield* perform(user, [clearName, typeName('Bread'), addProduct])
      yield* user.run(isAdd)
      yield* back(user)
      yield* hearNext(user, 'Home › Products › changes')
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk', 'Bread']))
    })))

  // A double tap asks Home again under the page it opened, which changes nothing.
  test('a tap on a product opens the page that edits it over Home, once on a double tap, with the product once loaded', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addSaltAndMilk(user)
      const tap = tapFirstProduct(yield* user.model)
      yield* user.send(() => tap)
      const opened = (yield* user.state).own
      yield* user.send(() => tap)
      expect((yield* user.state).own).toBe(opened)
      const loading = (yield* user.model).page
      expect(loading._tag === 'EditProduct' && loading.model._tag).toBe('Loading')
      yield* loadEditPage(user)
      const { page } = yield* user.model
      expect(page._tag === 'EditProduct' && page.model._tag === 'Editing' && page.model.name).toBe('Milk')
    })))

  // Two fingers in the same frame, on a product's row and on "Add products": the second tap asks from a Home the
  // first one covered, and the page it would open is never started (nothing of it is left pending).
  test('two taps of one frame, on different controls, open the first page only', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addSaltAndMilk(user)
      const drawn = yield* user.model
      const tapProduct = tapFirstProduct(drawn)
      const tapAdd = openAddProducts(drawn)
      yield* user.send(() => tapProduct)
      const opened = (yield* user.state).own
      yield* user.send(() => tapAdd)
      expect((yield* user.state).own).toBe(opened)
      expect(yield* shown(user)).toBe('EditProduct')
      expect((yield* pendingWork(user)).map(tagPath).filter((path) => path.startsWith('AddProducts'))).toEqual([])
      yield* loadEditPage(user)
    })))

  test('a product renamed and saved is listed under its new name, with the same id, once the page has left', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addSaltAndMilk(user)
      const before = yield* listed(user)
      yield* user.send(tapFirstProduct)
      yield* loadEditPage(user)
      yield* perform(user, [typeEditedName('Oat milk'), saveProduct])
      yield* user.run(isSave)
      expect(yield* shown(user)).toBe('Home')
      yield* hearNext(user, 'Home › Products › changes')
      expect(Opt.map(yield* listed(user), Arr.map(({ id, name }) => [id, name]))).toEqual(
        Opt.map(before, Arr.map(({ id, name }) => [id, name === 'Milk' ? 'Oat milk' : name])),
      )
    })))

  test('a product whose expiration is cleared and saved is listed last, never expiring', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addSaltAndMilk(user)
      yield* user.send(tapFirstProduct)
      yield* loadEditPage(user)
      yield* perform(user, [clearDate, saveProduct])
      yield* user.run(isSave)
      yield* hearNext(user, 'Home › Products › changes')
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
      expect(yield* shown(user)).toBe('Home')
      expect(yield* pendingWork(user)).toEqual([])
      expect(yield* listed(user)).toEqual(before)
    })))

  // The deletion completes before the storage's change reaches the list: the frame still shows the product, whose
  // tap opens it.
  test('a product deleted before its page saves it keeps the page, which says so, until its snackbar leaves', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addMilk(user)
      yield* perform(user, [selectFirstProduct, deleteSelected])
      yield* user.run((command) => tagPath(command) === 'Home › Products › Delete')
      yield* user.send(tapFirstProduct)
      yield* loadEditPage(user)
      yield* perform(user, [typeEditedName('Oat milk'), saveProduct])
      yield* user.run(isSave)
      const gone = (yield* user.model).page
      expect(gone._tag === 'EditProduct' && gone.model._tag).toBe('Gone')
      expect((yield* user.pending).map(tagPath)).toContain('EditProduct › Vibrate')
      yield* user.run((command) => tagPath(command) === 'EditProduct › Snackbar › Stamp')
      const notice = Opt.getOrThrow(
        gone._tag === 'EditProduct' && gone.model._tag === 'Gone' ? gone.model.snackbar : Opt.none(),
      )
      expect(notice.notice).toBe('ProductGone')
      yield* hear(user, 'EditProduct › Snackbar › Standing', {
        _tag: 'EditProduct',
        id: yield* visitShown(user),
        message: { _tag: 'Snackbar', message: { _tag: 'Expired', id: notice.id } },
      })
      expect(yield* shown(user)).toBe('Home')
      // The deletion's own notice, told while the page was opened.
      yield* user.run((command) => tagPath(command) === 'Home › Products › Snackbar › Stamp')
    })))

  test('a tap on a product while it is selected deselects it, and opens nothing', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addSaltAndMilk(user)
      yield* user.send(selectFirstProduct)
      yield* user.send(tapFirstProduct)
      expect(yield* shown(user)).toBe('Home')
      expect(deletionShown(yield* user.model)).toEqual(Opt.some('NothingSelected'))
    })))

  test('back on Home clears the selection, and stays on Home', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addSaltAndMilk(user)
      yield* user.send(selectFirstProduct)
      yield* back(user)
      expect(yield* shown(user)).toBe('Home')
      expect(deletionShown(yield* user.model)).toEqual(Opt.some('NothingSelected'))
    })))

  test('a product deleted from the list comes back when the deletion is undone in time', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const standing = Effect.map(
        user.state,
        (state) => listenedIn(state).includes('Home › Products › Snackbar › Standing'),
      )
      yield* addMilk(user)
      yield* perform(user, [selectFirstProduct, deleteSelected])
      yield* user.run((command) => tagPath(command) === 'Home › Products › Delete')
      yield* hearNext(user, 'Home › Products › changes')
      expect(yield* listedNames(user)).toEqual(Opt.some([]))
      // The snackbar's time counts from when the clock says it was told.
      expect(yield* standing).toBe(false)
      yield* user.run((command) => tagPath(command) === 'Home › Products › Snackbar › Stamp')
      expect(yield* standing).toBe(true)
      yield* user.send(undoDeletion)
      expect(yield* standing).toBe(false)
      yield* user.run((command) => tagPath(command) === 'Home › Products › Restore')
      yield* hearNext(user, 'Home › Products › changes')
      expect(yield* listedNames(user)).toEqual(Opt.some(['Milk']))
    })))
})

// Each page over Home is a visit of its own, by a number never used again: an answer, or a tap of a frame, for a
// visit that is over reaches no later one.
describe('Visits', () => {
  // Found on 22 November 2026: the write's answer went to the page of the same name, and the date of the second
  // visit, not there yet, died of it.
  test('the order kept once the page that edits a product is left is ignored, and the next visit stays as it starts', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addMilk(user)
      yield* user.send(tapFirstProduct)
      yield* loadEditPage(user)
      const picked = otherThan(orderShown(yield* user.model))
      yield* user.send(pickOrder(picked))
      yield* back(user)
      expect((yield* pendingWork(user)).map(tagPath)).toEqual(['EditProduct › Expiration › KeepOrder'])
      yield* user.send(tapFirstProduct)
      const started = yield* user.model
      yield* user.runAll
      expect((yield* user.ignored).map(tagPath)).toEqual(['EditProduct › Expiration › OrderKept'])
      expect(yield* user.model).toEqual(started)
      // The order was kept all the same: the second visit reads it.
      yield* loadEditPage(user)
      expect(orderShown(yield* user.model)).toEqual(Opt.some(picked))
    })))

  test('About opened again while its first loads were pending is loaded by its own', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      yield* back(user)
      expect((yield* user.pending).map(tagPath)).toEqual(['About › LoadLicenses'])
      yield* perform(user, openAbout)
      expect((yield* user.pending).length).toBe(2)
      yield* user.runAll
      expect((yield* user.ignored).map(tagPath)).toEqual(['About › LicensesLoaded'])
      const { page } = yield* user.model
      expect(page._tag === 'About' && page.model.licenses._tag).toBe('Loaded')
    })))

  test('the page that adds products, opened again before its camera check answered, knows its camera by its own', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openAddProducts)
      yield* back(user)
      yield* user.send(openAddProducts)
      expect((yield* user.pending).map(tagPath)).toEqual(['AddProducts › CheckCamera', 'AddProducts › CheckCamera'])
      yield* user.runAll
      expect((yield* user.ignored).map(tagPath)).toEqual(['AddProducts › CameraChecked'])
      const { page } = yield* user.model
      expect(page._tag === 'AddProducts' && page.model._tag === 'Naming' && Opt.isSome(page.model.maybeScan)).toBe(
        true,
      )
    })))

  test('the page that edits a product, opened again before its order was kept, shows its fields by its own', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* addMilk(user)
      yield* user.send(tapFirstProduct)
      yield* loadEditPage(user)
      yield* user.send(pickOrder(otherThan(orderShown(yield* user.model))))
      yield* back(user)
      yield* user.send(tapFirstProduct)
      yield* loadEditPage(user)
      yield* user.runAll
      expect((yield* user.ignored).map(tagPath)).toEqual(['EditProduct › Expiration › OrderKept'])
      const { page } = yield* user.model
      expect(page._tag === 'EditProduct' && page.model._tag === 'Editing' && page.model.name).toBe('Milk')
    })))

  // About's back button, drawn in the first visit's last frame and tapped once the second visit is shown.
  test('a tap of a frame of a visit that is over is rejected, and the same tap of the visit under way is taken', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, openAbout)
      const first = closeAbout(yield* user.model)
      yield* back(user)
      yield* perform(user, openAbout)
      const second = closeAbout(yield* user.model)
      expect(Opt.map(first, ({ message }) => message)).toEqual(Opt.map(second, ({ message }) => message))
      const state = yield* user.state
      expect(Opt.map(first, (message) => program.update(message)(state) === Tea.reject)).toEqual(Opt.some(true))
      expect(Opt.map(second, (message) => program.update(message)(state) === Tea.reject)).toEqual(Opt.some(false))
      yield* user.runAll
    })))

  // The close button tapped twice from the same frame: the first tap leaves the page, and the second is for a
  // visit that is over.
  test('a page asking to be left twice is left once', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* user.send(openAddProducts)
      const close = closeAddProducts(yield* user.model)
      yield* user.send(() => close)
      const left = yield* user.state
      expect(left.own).toEqual({ visits: 1, maybeVisit: Opt.none() })
      expect(Opt.map(close, (message) => program.update(message)(left) === Tea.reject)).toEqual(Opt.some(true))
      yield* user.runAll
      expect((yield* user.ignored).map(tagPath)).toEqual(['AddProducts › CameraChecked'])
    })))
})

// In UTC, it is already October 31 in New York at 20:30, and still October 29 in Tokyo at 08:30.
describe('Days, in a zone far from UTC', () => {
  const october30 = day('2026-10-30')

  const cases = [
    { zone: 'America/New_York', time: DateTime.makeUnsafe('2026-10-31T00:30:00Z') },
    { zone: 'Asia/Tokyo', time: DateTime.makeUnsafe('2026-10-29T23:30:00Z') },
  ]

  /** The statuses of Home's rows, once the list is shown. */
  const statuses = (model: Model) =>
    Opt.match(homeShown(model), {
      onNone: () => [],
      onSome: ({ products: { list } }) =>
        list._tag === 'Available' ? list.products.map((row) => row._tag === 'Valid' ? row.status._tag : row._tag) : [],
    })

  for (const { zone, time } of cases) {
    test(`today is typed with its year and offered, and a product expiring today expires today, in ${zone}`, () =>
      rehearsed(
        Effect.fnUntraced(function*(user) {
          yield* perform(user, [openAddProducts, typeName('Milk')])
          yield* checkCamera(user)
          yield* hearNext(user, 'AddProducts › clock')
          yield* user.send(requestDate)
          yield* hearNext(user, 'AddProducts › Expiration › date-order')
          yield* typeDay(user, october30)
          expect(daysNamed(yield* user.model)).toEqual([october30])
          yield* user.send(addProduct)
          yield* user.run(isAdd)
          yield* back(user)
          yield* hearNext(user, 'Home › Products › changes')
          yield* hearNext(user, 'Home › Products › clock')
          expect(statuses(yield* user.model)).toEqual(['ExpiringToday'])
        }),
        { zone, maybeTime: Opt.some(time) },
      ))
  }
})

describe('Subscriptions', () => {
  /** Whether every key of the state is the page's, by its name. */
  const listensTo = (state: State, page: Model['page']['_tag']) => {
    const keys = listenedIn(state)
    return keys.length > 0 && keys.every((key) => key.startsWith(`${page} › `))
  }

  test('Home listens while it is shown', () => {
    expect(listensTo(program.init.state, 'Home')).toBe(true)
  })

  // Home's scrolling subscriptions would otherwise react to another page's scrolling, e.g. scroll it to the top.
  test('while a page is shown over Home, the app listens to that page alone, and to Home again once it is left', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const listening = (page: Model['page']['_tag']) => Effect.map(user.state, (state) => listensTo(state, page))
      yield* user.send(openAddProducts)
      expect(yield* listening('AddProducts')).toBe(true)
      yield* checkCamera(user)
      yield* back(user)
      expect(yield* listening('Home')).toBe(true)
      yield* perform(user, openAbout)
      expect(yield* listening('About')).toBe(true)
      yield* user.runAll
      yield* back(user)
      expect(yield* listening('Home')).toBe(true)
      yield* addMilk(user)
      yield* user.send(tapFirstProduct)
      yield* loadEditPage(user)
      expect(yield* listening('EditProduct')).toBe(true)
      yield* back(user)
      expect(yield* listening('Home')).toBe(true)
    })))

  // The list's scroll and layout are Home's state: the top app bar has collapsed, and stays so once the page is left.
  test('Home keeps its state under a page, and listens to the same again once the page is left', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      yield* perform(user, [
        onHome(({ headlineLaidOut }) => Opt.some({ ...headlineLaidOut, height: 100 })),
        onHome(({ listLaidOut }) => Opt.some({ ...listLaidOut, height: 500 })),
        onHome(({ contentSized }) => Opt.some({ ...contentSized, height: 2000 })),
        onHome(({ scrolled }) => Opt.some({ ...scrolled, offset: 100 })),
      ])
      const before = yield* user.model
      const keys = listenedIn(yield* user.state)
      expect(Opt.map(homeShown(before), ({ collapse }) => collapse)).toEqual(Opt.some(1))
      yield* user.send(openAddProducts)
      yield* checkCamera(user)
      yield* back(user)
      expect(yield* user.model).toEqual(before)
      expect(listenedIn(yield* user.state)).toEqual(keys)
    })))

  // Otherwise the button is the platform's, which leaves the app. What matters here is that exactly the shown page
  // observes it, when it should.
  test('the back button is observed only while the shown page has something to close', () =>
    rehearsed(Effect.fnUntraced(function*(user) {
      const listensToBack = Effect.map(
        user.state,
        (state) => listenedIn(state).some((key) => key.endsWith(' › back-button')),
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

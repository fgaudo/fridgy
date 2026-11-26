import type * as Tea from '@fgaudo/effect-tea'
import { stateOf } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as ExpirationArbitrary from '#app/programs/expiration/program.test_arbitrary.ts'
import type * as Expiration from '#app/programs/expiration/program.ts'
import * as SnackbarArbitrary from '#app/programs/snackbar/program.test_arbitrary.ts'
import type * as Snackbar from '#app/programs/snackbar/program.ts'
import { arbitrary as product } from '#domain/product.test_arbitrary.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import * as FridgeArbitrary from './children/fridge/program.test_arbitrary.ts'
import type * as Fridge from './children/fridge/program.ts'
import {
  type Camera,
  type Failure,
  type Lookup,
  type LookupOutcome,
  type Message,
  type Phase,
  program,
  type State,
  type Step,
} from './program.ts'

const Msg = Data.taggedEnum<Message>()

/** The page's whole state: its own, and its children's. */
export type Whole = Tea.StateOf<typeof program>

/** A barcode as the scanner reads it: EAN-8, UPC-A or EAN-13. */
export const barcode = fc.stringMatching(/^\d{8}$|^\d{12,13}$/)

/** A lookup's answer; most often none. */
const lookup: fc.Arbitrary<Lookup> = fc.oneof(
  { arbitrary: fc.constant<Lookup>({ _tag: 'Idle' }), weight: 3 },
  fc.webUrl().map((url): Lookup => ({ _tag: 'Found', url })),
  barcode.map((scanned): Lookup => ({ _tag: 'NotFound', barcode: scanned })),
  fc.constant<Lookup>({ _tag: 'Failed' }),
)

const outcome: fc.Arbitrary<LookupOutcome> = fc.oneof(
  fc.tuple(fc.string({ minLength: 1 }), fc.webUrl()).map(([name, url]): LookupOutcome => ({
    _tag: 'Found',
    name,
    url,
  })),
  fc.constant<LookupOutcome>({ _tag: 'NotFound' }),
  fc.constant<LookupOutcome>({ _tag: 'Failed' }),
)

/** How far the keyboard covers the page: down most often, otherwise as tall as a keyboard. */
export const keyboardInset = fc.oneof({ arbitrary: fc.constant(0), weight: 3 }, fc.integer({ min: 120, max: 400 }))

/** What the page keeps in every phase, and its children that are always there. */
type World = Readonly<{
  facts: Omit<State, 'phase'>
  snackbar: Snackbar.State<Failure>
  fridge: Fridge.State
}>

const world: fc.Arbitrary<World> = fc.tuple(
  fc.record({
    maybeName: maybe(fc.oneof(fc.string(), fc.stringMatching(/^\d{8,13}$/))),
    replacements: fc.nat(),
    camera: fc.constantFrom<Camera>('Checking', 'Available', 'Unavailable'),
    lookup,
    maybeNow: maybe(zoned),
    keyboardInset,
  }),
  SnackbarArbitrary.state(fc.constantFrom<Failure>('AddFailed', 'OrderNotKept')),
  FridgeArbitrary.state,
  fc.boolean(),
).map(([facts, snackbar, fridge, keepsName]) => {
  // The name is often the product's just added, as the page keeps it after adding one; when the lookup did not
  // name the product, there is none.
  const maybeName = facts.lookup._tag === 'NotFound' || facts.lookup._tag === 'Failed'
    ? Opt.none()
    : keepsName
    ? Opt.orElse(Opt.map(FridgeArbitrary.lastIn(fridge.fridge), ({ name }) => name), () => facts.maybeName)
    : facts.maybeName
  return { facts: { ...facts, maybeName }, snackbar, fridge }
})

const whole = (
  { facts, snackbar, fridge }: World,
  phase: Phase,
  maybeDate: Opt.Option<Expiration.State> = Opt.none(),
): Whole =>
  stateOf(program, { ...facts, phase }, {
    Snackbar: snackbar,
    Fridge: fridge,
    ...Opt.match(maybeDate, { onNone: () => ({}), onSome: (date) => ({ Expiration: date }) }),
  })

/**
 * The date of a product to be, as the page told it its time and its lock: a product is made, and the step reached,
 * only once the clock has ticked.
 */
const dateOf = (isLocked: boolean): fc.Arbitrary<readonly [DateTime.Zoned, Expiration.State]> =>
  ExpirationArbitrary.state
    .filter((date) => Opt.isNone(date.maybeStored) && Opt.isSome(date.page.maybeNow))
    .map((date) => [Opt.getOrThrow(date.page.maybeNow), { ...date, page: { ...date.page, isLocked } }] as const)

const ticked = (facts: World['facts'], now: DateTime.Zoned): World['facts'] => ({ ...facts, maybeNow: Opt.some(now) })

export const naming = world.map((w) => whole(w, { _tag: 'Naming' }))

// The scan emptied the name, and no answer has come yet. The scanner opened once the device could read barcodes,
// and a camera that read the code has not failed.
export const lookingUp = fc.tuple(world, barcode).map(([w, barcode]) =>
  whole({
    ...w,
    facts: { ...w.facts, maybeName: Opt.none(), lookup: { _tag: 'Idle' }, camera: 'Available' },
  }, { _tag: 'LookingUp', barcode })
)

// The scanner opens once the device can read barcodes; the answer changes then only when the camera fails.
export const scanning = fc.tuple(world, fc.constantFrom<Camera>('Available', 'Unavailable')).map(([w, camera]) =>
  whole({ ...w, facts: { ...w.facts, camera } }, { _tag: 'Scanning' })
)

export const dating = fc.tuple(world, dateOf(false)).map(([w, [now, date]]) =>
  whole({ ...w, facts: ticked(w.facts, now) }, { _tag: 'Dating' }, Opt.some(date))
)

export const submitting = fc.tuple(world, dateOf(true), product, fc.constantFrom<Step>('Naming', 'Dating')).map((
  [w, [now, date], product, from],
) =>
  whole(
    { ...w, facts: ticked(w.facts, now) },
    { _tag: 'Submitting', product, from },
    from === 'Dating' ? Opt.some(date) : Opt.none(),
  )
)

export const state: fc.Arbitrary<Whole> = fc.oneof(naming, lookingUp, scanning, dating, submitting)

/** The page's own messages, as they may arrive. */
export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.constant(Msg.BackPressed()),
  fc.constant(Msg.ScanRequested()),
  fc.constant(Msg.ScanClosed()),
  fc.constant(Msg.DateRequested()),
  fc.constant(Msg.DateDismissed()),
  fc.constant(Msg.Closed()),
  fc.constant(Msg.LookupCancelled()),
  fc.webUrl().map((url) => Msg.LinkPressed({ url })),
  fc.constant(Msg.CameraFailed()),
  fc.boolean().map((isAvailable) => Msg.CameraChecked({ isAvailable })),
  fc.string().map((value) => Msg.NameTyped({ value })),
  fc.constant(Msg.NameCleared()),
  fc.constant(Msg.Started()),
  zoned.map((now) => Msg.TimeChanged({ now })),
  keyboardInset.map((inset) => Msg.KeyboardMoved({ inset })),
  fc.string().map((barcode) => Msg.Scanned({ barcode })),
  fc.tuple(barcode, outcome).map(([barcode, outcome]) => Msg.LookedUp({ barcode, outcome })),
  fc.boolean().map((succeeded) => Msg.Completed({ succeeded })),
)

import type * as Tea from '@fgaudo/effect-tea'
import { stateOf } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { state as expirationState } from '#app/programs/expiration/program.test_arbitrary.ts'
import type * as Expiration from '#app/programs/expiration/program.ts'
import * as Snackbar from '#app/programs/snackbar/program.test_arbitrary.ts'
import type * as SnackbarProgram from '#app/programs/snackbar/program.ts'
import { arbitrary as product } from '#domain/product.test_arbitrary.ts'
import type * as Product from '#domain/product.ts'
import { zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import type { Failure, Fields, Message, Outcome } from './program.ts'
import { program } from './program.ts'

/** The page's whole state: its own, its date's and its snackbar's. */
export type Whole = Tea.StateOf<typeof program>

const Msg = Data.taggedEnum<Message>()

const id = fc.nat().map(String)

/** How far the keyboard covers the page: down most often, otherwise as tall as a keyboard. */
export const keyboardInset = fc.oneof({ arbitrary: fc.constant(0), weight: 3 }, fc.integer({ min: 120, max: 400 }))

/** A date that the page started: from the stored product, told the time and whether the form is locked. */
type Dated = Readonly<{ original: Product.Product; now: DateTime.Zoned; expiration: Expiration.State }>

// The date's own arbitrary draws the stored product and the time, and digits typed around them.
const dated = (isLocked: boolean): fc.Arbitrary<Dated> =>
  expirationState
    .filter((s) => Opt.isSome(s.maybeStored) && Opt.isSome(s.page.maybeNow))
    .map((expiration) => ({
      original: Opt.getOrThrow(expiration.maybeStored),
      now: Opt.getOrThrow(expiration.page.maybeNow),
      expiration: { ...expiration, page: { ...expiration.page, isLocked } },
    }))

// The name is often the stored one, at times with other spacing, empty, or anything typed.
const fieldsOf = (original: Product.Product, now: DateTime.Zoned): fc.Arbitrary<Fields> =>
  fc.tuple(fc.nat({ max: 3 }), fc.string(), fc.nat()).map(([kind, typed, replacements]) => ({
    now,
    name: kind === 0 ? original.name : kind === 1 ? ` ${original.name}  ` : kind === 2 ? '' : typed,
    replacements,
  }))

/** A snackbar telling of a failure while the form is there: none, or one standing. */
const failing: fc.Arbitrary<SnackbarProgram.State<Failure>> = Snackbar.state(
  fc.constantFrom<Failure>('SaveFailed', 'OrderNotKept'),
)

// Until the clock has told the time, nothing is there but the snackbar, which nothing has told yet.
export const loading: fc.Arbitrary<Whole> = fc.tuple(id, product, keyboardInset).map(([id, original, keyboardInset]) =>
  stateOf(program, { id, original, keyboardInset, form: { _tag: 'Loading' } })
)

// Until the date's order is known, no field is drawn: the name is the stored one, and nothing failed yet.
export const editing: fc.Arbitrary<Whole> = fc.tuple(dated(false), id, keyboardInset).chain((
  [{ original, now, expiration }, id, keyboardInset],
) =>
  Opt.isNone(expiration.maybeOrder)
    ? fc.constant(
      stateOf(program, {
        id,
        original,
        keyboardInset,
        form: { _tag: 'Editing', fields: { now, name: original.name, replacements: 0 } },
      }, { Expiration: expiration }),
    )
    : fc.tuple(fieldsOf(original, now), failing).map(([fields, snackbar]) =>
      stateOf(program, { id, original, keyboardInset, form: { _tag: 'Editing', fields } }, {
        Expiration: expiration,
        Snackbar: snackbar,
      })
    )
)

// The form was drawn before it was submitted: the date's order is known.
const submitted = dated(true).filter(({ expiration }) => Opt.isSome(expiration.maybeOrder))

export const saving: fc.Arbitrary<Whole> = fc.tuple(submitted, id, keyboardInset, product).chain((
  [{ original, now, expiration }, id, keyboardInset, saved],
) =>
  fc.tuple(fieldsOf(original, now), failing).map(([fields, snackbar]) =>
    stateOf(program, { id, original, keyboardInset, form: { _tag: 'Saving', fields, product: saved } }, {
      Expiration: expiration,
      Snackbar: snackbar,
    })
  )
)

// Its snackbar says so until it has stood its time, which leaves the page.
export const gone: fc.Arbitrary<Whole> = fc.tuple(submitted, id, keyboardInset).chain((
  [{ original, now, expiration }, id, keyboardInset],
) =>
  fc.tuple(fieldsOf(original, now), Snackbar.standing(fc.constant<Failure>('ProductGone'))).map((
    [fields, snackbar],
  ) =>
    stateOf(program, { id, original, keyboardInset, form: { _tag: 'Gone', fields } }, {
      Expiration: expiration,
      Snackbar: snackbar,
    })
  )
)

export const state: fc.Arbitrary<Whole> = fc.oneof(loading, editing, saving, gone)

export const outcome: fc.Arbitrary<Outcome> = fc.constantFrom<Outcome>(
  { _tag: 'Saved' },
  { _tag: 'Failed' },
  { _tag: 'Gone' },
)

/** The page's own messages. */
export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.string().map((value) => Msg.NameTyped({ value })),
  fc.constant(Msg.NameCleared()),
  fc.constant(Msg.SaveStarted()),
  fc.constant(Msg.Closed()),
  zoned.map((now) => Msg.TimeChanged({ now })),
  fc.constant(Msg.BackPressed()),
  keyboardInset.map((inset) => Msg.KeyboardMoved({ inset })),
  outcome.map((outcome) => Msg.Saved({ outcome })),
)

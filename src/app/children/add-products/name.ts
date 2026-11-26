// The name of `AddProducts`: typed, or the lookup's while a scanned barcode is looked up on Open Food Facts (the phase
// `LookingUp`) and once its answer has come. The name and the lookup replace each other, so they are one concern.
import * as Tea from '@fgaudo/effect-tea'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import { type FoundProduct, ProductLookup } from '#infrastructure/product-lookup/product-lookup.ts'
import type { Command, Event, State, Tell, Transition } from './program.ts'

/**
 * Open Food Facts' answer for the barcode last scanned. While it is not `Idle`, the name is the lookup's: the
 * product's name, or none. Typing, clearing or scanning makes it `Idle` again.
 */
export type Lookup = Data.TaggedEnum<{
  /** Nothing scanned, the name changed since, or the lookup still going on (the phase `LookingUp`). */
  Idle: object
  /** `url` is the product's page, for the attribution. */
  Found: Readonly<{ url: string }>
  /** `barcode` is told, so that a misread code shows. */
  NotFound: Readonly<{ barcode: string }>
  Failed: object
}>

/** What the lookup answered: the product's name as the page proposes it, never empty, and its page. */
export type LookupOutcome = Data.TaggedEnum<{
  Found: Readonly<{ name: string; url: string }>
  NotFound: object
  Failed: object
}>

export type Message = Data.TaggedEnum<{
  // From the view.
  /** The name field's text, as the field gives it. */
  NameTyped: { value: string }
  /** The name field's clear button: empties the name. */
  NameCleared: object
  /** The first step's "Cancel", while a scanned barcode is looked up: the name stays empty. */
  LookupCancelled: object
  /** The attribution's link, which opens `url` on every press. */
  LinkPressed: { url: string }
  // From subscriptions.
  LookedUp: { barcode: string; outcome: LookupOutcome }
}>

const Message = Data.taggedEnum<Message>()

const Command = Data.taggedEnum<Command>()

/** The lookup of a barcode, keyed by it: a cancel, or the page left, interrupts it. */
type LookupKey = Data.TaggedEnum<{ Lookup: { barcode: string } }>

const LookupKey = Data.taggedEnum<LookupKey>()

export type Key = LookupKey

/** The line under the name field: what the lookup found, or that the name can only be typed. */
export type Supporting = Data.TaggedEnum<{
  Nothing: object
  CameraUnavailable: object
  LookingUp: Readonly<{ barcode: string }>
  /** The name comes from Open Food Facts: `open` opens the product's page there. */
  FromOpenFoodFacts: Readonly<{ open: Message }>
  NotOnOpenFoodFacts: Readonly<{ barcode: string }>
  LookupFailed: object
}>

/** What the name field gives, filled by the view. */
export type NameTyped = Readonly<{ _tag: 'NameTyped' }>

export const nameTyped: NameTyped = { _tag: 'NameTyped' }

export const cancelLookup: Message = Message.LookupCancelled()

export const hasName = (state: State) => Opt.exists(state.maybeName, (name) => name !== '')

/** The name as the field shows it: empty before any is typed. */
export const nameOf = (state: State) => Opt.getOrElse(state.maybeName, () => '')

/** The first brand, then the name, unless the name already says the brand. The quantity is left out. */
const composeName = ({ name, maybeBrand }: FoundProduct): string =>
  Opt.match(maybeBrand, {
    onNone: () => name,
    onSome: (brand) => name.toLocaleLowerCase().includes(brand.toLocaleLowerCase()) ? name : `${brand} ${name}`,
  })

// It answers once.
export const lookup = (barcode: string): Tea.Subscription<Message, ProductLookup> =>
  Channel.fromEffectDone(
    Effect.gen(function*() {
      const { lookup } = yield* ProductLookup
      return yield* lookup(barcode).pipe(
        Effect.map(Opt.match({
          onNone: () => Message.LookedUp({ barcode, outcome: { _tag: 'NotFound' } }),
          onSome: (found) =>
            Message.LookedUp({ barcode, outcome: { _tag: 'Found', name: composeName(found), url: found.url } }),
        })),
        Effect.catchTag('ProductLookupError', (error) =>
          Effect.logWarning('Could not look the product up', error.cause).pipe(
            Effect.as(Message.LookedUp({ barcode, outcome: { _tag: 'Failed' } })),
          )),
      )
    }).pipe(Effect.withLogSpan('Lookup')),
  )

export const subscriptions = (state: State): ReadonlyArray<Key> =>
  state.phase._tag === 'LookingUp' ? [LookupKey.Lookup({ barcode: state.phase.barcode })] : []

/**
 * A barcode read: the name is emptied, drawn anew, and the lookup's until it answers. Nothing is added under it
 * before the user has seen the answer.
 */
export const lookingUp = (state: State, barcode: string): Tea.Step<State, Command, Event, Tell> => ({
  state: {
    ...state,
    phase: { _tag: 'LookingUp', barcode },
    maybeName: Opt.none(),
    replacements: state.replacements + 1,
    lookup: { _tag: 'Idle' },
  },
})

export const update = Match.typeTags<Message, (state: State) => Transition>()({
  // Its place is there in every phase but the lookup's, whose name is the scan's. Covered or disabled (scanner,
  // second step, submitting), it still takes a key typed in the frame before. Validity is decided when going on
  // or adding. A name that changes is no longer the lookup's, whose answer is dropped.
  NameTyped: ({ value }) => (state) =>
    state.phase._tag === 'LookingUp'
      ? Tea.reject
      : value === nameOf(state)
      ? { state }
      : { state: { ...state, maybeName: Opt.some(value), lookup: { _tag: 'Idle' } } },

  // The field is drawn anew, empty: the user owns its text until the program replaces it.
  NameCleared: () => (state) =>
    state.phase._tag === 'Naming' && hasName(state)
      ? {
        state: { ...state, maybeName: Opt.none(), replacements: state.replacements + 1, lookup: { _tag: 'Idle' } },
      }
      : Tea.reject,

  LinkPressed: ({ url }) => (state) => ({ state, commands: [Command.OpenLink({ url })] }),

  // A product found names it, drawn anew and focused; otherwise the name stays empty, for the user to type.
  LookedUp: ({ barcode, outcome }) => (state) => {
    if (state.phase._tag !== 'LookingUp' || state.phase.barcode !== barcode) {
      return Tea.defect(
        'LookedUp for a barcode that is not being looked up: only the lookup subscription sends it, while its key is in the state',
      )
    }
    const naming: State = { ...state, phase: { _tag: 'Naming' } }
    return {
      state: Match.valueTags(outcome, {
        Found: ({ name, url }): State => ({
          ...naming,
          maybeName: Opt.some(name),
          replacements: state.replacements + 1,
          lookup: { _tag: 'Found', url },
        }),
        NotFound: (): State => ({ ...naming, lookup: { _tag: 'NotFound', barcode } }),
        Failed: (): State => ({ ...naming, lookup: { _tag: 'Failed' } }),
      }),
    }
  },

  // The lookup stops: the runtime interrupts its subscription, whose answer never arrives. The name stays
  // empty.
  LookupCancelled: () => (state) =>
    state.phase._tag === 'LookingUp' ? { state: { ...state, phase: { _tag: 'Naming' } } } : Tea.reject,
})

/** Empties the name, while there is one. */
export const maybeClearNameOf = (state: State): Opt.Option<Message> =>
  hasName(state) ? Opt.some(Message.NameCleared()) : Opt.none()

// A lookup's text comes from a scan, which needs the camera: it wins when the camera failed on a later opening.
export const supportingOf = (state: State): Supporting =>
  state.phase._tag === 'LookingUp'
    ? { _tag: 'LookingUp', barcode: state.phase.barcode }
    : Match.valueTags(state.lookup, {
      Idle: (): Supporting => state.camera === 'Unavailable' ? { _tag: 'CameraUnavailable' } : { _tag: 'Nothing' },
      Found: ({ url }): Supporting => ({ _tag: 'FromOpenFoodFacts', open: Message.LinkPressed({ url }) }),
      NotFound: ({ barcode }): Supporting => ({ _tag: 'NotOnOpenFoodFacts', barcode }),
      Failed: (): Supporting => ({ _tag: 'LookupFailed' }),
    })

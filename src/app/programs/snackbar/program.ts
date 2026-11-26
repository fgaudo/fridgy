// Material's snackbar: one at a time, each for a few seconds from when it was told. It is none, or one standing
// (`maybeStanding`), whose time is counted once the clock has said when it was told. It knows nothing of what it
// tells: its parent names the notices, draws the one standing, and reads it as the output.
import * as Tea from '@fgaudo/effect-tea'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'

/** Material shows one snackbar at a time: one that comes after another waits for it to leave. */
export type Entrance = 'Alone' | 'AfterAnother'

/** How long a snackbar stands: `Long` for one with an action, to read it and reach for the action. */
export type Lasting = 'Short' | 'Long'

// Material's durations.
const DURATIONS: Readonly<Record<Lasting, Duration.Duration>> = {
  Short: Duration.seconds(4),
  Long: Duration.seconds(10),
}

export type Standing<Notice> = Readonly<{
  /** Tells one snackbar from the next: never used again. */
  id: number
  notice: Notice
  entrance: Entrance
  /** When it leaves: `None` until the clock has said when it was told. */
  maybeUntil: Opt.Option<DateTime.Utc>
}>

export type State<Notice> = Readonly<{
  /** How many notices were told so far: the id of the next. */
  told: number
  maybeStanding: Opt.Option<Standing<Notice>>
}>

/** What its parent tells it. */
export type External<Notice> = Data.TaggedEnum<{
  /** A notice to show: it takes the place of the one standing. */
  Told: { notice: Notice; lasting: Lasting }
  /** The notice standing was acted upon: it leaves at once, and raises no event. */
  Dismissed: object
}>

export type Message = Data.TaggedEnum<{
  // From commands.
  Stamped: { id: number; until: DateTime.Utc }
  // From subscriptions.
  /** The snackbar has stood its time. */
  Expired: { id: number }
}>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{
  /** Reads when the snackbar was told, which says when it leaves. */
  Stamp: { id: number; lasting: Lasting }
}>

const Command = Data.taggedEnum<Command>()

export type Event<Notice> = Data.TaggedEnum<{
  /** A notice has stood its time, and left. One replaced or dismissed raises none. */
  Expired: { notice: Notice }
}>

/** The snackbar's timer: it starts anew with each snackbar, and ends at `until` wherever it starts from. */
export type Key = Data.TaggedEnum<{ Standing: { id: number; until: DateTime.Utc } }>

const Key = Data.taggedEnum<Key>()

/** The snackbar to draw. `id` tells one from the next, to draw each anew. */
export type Model<Notice> = Opt.Option<Readonly<{ id: number; notice: Notice; entrance: Entrance }>>

const stamp = Effect.fn('StampSnackbar')(function*({ id, lasting }: Readonly<{ id: number; lasting: Lasting }>) {
  const now = yield* DateTime.now
  return Opt.some(Message.Stamped({ id, until: DateTime.addDuration(now, DURATIONS[lasting]) }))
})

// A snackbar stands from when it was told, not from when its page is shown: hidden under another page past its
// end, it leaves as soon as the page is back.
const stand = Effect.fn('StandSnackbar')(function*({ id, until }: Readonly<{ id: number; until: DateTime.Utc }>) {
  const now = yield* DateTime.now
  yield* Effect.sleep(Duration.millis(Math.max(0, DateTime.toEpochMillis(until) - DateTime.toEpochMillis(now))))
  return Message.Expired({ id })
})

type Step<Notice> = Tea.Transition<State<Notice>, Command, Event<Notice>>

/** The snackbar of the notices a parent names: `make<Notice>()`, declared as a child that is always there. */
export const make = <Notice>() =>
  Tea.program<{
    state: State<Notice>
    model: Model<Notice>
    message: Message
    command: Command
    event: Event<Notice>
    external: External<Notice>
    output: Opt.Option<Notice>
    key: Key
  }>().make({
    init: { state: { told: 0, maybeStanding: Opt.none() } },

    external: (message) => (state) =>
      Match.valueTags(message, {
        Told: ({ notice, lasting }): Tea.Step<State<Notice>, Command> => ({
          state: {
            told: state.told + 1,
            maybeStanding: Opt.some({
              id: state.told,
              notice,
              entrance: Opt.isSome(state.maybeStanding) ? 'AfterAnother' : 'Alone',
              maybeUntil: Opt.none(),
            }),
          },
          commands: [Command.Stamp({ id: state.told, lasting })],
        }),
        Dismissed: (): Tea.Step<State<Notice>, Command> => ({
          state: Opt.isSome(state.maybeStanding) ? { ...state, maybeStanding: Opt.none() } : state,
        }),
      }),

    update: (message) => (state) =>
      Match.valueTags(message, {
        // A command cannot be cancelled: the stamp of a snackbar replaced or dismissed since arrives late.
        Stamped: ({ id, until }): Step<Notice> =>
          Opt.match(state.maybeStanding, {
            onNone: () => Tea.reject,
            onSome: (standing) =>
              standing.id === id
                ? { state: { ...state, maybeStanding: Opt.some({ ...standing, maybeUntil: Opt.some(until) }) } }
                : Tea.reject,
          }),
        Expired: ({ id }): Step<Notice> =>
          Opt.match(state.maybeStanding, {
            onNone: () => Tea.defect('Expired while no snackbar stands: its timer runs only while one does'),
            onSome: ({ id: standing, notice }) =>
              standing === id
                ? { state: { ...state, maybeStanding: Opt.none() }, events: [{ _tag: 'Expired', notice }] }
                : Tea.defect('Expired for a snackbar that no longer stands: its timer is keyed by its id'),
          }),
      }),

    runCommand: Match.typeTags<Command>()({ Stamp: stamp }),

    subscriptions: (state) =>
      Opt.match(
        Opt.flatMap(state.maybeStanding, ({ id, maybeUntil }) => Opt.map(maybeUntil, (until) => ({ id, until }))),
        {
          onNone: () => [],
          onSome: (timed) => [Key.Standing(timed)],
        },
      ),

    listen: (key): Tea.Subscription<Message> => Channel.fromEffectDone(stand(key)),

    output: (state) => Opt.map(state.maybeStanding, ({ notice }) => notice),

    makeModel: (state) => Opt.map(state.maybeStanding, ({ id, notice, entrance }) => ({ id, notice, entrance })),
  })

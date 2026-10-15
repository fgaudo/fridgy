import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as Stream from 'effect/Stream'
import * as Engine from './engine.ts'

/** The view is not part of it: it lives in its own module, so it can be hot reloaded. */
export interface Program<State, Model, Message, R, Event = never, K = unknown> {
  readonly init: Engine.Step<State, Message, R>
  readonly update: Engine.Update<State, Message, R, Event>
  readonly subscriptions: Engine.Emitter<State, Message, R, K>
  readonly makeModel: (state: State) => Model
}

export const mapCommands = <A, B, R>(
  commands: ReadonlyArray<Engine.Command<A, R>>,
  f: (message: A) => B,
): ReadonlyArray<Engine.Command<B, R>> => Arr.map(commands, Effect.map(Opt.map(f)))

/** Maps the commands of a step; its events are left to the caller. */
export const mapStep = <State, A, B, R, Event>(
  { state, commands = [] }: Engine.Step<State, A, R, Event>,
  f: (message: A) => B,
): Engine.Step<State, B, R> => ({ state, commands: mapCommands(commands, f) })

export const mapSubscriptions = <A, B, R, K, NewK>(
  subscriptions: Engine.Subscriptions<K, A, R>,
  mapKey: (key: K) => NewK,
  mapMessage: (message: A) => B,
): Engine.Subscriptions<NewK, B, R> =>
  HashMap.reduce(
    subscriptions,
    HashMap.empty<NewK, Stream.Stream<B, never, R>>(),
    (acc, stream$, key) => HashMap.set(acc, mapKey(key), Stream.map(stream$, mapMessage)),
  )

type EmbedOptions<ParentState, ParentMessage, ChildState, ChildMessage, ChildEvent, R> =
  & {
    key: string
    wrap: (message: ChildMessage) => ParentMessage
    get: (state: ParentState) => Opt.Option<ChildState>
    set: (state: ParentState, child: ChildState) => ParentState
  }
  // Required exactly when the child emits events, so none can go unhandled.
  & ([ChildEvent] extends [never] ? object : {
    onEvent: (event: ChildEvent) => (state: ParentState) => Engine.Step<ParentState, ParentMessage, R>
  })

/**
 * Lifts a child program into its parent.
 *
 * - `wrap` turns a child message into a parent message (e.g. `GotHomeMsg`).
 * - `get` reads the child state from the parent state; `None` means the child
 *   is not active (e.g. the page is not on the navigation stack).
 * - `set` writes the child state back.
 * - `key` namespaces the child's subscription keys.
 * - `onEvent` handles the events the child emits, in the same transition, after
 *   the child state has been written back.
 */
export const embed = <ParentState, ParentMessage, ChildState, ChildMessage, R, ChildEvent = never, K = unknown>(
  child: Pick<Program<ChildState, unknown, ChildMessage, R, ChildEvent, K>, 'update' | 'subscriptions'>,
  options: EmbedOptions<ParentState, ParentMessage, ChildState, ChildMessage, ChildEvent, R>,
) => {
  const { key, wrap, get, set } = options
  const onEvent = 'onEvent' in options
    ? options.onEvent
    // Unreachable through the types: `onEvent` is required whenever the child has events.
    : (): never => {
      throw new Error(`embed("${key}"): the child emitted an event, but no onEvent was given`)
    }
  return {
    init: (step: Engine.Step<ChildState, ChildMessage, R>) => mapStep(step, wrap),

    update: (message: ChildMessage) => (state: ParentState): Engine.Transition<ParentState, ParentMessage, R> =>
      Opt.match(get(state), {
        onNone: (): Engine.Rejected => Engine.reject,
        onSome: (childState) => {
          const result = child.update(message)(childState)
          if (Engine.isRejected(result)) {
            return result
          }
          const step = mapStep(result, wrap)
          return Arr.reduce(
            result.events ?? [],
            { state: set(state, step.state), commands: step.commands ?? [] },
            (acc, event) => {
              const next = onEvent(event)(acc.state)
              return { state: next.state, commands: [...acc.commands, ...(next.commands ?? [])] }
            },
          )
        },
      }),

    subscriptions: (state: ParentState): Engine.Subscriptions<readonly [string, K], ParentMessage, R> =>
      Opt.match(get(state), {
        onNone: () => HashMap.empty(),
        onSome: (childState) =>
          mapSubscriptions(
            child.subscriptions(childState),
            (childKey) => [key, childKey] as const,
            wrap,
          ),
      }),
  }
}

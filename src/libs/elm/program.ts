import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as Stream from 'effect/Stream'
import type * as Engine from './engine.ts'

/**
 * Everything a page (or the root) exposes to the runtime, except the view.
 *
 * The view lives in its own module so it can be hot reloaded without
 * touching the program.
 */
export interface Program<State, Model, Message, R, K = unknown> {
  readonly init: Engine.Step<State, Message, R>
  readonly update: Engine.Update<State, Message, R>
  readonly subscriptions: Engine.Emitter<State, Message, R, K>
  readonly makeModel: (state: State) => Model
}

export const mapCommands = <A, B, R>(
  commands: ReadonlyArray<Engine.Command<A, R>>,
  f: (message: A) => B,
): ReadonlyArray<Engine.Command<B, R>> => Arr.map(commands, Effect.map(f))

export const mapStep = <State, A, B, R>(
  { state, commands = [] }: Engine.Step<State, A, R>,
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

/**
 * Lifts a child program into its parent.
 *
 * - `wrap` turns a child message into a parent message (e.g. `GotHomeMsg`).
 * - `get` reads the child state from the parent state; `None` means the child
 *   is not active (e.g. the page is not on the navigation stack).
 * - `set` writes the child state back.
 * - `key` namespaces the child's subscription keys.
 */
export const embed = <ParentState, ParentMessage, ChildState, ChildMessage, R, K>(
  child: Pick<Program<ChildState, unknown, ChildMessage, R, K>, 'update' | 'subscriptions'>,
  { key, wrap, get, set }: {
    key: string
    wrap: (message: ChildMessage) => ParentMessage
    get: (state: ParentState) => Opt.Option<ChildState>
    set: (state: ParentState, child: ChildState) => ParentState
  },
) => ({
  /** Maps the child's init commands; the caller places the child state. */
  init: (step: Engine.Step<ChildState, ChildMessage, R>) => mapStep(step, wrap),

  update: (message: ChildMessage) => (state: ParentState): Engine.Step<ParentState, ParentMessage, R> =>
    Opt.match(get(state), {
      // The child is gone: its in-flight messages are stale.
      onNone: () => ({ state }),
      onSome: (childState) => {
        const step = mapStep(child.update(message)(childState), wrap)
        return { ...step, state: set(state, step.state) }
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
})

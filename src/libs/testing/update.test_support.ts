import * as Tea from '@fgaudo/effect-tea'
import * as Equal from 'effect/Equal'
import * as fc from 'fast-check'

export type Outcome<State, Command, Event> =
  | Readonly<{ rejected: true }>
  | Readonly<{ rejected: false; after: State; commands: ReadonlyArray<Command>; events: ReadonlyArray<Event> }>

/** What `update` does with one message, for property tests that look at every outcome. */
export const outcomesOf = <State, Message extends Readonly<{ _tag: string }>, Command, Event>(
  update: Tea.Update<State, Message, Command, Event>,
) => {
  const outcome = (message: Message, before: State): Outcome<State, Command, Event> => {
    const result = update(message)(before)
    return Tea.isRejected(result)
      ? { rejected: true }
      : { rejected: false, after: result.state, commands: result.commands ?? [], events: result.events ?? [] }
  }
  return {
    outcome,
    rejects: (message: Message, before: State) => outcome(message, before).rejected,
    /** The step `update` takes; a rejection fails the test. */
    step: (message: Message, before: State) => {
      const result = outcome(message, before)
      if (result.rejected) {
        throw new Error(`update rejected ${message._tag}`)
      }
      return result
    },
  }
}

/** `after` equals `before` except, at most, for the given top-level keys. */
export const onlyChanged = <State extends object>(before: State, after: State, ...keys: ReadonlyArray<keyof State>) =>
  Equal.equals(after, { ...before, ...Object.fromEntries(keys.map((key) => [key, after[key]])) })

/** `fc.assert` of a property over the given arbitraries, with the predicate's arguments typed from them. */
export const assertProperty = <Ts extends [unknown, ...Array<unknown>]>(
  arbitraries: { [K in keyof Ts]: fc.Arbitrary<Ts[K]> },
  predicate: (...args: Ts) => boolean,
) => fc.assert(fc.property<Ts>(...[...arbitraries, predicate] as const))

import * as Engine from '@/libs/elm/engine.ts'

/** Applies `messages` in order from `from`, collecting the commands; a rejection fails the test. */
export const applyAll = <State, Message extends { readonly _tag: string }, R, Event>(
  update: Engine.Update<State, Message, R, Event>,
) =>
(messages: ReadonlyArray<Message>, from: State) =>
  messages.reduce(
    ({ state, commands }, message) => {
      const result = update(message)(state)
      if (Engine.isRejected(result)) throw new Error(`update rejected ${message._tag}`)
      return { state: result.state, commands: [...commands, ...(result.commands ?? [])] }
    },
    { state: from, commands: [] as ReadonlyArray<Engine.Command<Message, R>> },
  )

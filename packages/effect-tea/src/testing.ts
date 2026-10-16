import * as Engine from './engine.ts'

/** Applies `messages` in order from `from`, collecting the commands; a rejection fails the test. */
export const applyAll =
  <State, Message, R, Event>(update: Engine.Update<State, Message, R, Event>) =>
  (messages: ReadonlyArray<Message>, from: State) =>
    messages.reduce(
      ({ state, commands }, message, index) => {
        const result = update(message)(state)
        if (Engine.isRejected(result)) {
          throw new Error(`update rejected message ${index} (${String(Engine.describeByTag(message))})`)
        }
        return { state: result.state, commands: [...commands, ...(result.commands ?? [])] }
      },
      { state: from, commands: [] as ReadonlyArray<Engine.Command<Message, R>> },
    )

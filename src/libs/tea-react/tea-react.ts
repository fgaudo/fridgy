import type * as Tea from '@fgaudo/effect-tea'
import * as Effect from 'effect/Effect'
import type { ReactNode } from 'react'

export type View<Model, Message> = Tea.View<Model, Message, ReactNode>

/**
 * React's callbacks for the messages in the model. A dispatch needs no services and completes synchronously, so it
 * runs with `Effect.runSync`.
 */
export const handlers = <Message>(dispatch: Tea.Dispatch<Message>) => {
  const send = (message: Message) => Effect.runSync(dispatch(message))
  return {
    /** A callback that sends `message`, whatever it is called with. */
    on: (message: Message) => () => send(message),
    /** For a message built from what the callback carries, e.g. a text input's text. */
    onValue: <Value>(toMessage: (value: Value) => Message) => (value: Value) => send(toMessage(value)),
  }
}

export type Handlers<Message> = ReturnType<typeof handlers<Message>>

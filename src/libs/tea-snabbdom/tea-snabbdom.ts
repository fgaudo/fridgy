import type * as Tea from '@fgaudo/effect-tea'
import * as Effect from 'effect/Effect'
import type { Hooks, On, VNode } from 'snabbdom'

export type View<Model, Message> = Tea.View<Model, Message, VNode>

type EventName = keyof HTMLElementEventMap

/**
 * Builds snabbdom's `on` from the messages in the model. snabbdom's handlers are plain callbacks: a dispatch
 * needs no services and completes synchronously, so it runs with `Effect.runSync`.
 */
export const handlers = <Message>(dispatch: Tea.Dispatch<Message>) => {
  const send = (message: Message) => Effect.runSync(dispatch(message))
  return {
    on: (event: EventName, message: Message): On => ({ [event]: () => send(message) }),
    /** For a message built from what the event carries, e.g. an input's value. */
    onValue: <Value>(
      event: EventName,
      toMessage: (value: Value) => Message,
      read: (event: Event) => Value,
    ): On => ({ [event]: (domEvent: Event) => send(toMessage(read(domEvent))) }),
    /**
     * Always prevents the browser's default (e.g. the native menu of a long press), and sends the message when
     * there is one.
     */
    onPreventingDefault: (event: EventName, message?: Message): On => ({
      [event]: (domEvent: Event) => {
        domEvent.preventDefault()
        if (message !== undefined) send(message)
      },
    }),
  }
}

export type Handlers<Message> = ReturnType<typeof handlers<Message>>

/**
 * Writes `text` into an input only when it is created. From then on the user owns its text, and the program
 * learns it from the input's messages: writing the model's text on every frame could draw a frame older than
 * the last keys, taking them back and moving the caret. To replace the text, give the input a new `key`.
 */
export const initialValue = (text: string): NonNullable<Hooks['create']> => (_, vnode) => {
  ;(vnode.elm as HTMLInputElement).value = text
}

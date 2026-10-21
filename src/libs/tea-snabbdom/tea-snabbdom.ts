import * as Tea from '@fgaudo/effect-tea'
import type { Hooks, On, VNode } from 'snabbdom'

export type View<Model> = Tea.View<Model, VNode>

type EventName = keyof HTMLElementEventMap

/** Builds snabbdom's `on` from the model's offers: a handler exists only where the model has an action. */
export const handlers = (dispatch: Tea.Dispatch) => {
  const send = Tea.dispatchUnsafe(dispatch)
  return {
    on: (event: EventName, offer: Tea.Offered<unknown>): On => ({ [event]: () => send(offer) }),
    /** For a message built from what the event carries, e.g. an input's value. */
    onValue: <Value>(
      event: EventName,
      toOffer: (value: Value) => Tea.Offered<unknown>,
      read: (event: Event) => Value,
    ): On => ({ [event]: (domEvent: Event) => send(toOffer(read(domEvent))) }),
    /**
     * Always prevents the browser's default (e.g. the native menu of a long press), and sends the offered
     * message when there is one.
     */
    onPreventingDefault: (event: EventName, offer?: Tea.Offered<unknown>): On => ({
      [event]: (domEvent: Event) => {
        domEvent.preventDefault()
        if (offer !== undefined) send(offer)
      },
    }),
  }
}

export type Handlers = ReturnType<typeof handlers>

/**
 * Writes `text` into an input only when it is created. From then on the user owns its text, and the program
 * learns it from the input's messages: writing the model's text on every frame could draw a frame older than
 * the last keys, taking them back and moving the caret. To replace the text, give the input a new `key`.
 */
export const initialValue = (text: string): NonNullable<Hooks['create']> => (_, vnode) => {
  ;(vnode.elm as HTMLInputElement).value = text
}

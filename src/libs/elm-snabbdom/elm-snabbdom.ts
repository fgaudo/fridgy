import * as Opt from 'effect/Option'
import type { On, VNode } from 'snabbdom'
import type { InputOffer, Offer } from '@/libs/elm/offer.ts'
import type * as Elm from '@/libs/elm/view.ts'

export type View<Model, Message> = Elm.View<Model, Message, VNode>

type EventName = keyof HTMLElementEventMap

/** Builds snabbdom's `on` from the model's offers: a handler exists only while its action is offered. */
export const handlers = <Message>(dispatch: Elm.Dispatch<Message>) => ({
  on: (event: EventName, offer: Offer<Message>): On =>
    Opt.match(offer, {
      onNone: () => ({}),
      onSome: (message) => ({ [event]: () => dispatch(message) }),
    }),
  /** For a message built from what the event carries, e.g. an input's value. */
  onValue: <Value>(event: EventName, offer: InputOffer<Value, Message>, read: (event: Event) => Value): On =>
    Opt.match(offer, {
      onNone: () => ({}),
      onSome: (toMessage) => ({ [event]: (domEvent: Event) => dispatch(toMessage(read(domEvent))) }),
    }),
  /**
   * Always prevents the browser's default (e.g. the native menu of a long press), and dispatches the
   * offered message if there is one.
   */
  onPreventingDefault: (event: EventName, offer: Offer<Message>): On => ({
    [event]: (domEvent: Event) => {
      domEvent.preventDefault()
      if (Opt.isSome(offer)) dispatch(offer.value)
    },
  }),
})

export type Handlers<Message> = ReturnType<typeof handlers<Message>>

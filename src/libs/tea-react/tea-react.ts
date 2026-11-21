import type * as Tea from '@fgaudo/effect-tea'
import type { ReactNode } from 'react'

/** A view drawn by React Native: a function of its model, which sends the messages the model holds. */
export type View<Model, Message> = (model: Model, dispatch: Tea.Dispatch<Message>) => ReactNode

/**
 * React's callbacks for the messages in the model. A message is read as the callback is made, so a view writes
 * `on(model.menu.open)` where the case of `model.menu` is narrowed, whatever the callback is called with.
 */
export const handlers = <Message>(dispatch: Tea.Dispatch<Message>) => ({
  on: (message: Message) => () => dispatch(message),
})

export type Handlers<Message> = ReturnType<typeof handlers<Message>>

/** A callback that writes what it is called with into an input, through the input's dispatch (`Tea.forwardTo`). */
export const write = <A>(dispatch: Tea.Dispatch<Tea.Written<A>>) => (value: A) => dispatch({ _tag: 'Written', value })

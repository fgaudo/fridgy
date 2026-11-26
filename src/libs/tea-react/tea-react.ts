import type * as Tea from '@fgaudo/effect-tea'

export type { View } from '@fgaudo/effect-tea/react'

/**
 * React's callbacks for the messages in the model. A message is read as the callback is made, so a view writes
 * `on(model.menu.open)` where the case of `model.menu` is narrowed, whatever the callback is called with. A
 * message that the model holds without its value is filled where the element gives it:
 * `(text) => dispatch({ ...model.nameTyped, value: text })`.
 */
export const handlers = <Message>(dispatch: Tea.Dispatch<Message>) => ({
  on: (message: Message) => () => dispatch(message),
})

export type Handlers<Message> = ReturnType<typeof handlers<Message>>

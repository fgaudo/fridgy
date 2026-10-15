import type { VNode } from 'snabbdom'

export type Dispatch<Message> = (message: Message) => void

export type View<Model, Message> = (
  model: Model,
  dispatch: Dispatch<Message>,
) => VNode

/** Equivalent to Elm's `Html.map`: lets a child view dispatch parent messages. */
export const mapDispatch = <A, B>(
  dispatch: Dispatch<B>,
  f: (message: A) => B,
): Dispatch<A> =>
(message) => dispatch(f(message))

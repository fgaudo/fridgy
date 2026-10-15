import type { VNode } from 'snabbdom'

export type Dispatch<Message> = (message: Message) => void

/**
 * A pure view: same model and dispatch, same tree. No Effect, no services.
 * Equivalent to Elm's `view : Model -> Html Msg`, with `dispatch` playing the
 * role of the `msg` type parameter.
 */
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

import type { View } from '@fgaudo/effect-tea'
import { messageOf } from '@fgaudo/effect-tea/testing'
import * as Effect from 'effect/Effect'
import type { VNode } from 'snabbdom'

/**
 * Renders `view` for `model` and fires every event handler in the tree, with a
 * fake event whose target holds `inputValue` (and whose `preventDefault` and
 * `stopPropagation` do nothing). Returns the messages the handlers' offers
 * stand for, as the root of the program receives them. Hooks are not run: they
 * only touch the DOM; a snabbdom `thunk` is drawn as the renderer would.
 */
export const dispatchedBy = <Model, Message>(
  view: View<Model, VNode>,
  model: Model,
  inputValue = '',
): ReadonlyArray<Message> => {
  const dispatched: Array<Message> = []
  const visit = (node: VNode | string | undefined): void => {
    if (node === undefined || typeof node === 'string') return
    const { fn, args } = (node.data ?? {}) as Readonly<{ fn?: unknown; args?: unknown }>
    if (typeof fn === 'function' && Array.isArray(args)) {
      visit((fn as (...args: ReadonlyArray<unknown>) => VNode)(...args))
      return
    }
    for (const [type, handler] of Object.entries(node.data?.on ?? {})) {
      const event = {
        type,
        target: { value: inputValue },
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as Event
      if (typeof handler === 'function') {
        ;(handler as (this: VNode, event: Event, vnode: VNode) => void).call(node, event, node)
      }
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(view(model, (offered) =>
    Effect.sync(() => {
      dispatched.push(messageOf<Message>(offered))
    })))
  return dispatched
}

import type { VNode } from 'snabbdom'
import type { View } from '@/libs/elm/view.ts'

/**
 * Renders `view` for `model` and fires every event handler in the tree, with a
 * fake event whose target holds `inputValue`. Returns the messages the
 * handlers dispatch. Hooks are not run: they only touch the DOM.
 */
export const dispatchedBy = <Model, Message>(
  view: View<Model, Message>,
  model: Model,
  inputValue = '',
): ReadonlyArray<Message> => {
  const dispatched: Array<Message> = []
  const visit = (node: VNode | string | undefined): void => {
    if (node === undefined || typeof node === 'string') return
    for (const [type, handler] of Object.entries(node.data?.on ?? {})) {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const event = { type, target: { value: inputValue } } as unknown as Event
      if (typeof handler === 'function') {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        ;(handler as (this: VNode, event: Event, vnode: VNode) => void).call(node, event, node)
      }
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(view(model, (message) => dispatched.push(message)))
  return dispatched
}

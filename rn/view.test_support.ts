import type { View } from '@fgaudo/effect-tea'
import * as Effect from 'effect/Effect'
import { isValidElement, type ReactElement, type ReactNode } from 'react'

/**
 * Draws `view` for `model` and calls every `on…` callback in the tree, with a fake event of a scroll to the top.
 * Returns the messages the callbacks sent. Function components are called as React would; the views are pure, so
 * they use no hooks.
 */
export const messagesSentBy = <Model, Message>(
  view: View<Model, Message, ReactNode>,
  model: Model,
): ReadonlyArray<Message> => {
  const sent: Array<Message> = []
  const event = { nativeEvent: { contentOffset: { x: 0, y: 0 } } }
  const visit = (node: ReactNode): void => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child)
      return
    }
    if (!isValidElement(node)) return
    const { type, props } = node as ReactElement<Record<string, unknown>>
    if (typeof type === 'function') {
      visit((type as (props: unknown) => ReactNode)(props))
      return
    }
    for (const [name, value] of Object.entries(props)) {
      if (name.startsWith('on') && typeof value === 'function') value(event)
    }
    visit(props['children'] as ReactNode)
  }
  visit(view(model, (message) =>
    Effect.sync(() => {
      sent.push(message)
    })))
  return sent
}

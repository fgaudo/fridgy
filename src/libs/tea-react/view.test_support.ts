import * as Effect from 'effect/Effect'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import type { View } from './tea-react.ts'

/**
 * Draws `view` for `model` and calls every `on…` callback in the tree: a text input's `onChangeText` with
 * `inputValue`, the others with a fake event of a scroll to the top. Returns the messages the callbacks sent.
 * Function components are called as React would; the views are pure, so they use no hooks.
 */
export const messagesSentBy = <Model, Message>(
  view: View<Model, Message>,
  model: Model,
  inputValue = '',
): ReadonlyArray<Message> => {
  const sent: Array<Message> = []
  const event = {
    nativeEvent: { contentOffset: { x: 0, y: 0 }, text: inputValue },
    preventDefault: () => {},
    stopPropagation: () => {},
  }
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
      if (!name.startsWith('on') || typeof value !== 'function') continue
      if (name === 'onChangeText') value(inputValue)
      else value(event)
    }
    visit(props['children'] as ReactNode)
  }
  visit(view(model, (message) =>
    Effect.sync(() => {
      sent.push(message)
    })))
  return sent
}

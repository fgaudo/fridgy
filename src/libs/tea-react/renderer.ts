import type * as Tea from '@fgaudo/effect-tea'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import { createElement, type ReactNode, useSyncExternalStore } from 'react'
import type { View } from './tea-react.ts'

/**
 * effect-tea's renderer for React: the newest frame is kept in a store, and `Root` draws it with the view. React
 * batches and schedules the commits; a frame it has not drawn yet is replaced by the next one, as Elm does.
 */
export const make = <Model, Message>(view: View<Model, Message>) => {
  let current: Tea.Frame<Model, Message> | undefined
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  const Frame = (): ReactNode => {
    const frame = useSyncExternalStore(subscribe, () => current)
    return frame === undefined ? null : view(frame.model, frame.dispatch)
  }
  const render = (frames: Stream.Stream<Tea.Frame<Model, Message>>) =>
    Stream.runForEach(frames, (frame) =>
      Effect.sync(() => {
        current = frame
        for (const listener of listeners) listener()
      }))
  return { Root: () => createElement(Frame), render }
}

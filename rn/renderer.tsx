/** @jsxImportSource react */
// effect-tea's renderer for React: the newest frame is kept in a store, and one component draws it with the view.
// React batches and schedules the commits, as snabbdom's renderer does with animation frames.
import type * as Tea from '@fgaudo/effect-tea'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import type { ReactNode } from 'react'
import { useSyncExternalStore } from 'react'

export type View<Model, Message> = Tea.View<Model, Message, ReactNode>

/** A dispatch for React's callbacks: it needs no services and completes synchronously. */
export const send = <Message,>(dispatch: Tea.Dispatch<Message>) => (message: Message) => () =>
  Effect.runSync(dispatch(message))

export const makeRenderer = <Model, Message>(view: View<Model, Message>) => {
  let current: Tea.Frame<Model, Message> | undefined
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  const Root = (): ReactNode => {
    const frame = useSyncExternalStore(subscribe, () => current)
    return frame === undefined ? null : view(frame.model, frame.dispatch)
  }
  const render = (frames: Stream.Stream<Tea.Frame<Model, Message>>) =>
    Stream.runForEach(frames, (frame) =>
      Effect.sync(() => {
        current = frame
        for (const listener of listeners) listener()
      }))
  return { Root, render }
}

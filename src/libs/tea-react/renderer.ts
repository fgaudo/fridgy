import type * as Tea from '@fgaudo/effect-tea'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import { Component, createElement, type ReactNode, useSyncExternalStore } from 'react'
import type { View } from './tea-react.ts'

type Shown<Model, Message> =
  | Readonly<{ _tag: 'Nothing' }>
  | Readonly<{ _tag: 'Frame'; frame: Tea.Frame<Model, Message> }>
  | Readonly<{ _tag: 'Screen'; screen: ReactNode }>

/**
 * effect-tea's renderer for React: the newest frame is kept in a store, and `Root` draws it with the view. React
 * batches and schedules the commits; a frame it has not drawn yet is replaced by the next one, as Elm does.
 */
export const make = <Model, Message>(view: View<Model, Message>) => {
  let shown: Shown<Model, Message> = { _tag: 'Nothing' }
  // The running `render`'s end, which a view or a `makeModel` that throws while React draws it calls.
  let die: ((error: unknown) => void) | undefined
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  const draw = (next: Shown<Model, Message>) => {
    shown = next
    for (const listener of listeners) listener()
  }
  const Frame = (): ReactNode => {
    const drawn = useSyncExternalStore(subscribe, () => shown)
    return drawn._tag === 'Frame' ? view(drawn.frame.model, drawn.frame.dispatch) : null
  }
  // React has no hook that catches what its children throw: only a class does.
  class Boundary extends Component<{ children: ReactNode }, { hasThrown: boolean }> {
    override state = { hasThrown: false }
    static getDerivedStateFromError = () => ({ hasThrown: true })
    override componentDidCatch(error: unknown) {
      die?.(error)
    }
    override render() {
      return this.state.hasThrown ? null : this.props.children
    }
  }
  // A screen unmounts the boundary: the frames after it are drawn in a new one, that has not thrown.
  const Root = (): ReactNode => {
    const drawn = useSyncExternalStore(subscribe, () => shown)
    return drawn._tag === 'Screen' ? drawn.screen : createElement(Boundary, null, createElement(Frame))
  }
  /** Draws the frames until they end; a throw of the view ends it with that defect. */
  const render = (frames: Stream.Stream<Tea.Frame<Model, Message>>) =>
    Effect.raceFirst(
      Stream.runForEach(frames, (frame) => Effect.sync(() => draw({ _tag: 'Frame', frame }))),
      Effect.callback<never>((resume) => {
        die = (error) => resume(Effect.die(error))
        return Effect.sync(() => {
          die = undefined
        })
      }),
    )
  /** Draws `screen` in the frames' place, until a `render` draws a frame again: what is left once a run has ended. */
  const show = (screen: ReactNode) => Effect.sync(() => draw({ _tag: 'Screen', screen }))
  return { Root, render, show }
}

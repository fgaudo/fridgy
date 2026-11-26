import type * as Tea from '@fgaudo/effect-tea'
import { Draw } from '@fgaudo/effect-tea/react'
import { Component, createElement, type ReactNode, useSyncExternalStore } from 'react'
import type { View } from './tea-react.ts'

type Shown<Model, Message> =
  | Readonly<{ _tag: 'Nothing' }>
  | Readonly<{ _tag: 'App'; app: Tea.App<Model, Message> }>
  | Readonly<{ _tag: 'Screen'; screen: ReactNode }>

/**
 * What the app draws: `Root` draws the app it is given with effect-tea's `Draw`, or a screen in its place. The app
 * is started by its caller and outlives `Root`, which may be mounted again.
 */
export const make = <Model, Message>(view: View<Model, Message>) => {
  let shown: Shown<Model, Message> = { _tag: 'Nothing' }
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  const set = (next: Shown<Model, Message>) => {
    shown = next
    for (const listener of listeners) listener()
  }
  // React has no hook that catches what its children throw: only a class does. `Draw` throws a view's error to it
  // alone, and the boundary ends the run with it. What `makeModel` throws, the run already holds, as one defect. The
  // run then draws nothing more.
  class Boundary extends Component<{ app: Tea.App<Model, Message>; children?: ReactNode }, { hasThrown: boolean }> {
    override state = { hasThrown: false }
    static getDerivedStateFromError = () => ({ hasThrown: true })
    override componentDidCatch(error: unknown) {
      this.props.app.die(error)
    }
    override render() {
      return this.state.hasThrown ? null : this.props.children
    }
  }
  // A screen unmounts the boundary: an app drawn after it is drawn in a new one, that has not thrown.
  const Root = (): ReactNode => {
    const drawn = useSyncExternalStore(subscribe, () => shown)
    return drawn._tag === 'Screen'
      ? drawn.screen
      : drawn._tag === 'App'
      ? createElement(Boundary, { app: drawn.app }, createElement(Draw<Model, Message>, { app: drawn.app, view }))
      : null
  }
  /** Draws the model of `app`, from now on. */
  const draw = (app: Tea.App<Model, Message>) => set({ _tag: 'App', app })
  /** Draws `screen` in the app's place, until an app is drawn again: what is left once a run has ended. */
  const show = (screen: ReactNode) => set({ _tag: 'Screen', screen })
  return { Root, draw, show }
}

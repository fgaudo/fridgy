import type * as Tea from '@fgaudo/effect-tea'
import { Component, createElement, type ReactNode, useSyncExternalStore } from 'react'
import type { View } from './tea-react.ts'

type Shown<Model, Message> =
  | Readonly<{ _tag: 'Nothing' }>
  | Readonly<{ _tag: 'App'; app: Tea.App<Model, Message> }>
  | Readonly<{ _tag: 'Screen'; screen: ReactNode }>

/**
 * effect-tea's bridge to React Native: `Root` draws the model of the app it is given, read with
 * `useSyncExternalStore` as effect-tea's bridge to React reads it, or a screen in its place. React batches and
 * schedules the commits, and draws the model of the state current then.
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
  const Drawn = ({ app }: Readonly<{ app: Tea.App<Model, Message> }>): ReactNode =>
    view(useSyncExternalStore(app.subscribe, app.model), app.dispatch)
  // React has no hook that catches what its children throw: only a class does. What the view or `makeModel` throws
  // ends the run, which draws nothing more.
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
      ? createElement(Boundary, { app: drawn.app }, createElement(Drawn, { app: drawn.app }))
      : null
  }
  /** Draws the model of `app`, from now on. */
  const draw = (app: Tea.App<Model, Message>) => set({ _tag: 'App', app })
  /** Draws `screen` in the app's place, until an app is drawn again: what is left once a run has ended. */
  const show = (screen: ReactNode) => set({ _tag: 'Screen', screen })
  return { Root, draw, show }
}

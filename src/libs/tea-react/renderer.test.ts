import { describe, expect, mock, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as React from 'react'

// Bun renders nothing: a hook reads its store at once, so that `Root` and effect-tea's `Draw` can be called as
// functions.
mock.module('react', () => ({
  ...React,
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
}))
const Renderer = await import('./renderer.ts')

type Element = React.ReactElement<{ children?: React.ReactNode }>

/**
 * The texts `node` draws, its components called as React would. A class that throws in its subtree is told of it,
 * as an error boundary is, and draws what it draws after.
 */
const textsOf = (node: React.ReactNode): ReadonlyArray<string> => {
  if (typeof node === 'string') return [node]
  if (Array.isArray(node)) return node.flatMap(textsOf)
  if (!React.isValidElement(node)) return []
  const { type, props } = node as Element
  if (typeof type === 'function' && type.prototype instanceof React.Component) {
    const Class = type as unknown as {
      new(props: unknown): React.Component<{ children?: React.ReactNode }> & { componentDidCatch(e: unknown): void }
      getDerivedStateFromError(error: unknown): unknown
    }
    const instance = new Class(props)
    try {
      return textsOf(instance.render())
    } catch (error) {
      instance.state = Class.getDerivedStateFromError(error) as never
      instance.componentDidCatch(error)
      return textsOf(instance.render())
    }
  }
  if (typeof type === 'function') return textsOf((type as (props: unknown) => React.ReactNode)(props))
  return textsOf(props.children)
}

/** A program that shows its text, and takes a new one. */
const shows = (text: string) =>
  Tea.program<{ state: { text: string }; message: { _tag: 'Shown'; text: string } }>().make({
    init: { state: { text } },
    update: (message) => () => ({ state: { text: message.text } }),
    makeModel: (state) => {
      if (state.text === 'model throws') throw new Error('makeModel threw')
      return state.text
    },
  })

const screen = React.createElement('Text', null, 'Crashed')

const make = () =>
  Renderer.make<string, { _tag: 'Shown'; text: string }>((model) => {
    if (model === 'throws') throw new Error('The view threw')
    return React.createElement('Text', null, model)
  })

describe('make', () => {
  test('draws nothing before an app, then the model of its current state', () => {
    const { Root, draw } = make()
    expect(textsOf(React.createElement(Root))).toEqual([])
    const { app } = Tea.start(shows('first'))
    draw(app)
    expect(textsOf(React.createElement(Root))).toEqual(['first'])
    app.dispatch({ _tag: 'Shown', text: 'second' })
    expect(textsOf(React.createElement(Root))).toEqual(['second'])
  })

  test('draws the screen shown in the app\'s place, before any app and after one', () => {
    const { Root, draw, show } = make()
    show(screen)
    expect(textsOf(React.createElement(Root))).toEqual(['Crashed'])
    draw(Tea.start(shows('first')).app)
    show(screen)
    expect(textsOf(React.createElement(Root))).toEqual(['Crashed'])
  })

  test('draws an app drawn after the screen over it', () => {
    const { Root, draw, show } = make()
    show(screen)
    draw(Tea.start(shows('restarted')).app)
    expect(textsOf(React.createElement(Root))).toEqual(['restarted'])
  })

  test('ends the run with the defect of a view that throws, as drawn, and draws nothing of it', () =>
    Effect.runPromise(Effect.gen(function*() {
      const { Root, draw } = make()
      const { app, run } = Tea.start(shows('throws'))
      draw(app)
      expect(textsOf(React.createElement(Root))).toEqual([])
      const exit = yield* Effect.exit(run)
      const died = Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined
      expect(died instanceof Tea.ProgramDefect && died.where).toBe('render')
      expect(died instanceof Tea.ProgramDefect && died.cause).toEqual(new Error('The view threw'))
    })))

  test('ends the run with the one defect of a makeModel that throws, and draws nothing of it', () =>
    Effect.runPromise(Effect.gen(function*() {
      const { Root, draw } = make()
      const { app, run } = Tea.start(shows('model throws'))
      draw(app)
      expect(textsOf(React.createElement(Root))).toEqual([])
      const exit = yield* Effect.exit(run)
      const deaths = Exit.isFailure(exit) ? exit.cause.reasons.filter(Cause.isDieReason) : []
      expect(deaths.length).toBe(1)
      const died = deaths[0]?.defect
      expect(died instanceof Tea.ProgramDefect && died.where).toBe('render')
      expect(died instanceof Tea.ProgramDefect && died.cause).toEqual(new Error('makeModel threw'))
    })))
})

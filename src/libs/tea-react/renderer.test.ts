import { describe, expect, mock, test } from 'bun:test'
import type * as Tea from '@fgaudo/effect-tea'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import * as Stream from 'effect/Stream'
import * as React from 'react'

// Bun renders nothing: a hook reads its store at once, so that `Root` can be called as a function.
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

const frame = (model: string): Tea.Frame<string, never> => ({ model, dispatch: () => Effect.void })

const screen = React.createElement('Text', null, 'Crashed')

const make = () =>
  Renderer.make<string, never>((model) => {
    if (model === 'throws') throw new Error('The view threw')
    return React.createElement('Text', null, model)
  })

describe('make', () => {
  test('draws nothing before the first frame, then the newest frame', () =>
    Effect.runPromise(Effect.gen(function*() {
      const { Root, render } = make()
      expect(textsOf(React.createElement(Root))).toEqual([])
      yield* render(Stream.make(frame('first'), frame('second')))
      expect(textsOf(React.createElement(Root))).toEqual(['second'])
    })))

  test('draws the screen shown in the frames\' place, before any frame and after the last one', () =>
    Effect.runPromise(Effect.gen(function*() {
      const { Root, render, show } = make()
      yield* show(screen)
      expect(textsOf(React.createElement(Root))).toEqual(['Crashed'])
      yield* render(Stream.make(frame('first')))
      yield* show(screen)
      expect(textsOf(React.createElement(Root))).toEqual(['Crashed'])
    })))

  test('draws the frames of a new render over the screen', () =>
    Effect.runPromise(Effect.gen(function*() {
      const { Root, render, show } = make()
      yield* show(screen)
      yield* render(Stream.make(frame('restarted')))
      expect(textsOf(React.createElement(Root))).toEqual(['restarted'])
    })))

  test('ends the render with the defect of a view that throws, and draws nothing of it', () =>
    Effect.runPromise(Effect.gen(function*() {
      const { Root, render } = make()
      const rendering = yield* Effect.forkChild(render(Stream.concat(Stream.make(frame('throws')), Stream.never)))
      yield* Effect.yieldNow
      expect(textsOf(React.createElement(Root))).toEqual([])
      const exit = yield* Fiber.await(rendering)
      expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toEqual(new Error('The view threw'))
    })))
})

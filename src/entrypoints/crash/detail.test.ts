import { describe, expect, test } from 'bun:test'
import * as Tea from '@fgaudo/effect-tea'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { detail } from './detail.ts'

const breaks = Tea.program<{ state: { text: string }; message: { _tag: 'Shown' } }>().make({
  init: { state: { text: 'first' } },
  update: () => () => Tea.defect('A rule of the program'),
  makeModel: (state) => state.text,
})

describe('detail', () => {
  test('tells where a program broke, and which rule, a line each', () =>
    Effect.runPromise(Effect.gen(function*() {
      const { app, run } = Tea.start(breaks)
      const exit = yield* Effect.exit(Effect.andThen(Effect.sync(() => app.dispatch({ _tag: 'Shown' })), run))
      const cause = Exit.isFailure(exit) ? exit.cause : Cause.empty
      expect(detail(cause)).toBe('ProgramDefect: A defect in update on Shown\nInvariantDefect: A rule of the program')
    })))

  test('tells each defect and failure, follows what an error wraps, and leaves interruptions out', () => {
    const cause = Cause.combine(
      Cause.combine(Cause.die(new TypeError('outer', { cause: new Error('inner') })), Cause.fail('failed')),
      Cause.interrupt(),
    )
    expect(detail(cause)).toBe('TypeError: outer\nError: inner\nfailed')
  })
})

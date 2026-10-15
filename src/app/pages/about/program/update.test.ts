import { describe, expect, test } from 'bun:test'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as Engine from '@/libs/elm/engine.ts'
import { dispatchedBy } from '@/libs/testing/view.ts'
import { view } from '../view.ts'
import { Event, Message } from './messages.ts'
import { makeModel } from './model.ts'
import { licenses, state } from './state.arbitrary.ts'
import { arbitrary as maybe } from '@/libs/option/option.arbitrary.ts'
import type { State } from './state.ts'
import { update } from './update.ts'

const message: fc.Arbitrary<Message> = fc.oneof(
  licenses.map((licenses) => Message.LicensesLoaded({ licenses })),
  maybe(fc.string()).map((maybeSaying) => Message.SayingPicked({ maybeSaying })),
  fc.constant(Message.BackPressed()),
)

const step = (msg: Message, before: State) => {
  const result = update(msg)(before)
  if (Engine.isRejected(result)) throw new Error(`update rejected ${msg._tag}`)
  return { after: result.state, commands: result.commands ?? [] }
}

describe('About update', () => {
  test('is total and deterministic', () => {
    fc.assert(fc.property(state, message, (before, msg) => {
      const first = update(msg)(before)
      const second = update(msg)(before)
      return Engine.isRejected(first) || Engine.isRejected(second)
        ? Engine.isRejected(first) === Engine.isRejected(second)
        : Equal.equals(first.state, second.state)
    }))
  })

  test('every message the view can dispatch is accepted', () => {
    fc.assert(fc.property(state, (before) =>
      dispatchedBy(view, makeModel(before)).every((msg) => !Engine.isRejected(update(msg)(before)))))
  })

  test('LicensesLoaded stores the licenses and touches nothing else', () => {
    fc.assert(fc.property(state, licenses, (before, items) => {
      const { after, commands } = step(Message.LicensesLoaded({ licenses: items }), before)
      return Equal.equals(after, { ...before, licenses: { _tag: 'Loaded', items } }) && commands.length === 0
    }))
  })

  test('SayingPicked stores the saying and touches nothing else', () => {
    fc.assert(fc.property(state, maybe(fc.string()), (before, maybeSaying) => {
      const { after, commands } = step(Message.SayingPicked({ maybeSaying }), before)
      return Equal.equals(after, { ...before, saying: { _tag: 'Picked', maybeSaying } }) && commands.length === 0
    }))
  })

  test('BackPressed asks the parent to leave the page, and changes nothing', () => {
    fc.assert(fc.property(state, (before) => {
      const result = update(Message.BackPressed())(before)
      return !Engine.isRejected(result)
        && Equal.equals(result.state, before)
        && Equal.equals(result.events, [Event.LeaveRequested()])
    }))
  })

  test('the model shows the picked saying, or nothing', () => {
    fc.assert(fc.property(state, (s) => {
      const expected = s.saying._tag === 'Picked' ? Opt.getOrElse(s.saying.maybeSaying, () => '') : ''
      return makeModel(s).saying === expected
    }))
  })
})

test('arbitraries cover every variant of the state', () => {
  const tags = new Set(fc.sample(state, 300).flatMap((s) => [`licenses:${s.licenses._tag}`, `saying:${s.saying._tag}`]))
  expect([...tags].sort()).toEqual(['licenses:Loaded', 'licenses:Loading', 'saying:Loading', 'saying:Picked'])
})

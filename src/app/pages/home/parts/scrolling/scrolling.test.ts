import { describe, test } from 'bun:test'
import * as Data from 'effect/Data'
import * as Equal from 'effect/Equal'
import * as fc from 'fast-check'
import { assertProperty, outcomesOf } from '#libs/testing/update.test_support.ts'
import { type Command, type Message, program } from './scrolling.ts'

const Msg = Data.taggedEnum<Message>()
const Cmd = Data.taggedEnum<Command>()

const { step } = outcomesOf(program.update)

const state = fc.record({ isAtTop: fc.boolean(), isInteracting: fc.boolean() })

describe('Scrolling update', () => {
  test('InteractionChanged and AtTopChanged store their flag, and nothing else', () => {
    assertProperty([state, fc.boolean()], (before, flag) => {
      const interacting = step(Msg.InteractionChanged({ isInteracting: flag }), before)
      const atTop = step(Msg.AtTopChanged({ isAtTop: flag }), before)
      return Equal.equals(interacting.after, { ...before, isInteracting: flag })
        && Equal.equals(atTop.after, { ...before, isAtTop: flag })
        && interacting.commands.length === 0
        && atTop.commands.length === 0
    })
  })

  test('CloseToTopChanged scrolls to the top only when close to it and not interacting', () => {
    assertProperty([state, fc.boolean()], (before, isCloseToTop) => {
      const { after, commands } = step(Msg.CloseToTopChanged({ isCloseToTop }), before)
      const shouldScroll = isCloseToTop && !before.isInteracting
      return Equal.equals(after, before) && Equal.equals(commands, shouldScroll ? [Cmd.ScrollToTop()] : [])
    })
  })
})

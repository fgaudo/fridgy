import { describe, expect, test } from 'bun:test'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as Engine from './engine.ts'
import { offered, offeredInput } from './offer.ts'

type Message = Readonly<{ _tag: 'Set'; value: number }>

// Accepts a value only when it differs from the state.
const update: Engine.Update<number, Message, never> = ({ value }) => (state) =>
  value === state ? Engine.reject : { state: value }

describe('offered', () => {
  test('offers a message exactly when update accepts it', () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), (state, value) => {
      const message: Message = { _tag: 'Set', value }
      const offer = offered(update, state)(message)
      return value === state ? Opt.isNone(offer) : Opt.getOrThrow(offer) === message
    }))
  })
})

describe('offeredInput', () => {
  const toMessage = (value: number): Message => ({ _tag: 'Set', value })

  test('is decided with the current value, and builds the message from the value given later', () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), fc.integer(), (state, current, later) => {
      const offer = offeredInput(update, state)(toMessage, current)
      return current === state
        ? Opt.isNone(offer)
        : Opt.getOrThrow(offer)(later).value === later
    }))
  })

  test('is none when update rejects the current value', () => {
    expect(Opt.isNone(offeredInput(update, 1)(toMessage, 1))).toBe(true)
  })
})

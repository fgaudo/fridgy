import { describe, expect, test } from 'bun:test'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as fc from 'fast-check'
import * as Integer from './integer.ts'

const nonInteger = fc.double({ noNaN: true, noDefaultInfinity: true }).filter((n) => !Number.isInteger(n))

describe('Integer', () => {
  test('accepts every integer, unchanged', () => {
    fc.assert(fc.property(fc.integer(), (n) => Opt.getOrUndefined(Integer.make(n)) === n))
  })

  test('rejects every non-integer', () => {
    fc.assert(fc.property(nonInteger, (n) => Opt.isNone(Integer.make(n))))
  })

  test('the unsafe constructor throws on a non-integer', () => {
    fc.assert(fc.property(nonInteger, (n) => {
      expect(() => Integer.makeUnsafe(n)).toThrow()
    }))
  })
})

// Beyond ±MAX_SAFE_INTEGER a number no longer holds the integer exactly: two ids could become the same number.
const unsafeInteger = fc.oneof(
  fc.constantFrom(2 ** 53, -(2 ** 53), 2 ** 60),
  fc.double({ min: 2 ** 53, noNaN: true, noDefaultInfinity: true }).filter(Number.isInteger),
)

describe('Integer, beyond safe integers', () => {
  test('rejects every integer that a number does not hold exactly', () => {
    fc.assert(fc.property(unsafeInteger, (n) => Opt.isNone(Integer.make(n))))
  })

  test('accepts the largest safe integers', () => {
    expect(Opt.isSome(Integer.make(Number.MAX_SAFE_INTEGER))).toBe(true)
    expect(Opt.isSome(Integer.make(-Number.MAX_SAFE_INTEGER))).toBe(true)
  })

  // Relies on `Schema.Int` rejecting unsafe integers, which its documentation does not say.
  test('the schema agrees with the brand', () => {
    const decode = Schema.decodeUnknownOption(Integer.Schema)
    fc.assert(fc.property(unsafeInteger, (n) => Opt.isNone(decode(n))))
    expect(Opt.isSome(decode(Number.MAX_SAFE_INTEGER))).toBe(true)
    expect(Opt.isNone(decode(1.5))).toBe(true)
  })
})

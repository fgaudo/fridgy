import { describe, expect, test } from 'bun:test'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as PositiveInteger from './positive-integer.ts'

describe('PositiveInteger', () => {
  test('accepts every positive integer, unchanged', () => {
    fc.assert(fc.property(fc.integer({ min: 1 }), (n) => Opt.getOrUndefined(PositiveInteger.make(n)) === n))
  })

  test('rejects zero and negative integers', () => {
    fc.assert(fc.property(fc.integer({ max: 0 }), (n) => Opt.isNone(PositiveInteger.make(n))))
  })

  test('rejects positive non-integers', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, noNaN: true, noDefaultInfinity: true }).filter((n) => !Number.isInteger(n)),
      (n) => Opt.isNone(PositiveInteger.make(n)),
    ))
  })

  test('the unsafe constructor throws on zero and negative integers', () => {
    fc.assert(fc.property(fc.integer({ max: 0 }), (n) => {
      expect(() => PositiveInteger.makeUnsafe(n)).toThrow()
    }))
  })
})

test('PositiveInteger rejects integers beyond the safe ones', () => {
  expect(Opt.isNone(PositiveInteger.make(2 ** 53))).toBe(true)
  expect(Opt.isSome(PositiveInteger.make(Number.MAX_SAFE_INTEGER))).toBe(true)
})

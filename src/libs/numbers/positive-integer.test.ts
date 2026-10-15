import { describe, expect, test } from 'bun:test'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as PositiveInteger from './positive-integer.ts'

describe('PositiveInteger', () => {
  test('accepts every positive integer, unchanged', () => {
    fc.assert(fc.property(fc.integer({ min: 1 }), (n) => Opt.getOrUndefined(PositiveInteger.fromNumber(n)) === n))
  })

  test('rejects zero and negative integers', () => {
    fc.assert(fc.property(fc.integer({ max: 0 }), (n) => Opt.isNone(PositiveInteger.fromNumber(n))))
  })

  test('rejects positive non-integers', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, noNaN: true, noDefaultInfinity: true }).filter((n) => !Number.isInteger(n)),
      (n) => Opt.isNone(PositiveInteger.fromNumber(n)),
    ))
  })

  test('the unsafe constructor throws on zero and negative integers', () => {
    fc.assert(fc.property(fc.integer({ max: 0 }), (n) => {
      expect(() => PositiveInteger.fromNumberUnsafe(n)).toThrow()
    }))
  })
})

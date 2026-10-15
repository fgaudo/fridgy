import { describe, expect, test } from 'bun:test'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as Integer from './integer.ts'

const nonInteger = fc.double({ noNaN: true, noDefaultInfinity: true }).filter((n) => !Number.isInteger(n))

describe('Integer', () => {
  test('accepts every integer, unchanged', () => {
    fc.assert(fc.property(fc.integer(), (n) => Opt.getOrUndefined(Integer.fromNumber(n)) === n))
  })

  test('rejects every non-integer', () => {
    fc.assert(fc.property(nonInteger, (n) => Opt.isNone(Integer.fromNumber(n))))
  })

  test('the unsafe constructor throws on a non-integer', () => {
    fc.assert(fc.property(nonInteger, (n) => {
      expect(() => Integer.fromNumberUnsafe(n)).toThrow()
    }))
  })
})

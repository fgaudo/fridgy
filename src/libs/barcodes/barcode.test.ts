import { describe, expect, test } from 'bun:test'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { upcACheckDigit, upcE } from './barcode.test_arbitrary.ts'
import { expandUpcE } from './barcode.ts'

describe('expandUpcE', () => {
  test('expands a known UPC-E to its UPC-A', () => {
    expect(expandUpcE('04252614')).toEqual(Opt.some('042100005264'))
  })

  test('gives 12 digits, with the same number system and check digit, the check digit valid', () => {
    fc.assert(fc.property(upcE, (value) => {
      const expanded = Opt.getOrThrow(expandUpcE(value))
      return /^\d{12}$/.test(expanded)
        && expanded[0] === value[0]
        && expanded[11] === value[7]
        && upcACheckDigit(expanded) === expanded[11]
    }))
  })

  test('answers None for anything but 8 digits with a number system of 0 or 1', () => {
    fc.assert(fc.property(fc.string(), (value) => {
      fc.pre(!/^[01]\d{7}$/.test(value))
      return Opt.isNone(expandUpcE(value))
    }))
    expect(expandUpcE('252614')).toEqual(Opt.none())
    expect(expandUpcE('24252614')).toEqual(Opt.none())
    expect(expandUpcE('042100005264')).toEqual(Opt.none())
  })
})

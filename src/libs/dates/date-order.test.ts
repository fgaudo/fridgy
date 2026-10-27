import { describe, expect, test } from 'bun:test'
import * as Arr from 'effect/Array'
import { all, ofLocale } from './date-order.ts'

describe('ofLocale', () => {
  test('reads the order of a locale\'s numeric dates', () => {
    expect(ofLocale('it-IT')).toBe('DMY')
    expect(ofLocale('en-GB')).toBe('DMY')
    expect(ofLocale('de-DE')).toBe('DMY')
    expect(ofLocale('en-US')).toBe('MDY')
    expect(ofLocale('ja-JP')).toBe('YMD')
    expect(ofLocale('hu-HU')).toBe('YMD')
    expect(ofLocale('sv-SE')).toBe('YMD')
  })

  test('gives an order for the runtime\'s own locale', () => {
    expect(Arr.contains(all, ofLocale())).toBe(true)
  })
})

import { describe, expect, test } from 'bun:test'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as NormalizedString from './normalized-string.ts'
import * as NormalizedStringArbitrary from './normalized-string.test_arbitrary.ts'

// Mixes plain text with the characters normalization cares about: every kind
// of whitespace, and compatibility characters that NFKC rewrites.
const messyString = fc.string({
  unit: fc.oneof(
    fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v', ' ', ' ', '　', 'ﬁ', 'Ａ', '①'),
    fc.string({ minLength: 1, maxLength: 1 }),
  ),
  maxLength: 12,
})

const whitespaceOnly = fc.string({
  unit: fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v', ' ', ' ', '　'),
  maxLength: 12,
})

describe('NormalizedString.fromString', () => {
  test('rejects empty and whitespace-only strings', () => {
    fc.assert(fc.property(whitespaceOnly, (input) => Opt.isNone(NormalizedString.fromString(input))))
  })

  test('only produces non-empty, trimmed strings without whitespace runs', () => {
    fc.assert(fc.property(messyString, (input) =>
      Opt.match(NormalizedString.fromString(input), {
        onNone: () => true,
        onSome: (normalized) =>
          normalized.length > 0
          && normalized === normalized.trim()
          && !/\s{2,}/.test(normalized)
          && normalized === normalized.normalize('NFKC'),
      })))
  })

  test('accepts every string with some visible content', () => {
    fc.assert(fc.property(messyString, (input) => {
      const hasContent = input.normalize('NFKC').trim().length > 0
      return Opt.isSome(NormalizedString.fromString(input)) === hasContent
    }))
  })

  test('is idempotent: a normalized string normalizes to itself', () => {
    fc.assert(fc.property(NormalizedStringArbitrary.arbitrary, (normalized) => {
      const again = NormalizedString.fromString(normalized)
      return Opt.isSome(again) && again.value === normalized
    }))
  })

  test('regressions', () => {
    for (const input of ['', ' ', '\t', '\r', '\f', '\t\r', '　']) {
      expect(Opt.isNone(NormalizedString.fromString(input))).toBe(true)
    }
    expect<string | undefined>(Opt.getOrUndefined(NormalizedString.fromString('  ﬁsh \t\n  ＡND   chips '))).toBe(
      'fish AND chips',
    )
  })
})

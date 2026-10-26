import { describe, expect, test } from 'bun:test'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as NormalizedStringArbitrary from './normalized-string.test_arbitrary.ts'
import * as NormalizedString from './normalized-string.ts'

const whitespace = [' ', '\t', '\n', '\r', '\f', '\v', ' ', ' ', '　']
// Control characters and invisible marks, which normalization removes.
const invisible = ['\u0000', '\u0007', '\u0085', '­', '​', '⁠']

const isInvisible = (char: string) => /^[\p{Cc}­​⁠]$/u.test(char) && !/^\s$/.test(char)

// Mixes plain text with the characters normalization cares about: whitespace, invisible marks, a combining
// accent, and compatibility characters that NFC keeps as they are.
const messyString = fc.string({
  unit: fc.oneof(
    fc.constantFrom(...whitespace, ...invisible, 'é', 'ﬁ', 'Ａ', '①', '₂'),
    fc.string({ minLength: 1, maxLength: 1 }),
  ),
  maxLength: 12,
})

const blank = fc.string({ unit: fc.constantFrom(...whitespace, ...invisible), maxLength: 12 })

describe('NormalizedString.fromString', () => {
  test('rejects strings with nothing visible: empty, whitespace, invisible marks', () => {
    fc.assert(fc.property(blank, (input) => Opt.isNone(NormalizedString.fromString(input))))
  })

  test('only produces non-empty NFC strings, trimmed, single-spaced, without invisible marks', () => {
    fc.assert(fc.property(messyString, (input) =>
      Opt.match(NormalizedString.fromString(input), {
        onNone: () => true,
        onSome: (normalized) =>
          normalized.length > 0
          && normalized === normalized.trim()
          && !/\s{2,}|[^\S ]/.test(normalized)
          && ![...normalized].some(isInvisible)
          && normalized === normalized.normalize('NFC'),
      })))
  })

  test('accepts every string with some visible content', () => {
    fc.assert(fc.property(messyString, (input) => {
      const hasContent = [...input.normalize('NFC')].some((char) => !/^\s$/.test(char) && !isInvisible(char))
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
    for (const input of ['', ' ', '\t', '\r', '\f', '\t\r', '　', '​', '­⁠']) {
      expect(Opt.isNone(NormalizedString.fromString(input))).toBe(true)
    }
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['  Latte  intero ', 'Latte intero'],
      ['Latte\tintero', 'Latte intero'],
      ['Latte\nintero', 'Latte intero'],
      [' Latte  intero', 'Latte intero'],
      ['Latte​intero', 'Latteintero'],
      ['\u0007Latte', 'Latte'],
      ['Café', 'Café'],
      // NFC keeps what NFKC would rewrite.
      ['H₂O', 'H₂O'],
      ['ﬁsh', 'ﬁsh'],
      // ZWJ joins the family emoji: it stays.
      ['\u{1F468}‍\u{1F469}‍\u{1F467} famiglia', '\u{1F468}‍\u{1F469}‍\u{1F467} famiglia'],
    ]
    for (const [input, expected] of cases) {
      expect<string | undefined>(Opt.getOrUndefined(NormalizedString.fromString(input))).toBe(expected)
    }
  })
})

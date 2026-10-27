import { describe, expect, test } from 'bun:test'
import * as fc from 'fast-check'
import { piecesOf } from './pieces.ts'

describe('piecesOf', () => {
  test('joined, the pieces are the text', () => {
    fc.assert(fc.property(fc.string({ unit: 'grapheme' }), (text) => piecesOf(text).join('') === text))
  })

  test('splits a text in letters, keeping a letter and its accents, and an emoji sequence, together', () => {
    expect(piecesOf('Café 👩‍👩‍👧')).toEqual(['C', 'a', 'f', 'é', ' ', '👩‍👩‍👧'])
  })

  test('splits a text in a script whose letters join in words and the spaces between them', () => {
    expect(piecesOf('خبز أبيض')).toEqual(['خبز', ' ', 'أبيض'])
    expect(piecesOf('दूध पाउडर')).toEqual(['दूध', ' ', 'पाउडर'])
  })
})

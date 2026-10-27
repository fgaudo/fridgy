// Scripts whose letters change shape with their neighbours (Arabic and its family join them, Brahmic scripts make
// conjuncts and reorder vowel signs): a letter drawn alone would not be the letter the text shows.
const joining =
  /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Mongolian}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Myanmar}\p{Script=Khmer}\p{Script=Tibetan}]/u

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

const words = new Intl.Segmenter(undefined, { granularity: 'word' })

/**
 * The pieces a text can be drawn in, one apart from the other, looking as it does whole: its letters (grapheme
 * clusters), or its words and the spaces between them in a script whose letters join. Joined, they are the text.
 */
export const piecesOf = (text: string): ReadonlyArray<string> =>
  Array.from((joining.test(text) ? words : graphemes).segment(text), ({ segment }) => segment)

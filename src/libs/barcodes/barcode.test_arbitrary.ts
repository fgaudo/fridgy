import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { expandUpcE } from './barcode.ts'

/** The check digit of the first 11 digits of a UPC-A: the odd positions count three times, the even ones once. */
export const upcACheckDigit = (digits: string) => {
  const sum = [...digits.slice(0, 11)].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1),
    0,
  )
  return String((10 - (sum % 10)) % 10)
}

/** A valid UPC-E: a number system of 0 or 1, six data digits, and the check digit of the UPC-A it compresses. */
export const upcE: fc.Arbitrary<string> = fc.tuple(
  fc.constantFrom('0', '1'),
  fc.string({ unit: fc.constantFrom(...'0123456789'), minLength: 6, maxLength: 6 }),
).map(([n, data]) => {
  // The check digit is not moved by the expansion: any placeholder gives the UPC-A's other digits.
  const expanded = Opt.getOrThrow(expandUpcE(`${n}${data}0`))
  return `${n}${data}${upcACheckDigit(expanded)}`
})

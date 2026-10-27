import * as Opt from 'effect/Option'

/**
 * The UPC-A that a UPC-E compresses: `N D1 D2 D3 D4 D5 D6 C`, the number system `N` being 0 or 1, and the check
 * digit `C` being the UPC-A's own. `None` for any other value (a 6-digit one, without `N` and `C`, included).
 */
export const expandUpcE = (value: string): Opt.Option<string> => {
  if (!/^[01]\d{7}$/.test(value)) return Opt.none()
  const [n, d1, d2, d3, d4, d5, d6, c] = value
  switch (d6) {
    case '0':
    case '1':
    case '2':
      return Opt.some(`${n}${d1}${d2}${d6}0000${d3}${d4}${d5}${c}`)
    case '3':
      return Opt.some(`${n}${d1}${d2}${d3}00000${d4}${d5}${c}`)
    case '4':
      return Opt.some(`${n}${d1}${d2}${d3}${d4}00000${d5}${c}`)
    default:
      return Opt.some(`${n}${d1}${d2}${d3}${d4}${d5}0000${d6}${c}`)
  }
}

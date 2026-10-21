import * as DateTime from 'effect/DateTime'
import * as fc from 'fast-check'

/** Any instant from 1970 to 2100. */
export const utc = fc.integer({ min: 0, max: 4_102_444_800_000 }).map((millis) => DateTime.makeUnsafe(millis))

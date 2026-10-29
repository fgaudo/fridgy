import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import * as Day from './day.ts'

/** Any day from 1970 to 2100. */
export const arbitrary = utc.map(Day.fromDateTime)

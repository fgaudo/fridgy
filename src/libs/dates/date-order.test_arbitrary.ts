import * as fc from 'fast-check'
import { all, type DateOrder } from './date-order.ts'

export const arbitrary: fc.Arbitrary<DateOrder> = fc.constantFrom(...all)

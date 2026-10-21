import * as fc from 'fast-check'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import type { License } from './ports/licenses.ts'
import type { State } from './program.ts'

export const license: fc.Arbitrary<License> = fc.record({
  packageName: fc.string({ minLength: 1 }),
  licenses: maybe(fc.string()),
  repository: maybe(fc.webUrl()),
  publisher: maybe(fc.string()),
  email: maybe(fc.emailAddress()),
  copyright: maybe(fc.string()),
  name: maybe(fc.string()),
  description: maybe(fc.string()),
})

export const licenses = fc.uniqueArray(license, { selector: (l) => l.packageName, maxLength: 8 })

export const state: fc.Arbitrary<State> = fc.record({
  licenses: fc.oneof(
    fc.constant({ _tag: 'Loading' } as const),
    licenses.map((items) => ({ _tag: 'Loaded', items } as const)),
  ),
  saying: fc.oneof(
    fc.constant({ _tag: 'Loading' } as const),
    maybe(fc.string()).map((maybeSaying) => ({ _tag: 'Picked', maybeSaying } as const)),
  ),
})

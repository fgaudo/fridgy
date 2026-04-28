import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Record from 'effect/Record'

import * as GetLicenses from '@/app/ports/outbound/get-licenses.ts'

import * as Licenses from './generated/licenses.json' with { type: 'json' }

export const layer = Layer.succeed(
  GetLicenses.GetLicenses,
  Effect.succeed(Arr.map(Object.entries(Licenses), ([packageName, fields]): GetLicenses.License => {
    const options = Record.map(fields as Record<string, string>, (v) => Opt.fromNullishOr(v))
    return {
      copyright: Opt.none(),
      description: Opt.none(),
      email: Opt.none(),
      licenses: Opt.none(),
      name: Opt.none(),
      packageName,
      publisher: Opt.none(),
      repository: Opt.none(),
      ...options,
    }
  })),
)

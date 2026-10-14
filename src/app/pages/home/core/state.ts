import * as Arr from 'effect/Array'
import * as Brand from 'effect/Brand'
import type * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import * as Opt from 'effect/Option'
import type * as PositiveInteger from '@/libs/integer/positive-integer.ts'
import type * as NonEmptyHashSet from '@/libs/non-empty-hash-set.ts'
import type * as UnitInterval from '@/libs/unit-interval.ts'

type FetchListVersion = Brand.Branded<bigint, 'FetchListVersion'>
const _FetchListVersion = Brand.nominal<FetchListVersion>()
export const FetchListVersion = {
  increment: (version: FetchListVersion) => _FetchListVersion(version + 1n),
  make: _FetchListVersion,
}

export type State = Readonly<{
  isMenuOpen: boolean
  isViewportAtTop: boolean
  isInteracting: boolean
  versions: {
    manualFetcher: FetchListVersion
  }
  addProduct: Data.TaggedEnum<{
    Open: {
      isSubmittable: boolean
      maybeName: Opt.Option<string>
      maybeExpirationDate: Opt.Option<DateTime.Utc>
    }
    Closed: object
  }>
  productListData: Data.TaggedEnum<{
    Initial: { activity: 'fetching' | 'idle' | 'adding' }
    Error: { activity: 'fetching' | 'idle' | 'adding' }
    Empty: { activity: 'fetching' | 'idle' | 'adding' }
    Available: Readonly<{
      activity: 'idle' | 'deleting' | 'fetching' | 'adding'
      maybeSelectedProducts: Opt.Option<NonEmptyHashSet.NonEmptyHashSet<string>>
      total: PositiveInteger.PositiveInteger
      products: Arr.NonEmptyReadonlyArray<
        Data.TaggedEnum<{
          Corrupt: Readonly<{
            maybeName: Opt.Option<string>
            id: symbol
          }>
          Invalid: Readonly<{
            id: string
            maybeName: Opt.Option<string>
          }>
          Valid: Readonly<{
            id: string
            name: string
            status: Data.TaggedEnum<{
              Everlasting: object
              Stale: Readonly<{ expirationDate: DateTime.Utc }>
              Fresh: Readonly<{
                expirationDate: DateTime.Utc
                timeLeft: Duration.Duration
                freshnessRatio: UnitInterval.UnitInterval
              }>
            }>
          }>
        }>
      >
    }>
  }>
}>

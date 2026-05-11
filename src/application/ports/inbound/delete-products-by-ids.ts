import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as NonEmptyHashSet from '@/shared/non-empty-hash-set.ts'

export type Params = {
  ids: NonEmptyHashSet.NonEmptyHashSet<string>
}

export class DeleteProductsByIds extends Context.Service<
  DeleteProductsByIds,
  (params: Params) => Effect.Effect<void, void>
>()('60180a2a2cfa2a66') {}

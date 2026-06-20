import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'

import type * as NonEmptyHashSet from '@/shared/non-empty-hash-set.ts'

export class DeleteProductsByIds extends Context.Service<
  DeleteProductsByIds,
  Stream.Stream<
    { ids: NonEmptyHashSet.NonEmptyHashSet<string> }
  >
>()('446037d07d1e75e7') {}

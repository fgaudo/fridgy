import { reader as R } from 'fp-ts'
import { of } from 'rxjs'

import { FoodsWithDeps } from '@/app/commands/foods'

export const foods: FoodsWithDeps<unknown> = R.of(of([]))

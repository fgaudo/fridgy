import * as R from 'fp-ts/Reader'
import { of } from 'rxjs'

import { FoodsWithDeps } from '@/application/commands/foods'

export const foods: FoodsWithDeps<unknown> = R.of(of([]))

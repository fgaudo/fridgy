import * as Context from 'effect/Context'
import type * as Data from 'effect/Data'
import type * as Stream from 'effect/Stream'
import type { AddProduct } from '@/feature/home/application/inbound/add-product.ts'
import type { DeleteProductsByIds } from '@/feature/home/application/inbound/delete-products-by-ids.ts'
import type { Message } from '@/feature/home/application/messages.ts'

export class EventPublisher extends Context.Service<
  EventPublisher,
  (
    event: Message,
  ) => void
>()('18593f0c4c0a791a') {}

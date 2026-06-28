import * as Layer from 'effect/Layer'
import { inbound } from '@/feature/home/infrastructure/adapters/inbound.ts'
import { layer } from '@/feature/home/infrastructure/adapters/outbound/product/sql/index.ts'
import { layer as viewportLayer } from '@/feature/home/infrastructure/adapters/outbound/viewport/viewport-commands.ts'

export const live = Layer.mergeAll(inbound, layer, viewportLayer)

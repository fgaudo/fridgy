import * as Layer from 'effect/Layer'
import { inbound } from '@/core/infrastructure/adapters/inbound.ts'
import { layer } from '@/core/infrastructure/adapters/outbound/viewport.ts'

export const live = Layer.mergeAll(inbound, layer)

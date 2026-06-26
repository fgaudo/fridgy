import * as Layer from 'effect/Layer'
import { inbound } from '@/core/infrastructure/inbound/inbound.ts'
import { layer } from '@/core/infrastructure/outbound/viewport.ts'

export const live = Layer.mergeAll(inbound, layer)

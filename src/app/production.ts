import { homeLayer } from '@/app/pages/home/production.ts'
import * as Layer from 'effect/Layer'

export const live = Layer.mergeAll(homeLayer)

// Kept apart from `sqlite.layer.ts` so that bundles using it do not pull in sqlite.
import * as Layer from 'effect/Layer'
import * as ShellCapacitor from './adapters/shell/capacitor.ts'
import * as Home from './pages/home/in-memory.layer.ts'

export const layer = Layer.mergeAll(ShellCapacitor.layer, Home.layer)

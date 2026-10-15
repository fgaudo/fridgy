// Kept apart from `sqlite.ts` so that bundles using it do not pull in sqlite.
import * as Layer from 'effect/Layer'
import * as ShellCapacitor from './adapters/shell/capacitor.ts'
import * as Home from './pages/home/in-memory.ts'

/** Like `./sqlite.ts`, but data is kept in memory. */
export const layer = Layer.mergeAll(ShellCapacitor.layer, Home.layer)

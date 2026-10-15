// Kept apart from `sqlite.layer.ts` so that bundles using it do not pull in sqlite.
import * as Layer from 'effect/Layer'
import * as ShellCapacitor from './adapters/shell/capacitor.ts'
import * as About from './pages/about/bundled.layer.ts'
import * as Home from './pages/home/in-memory.layer.ts'
import * as ProductCommandsInMemory from './adapters/product-commands/in-memory.ts'

export const layer = Layer.mergeAll(ShellCapacitor.layer, ProductCommandsInMemory.layer, Home.layer, About.layer)

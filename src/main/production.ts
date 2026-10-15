// Production entrypoint: sqlite, the root view bundled in, informational logs.
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'
import * as RootView from '@/app/view.ts'
import { SnabbdomRenderer } from '@/infra/snabbdom-renderer.ts'
import { RootViews, run } from './run.ts'
import * as Sqlite from './sqlite.ts'

run(
  Layer.mergeAll(
    Sqlite.layer,
    Layer.succeed(RootViews, Stream.make(RootView.view)),
    SnabbdomRenderer.layer('#root'),
    Layer.succeed(References.MinimumLogLevel, 'Info'),
  ).pipe(Layer.orDie),
)

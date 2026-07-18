import * as Clock from 'effect/Clock'
import * as Config from 'effect/Config'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as Socket from 'effect/unstable/socket/Socket'
import * as Root from '@/core/view/view.ts'
import { CssRefresher } from '@/infra/css-refresher.ts'
import { saferImport } from '@/libs/safe.ts'

export class ViewModuleLoader extends Context.Service<
  ViewModuleLoader,
  Stream.Stream<typeof Root>
>()('97f03f4c6dbdc702', {
  make: Effect.succeed(Stream.make(Root)),
}) {
  static Static = Layer.effect(this, this.make)
  static Hot = Layer.effect(
    this,
    Effect.gen(function*() {
      const modulePath = yield* Config.string('viewPath').pipe(
        Config.nested('hotModule'),
        Config.nested('ui'),
      )
      const refresh = yield* CssRefresher
      const loadView = Effect.gen(function*() {
        yield* refresh
        const millis = yield* Clock.currentTimeMillis
        const module = (yield* saferImport(`${modulePath}?t=${millis}`)) as typeof Root
        return module
      })
      const uiModuleRef = yield* SubscriptionRef.make(yield* loadView)
      const socket = yield* Socket.Socket
      yield* socket.run(() =>
        SubscriptionRef.updateEffect(
          uiModuleRef,
          () => loadView,
        )
      ).pipe(Effect.forkScoped)

      return SubscriptionRef.changes(uiModuleRef)
    }),
  )
}

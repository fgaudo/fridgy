import { defineCustomElements } from '@ionic/pwa-elements/loader'
import * as Clock from 'effect/Clock'
import * as Config from 'effect/Config'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as SynchronizedRef from 'effect/SynchronizedRef'
import * as Socket from 'effect/unstable/socket/Socket'
import * as Snabbdom from 'snabbdom'
import { subscriptions } from '@/core/application/subs.ts'
import { init, makeDefectMessage, update } from '@/core/application/update.ts'
import type * as Root from '@/core/view/view.ts'
import { dispatch, prepare, states } from '@/libs/fsm.ts'
import { saferImport } from '@/libs/safe.ts'

export const loadAssets = Effect.all([
  Effect.promise(() => document.fonts.load('1em "Material Symbols Rounded"')),
  Effect.promise(() => document.fonts.load('1em \'Noto Sans Variable\'', ' \u0000')),
  Effect.promise(() => defineCustomElements(window)),
], { concurrency: 'unbounded' })

class CssRefresher extends Context.Service<CssRefresher, Effect.Effect<void>>()(
  '27c2478aad3c86ef',
) {}

const CssRefresherLive = Layer.effect(
  CssRefresher,
  Effect.gen(function*() {
    const cssLinkElement = yield* Effect.sync(() => document.querySelector('#css')!).pipe(
      Effect.tapDefect((error) => Effect.logFatal('Error while reading css selector', error)),
    )
    return Effect.gen(function*() {
      const millis = yield* Clock.currentTimeMillis
      const href = yield* Effect.sync(() => cssLinkElement.getAttribute('href')!).pipe(
        Effect.tapDefect((error) => Effect.logFatal('Error while reading href attribute of css', error)),
      )
      const url = new URL(href, window.location.origin)
      url.searchParams.set('t', millis.toString())
      yield* Effect.sync(() => {
        cssLinkElement.setAttribute('href', url.toString())
      })
    })
  }),
)

class ViewLoader extends Context.Service<ViewLoader, Effect.Effect<(typeof Root)>>()(
  '2c7896ab2864eaa7',
) {}

const ViewLoaderLive = Layer.effect(
  ViewLoader,
  Effect.gen(function*() {
    const modulePath = yield* Config.string('viewPath').pipe(
      Config.nested('hotModule'),
      Config.nested('ui'),
    )
    return Effect.gen(function*() {
      const millis = yield* Clock.currentTimeMillis
      const module = (yield* saferImport(`${modulePath}?t=${millis}`)) as typeof Root
      return module
    })
  }),
).pipe(Layer.orDie)

export class ModuleLoader extends Context.Service<
  ModuleLoader,
  Stream.Stream<(typeof Root)['makeView']>
>()('764a721de8db5d5b') {}

const HotModuleLoaderLive = Layer.effect(
  ModuleLoader,
  Effect.gen(function*() {
    const refreshCss = yield* CssRefresher
    const loadView = yield* ViewLoader
    const socket = yield* Socket.Socket
    const uiModuleRef = yield* SubscriptionRef.make((yield* loadView).makeView)
    yield* socket.run(() =>
      SubscriptionRef.updateEffect(
        uiModuleRef,
        Effect.fn(function*() {
          yield* refreshCss
          return (yield* loadView).makeView
        }),
      )
    ).pipe(Effect.forkScoped)
    return SubscriptionRef.changes(uiModuleRef)
  }),
).pipe(Layer.orDie)

const StaticModuleLoaderLive = Layer.effect(
  ModuleLoader,
  Effect.gen(function*() {
    const module = yield* Effect.promise(() => import('@/core/view/view.ts'))
    return Stream.make(module.makeView)
  }),
)

export class SnabbdomPatcher extends Context.Service<
  SnabbdomPatcher,
  (vnode: Snabbdom.VNode) => Effect.Effect<void>
>()('f3d714ea294367cb') {}

const PatcherLive = Layer.effect(
  SnabbdomPatcher,
  Effect.gen(function*() {
    const root = yield* Effect.sync(() => document.querySelector('#root')!)
      .pipe(
        Effect.tapDefect((error) => Effect.logFatal('Error while reading root query selector', error)),
      )
    const containerRef = yield* SynchronizedRef.make<Element | Snabbdom.VNode>(
      root,
    )
    const patch = yield* Effect.sync(() =>
      Snabbdom.init([
        Snabbdom.classModule,
        Snabbdom.propsModule,
        Snabbdom.styleModule,
        Snabbdom.attributesModule,
        Snabbdom.eventListenersModule,
      ])
    )
    return (vnode) =>
      SynchronizedRef.updateEffect(
        containerRef,
        (node) => Effect.sync(() => patch(node, vnode)),
      )
  }),
)

const base = Effect.gen(function*() {
  const fsm = yield* prepare({
    update: update,
    emitter: subscriptions,
    makeDefectMessage: makeDefectMessage,
  })(init)
  const view$ = yield* ModuleLoader
  const patcher = yield* SnabbdomPatcher
  yield* Stream.zipLatestAll(
    states(fsm),
    view$.pipe(Stream.map((view) => view)),
  ).pipe(
    Stream.map(([model, view]) => view((m) => dispatch(fsm, m))(model)),
    Stream.mapEffect(patcher),
    Stream.runDrain,
  )
})

export const Hot = Layer.merge(
  PatcherLive,
  HotModuleLoaderLive.pipe(
    Layer.provide([
      CssRefresherLive,
      ViewLoaderLive,
    ]),
  ),
)

export const Static = Layer.merge(
  PatcherLive,
  StaticModuleLoaderLive,
)

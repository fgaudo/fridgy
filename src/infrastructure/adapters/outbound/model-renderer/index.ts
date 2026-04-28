import { SplashScreen } from '@capacitor/splash-screen'
import { Toast } from '@capacitor/toast'

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

import { Renderer } from '@/app/ports/outbound/model-renderer.ts'
import { saferImport } from '@/shared/safe.ts'

import type { Message } from '@/app/core/messages.ts'
import { MessageDispatcher } from '@/app/ports/inbound/message-dispatcher.ts'
import { Actions } from '@/infra/adapters/outbound/model-renderer/actions.ts'
import * as FiberSet from 'effect/FiberSet'
import type * as Root from './pages/view.ts'

const AssetLoader = Layer.effectDiscard(
  Effect.all([
    Effect.promise(() => document.fonts.load('1em "Material Symbols Rounded"')),
    Effect.promise(() => document.fonts.load('1em \'Noto Sans Variable\'', ' \u0000')),
    Effect.promise(() => defineCustomElements(window)),
  ], { concurrency: 'unbounded' }),
)

class CssRefresher extends Context.Service<CssRefresher, Effect.Effect<void>>()('35a057c4f8666d22') {}

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

class ViewLoader extends Context.Service<ViewLoader, Effect.Effect<(typeof Root)>>()('470138c1439ad528') {}

const ViewLoaderLive = Layer.effect(
  ViewLoader,
  Effect.gen(function*() {
    const modulePath = yield* Config.string('viewPath').pipe(Config.nested('hotModule'), Config.nested('ui'))
    return Effect.gen(function*() {
      const millis = yield* Clock.currentTimeMillis
      const module = (yield* saferImport(`${modulePath}?t=${millis}`)) as typeof Root
      return module
    })
  }),
).pipe(Layer.orDie)

class ModuleLoader
  extends Context.Service<ModuleLoader, Stream.Stream<(typeof Root)['makeView']>>()('6766c67ad2dbadb9')
{}

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
    const module = yield* Effect.promise(() => import('./pages/view.ts'))
    return Stream.make(module.makeView)
  }),
)

class Patcher extends Context.Service<Patcher, (vnode: Snabbdom.VNode) => Effect.Effect<void>>()('d55767daed5c7682') {}

const PatcherLive = Layer.effect(
  Patcher,
  Effect.gen(function*() {
    const root = yield* Effect.sync(() => document.querySelector('#root')!).pipe(
      Effect.tapDefect((error) => Effect.logFatal('Error while reading root query selector', error)),
    )
    const containerRef = yield* SynchronizedRef.make<Element | Snabbdom.VNode>(root)
    const patch = yield* Effect.sync(() =>
      Snabbdom.init([
        Snabbdom.classModule,
        Snabbdom.propsModule,
        Snabbdom.styleModule,
        Snabbdom.attributesModule,
        Snabbdom.eventListenersModule,
      ])
    )
    return (vnode) => SynchronizedRef.updateEffect(containerRef, (node) => Effect.sync(() => patch(node, vnode)))
  }),
)

const ActionsLive = Layer.effect(
  Actions,
  Effect.gen(function*() {
    const dispatch = yield* Effect.gen(function*() {
      const dispatch = yield* MessageDispatcher
      const run = yield* FiberSet.makeRuntime()
      return (m: Message) => run(dispatch(m))
    })
    return { dispatch, hideSplashScreen: () => SplashScreen.hide(), showToast: (text) => Toast.show({ text }) }
  }),
)

const layer = Layer.effect(
  Renderer,
  Effect.gen(function*() {
    const view$ = yield* ModuleLoader
    const patcher = yield* Patcher
    const actions = yield* Actions
    return (model$) => {
      return Stream.zipLatestAll(
        model$,
        view$.pipe(
          Stream.switchMap(
            (makeView) =>
              Stream.fromEffect(
                makeView.pipe(
                  Effect.provideService(Actions, actions),
                ),
              ),
          ),
        ),
      ).pipe(
        Stream.map(([model, view]) => view(model)),
        Stream.mapEffect(patcher),
        Stream.runDrain,
      )
    }
  }),
)

export const Hot = layer.pipe(
  Layer.provide([
    ActionsLive,
    AssetLoader,
    PatcherLive,
    HotModuleLoaderLive.pipe(Layer.provide([CssRefresherLive, ViewLoaderLive])),
  ]),
)

export const Static = layer.pipe(
  Layer.provide([
    ActionsLive,
    AssetLoader,
    PatcherLive,
    StaticModuleLoaderLive,
  ]),
)

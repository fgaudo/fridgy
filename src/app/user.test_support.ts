// The root's tests act like a user: each message is one the shown page's model
// holds, never one built by hand. Nothing runs by itself: a command runs,
// on the app's layer over a database in memory, and a subscription sends, when the test says so.
import * as Tea from '@fgaudo/effect-tea'
import { type Rehearsal, rehearse } from '@fgaudo/effect-tea/testing'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as References from 'effect/References'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import * as SqliteMemory from '#infrastructure/sqlite/memory.layer.ts'
import * as App from './layer.ts'
import type * as AddProducts from './pages/add-products/program.ts'
import type * as Home from './pages/home/program.ts'
import { type Command, type Deps, type Message, type Model, program, type State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

export type User = Rehearsal<State, Model, Message, Command, never, Deps>

/** A message of the shown page, when its model holds it, as the root receives it. */
export type Choice = (model: Model) => Opt.Option<Message>

// The models hold each program's own messages: wrapped here as the view's `dispatchTo` wraps them.
const onHome = (pick: (model: Home.Model) => Opt.Option<Home.Message>): Choice => ({ page }) =>
  page._tag === 'Home' ? Opt.map(pick(page.model), (message) => Msg.Home({ message })) : Opt.none()

const onAddProducts = (pick: (model: AddProducts.Model) => Opt.Option<AddProducts.Message>): Choice => ({ page }) =>
  page._tag === 'AddProducts' ? Opt.map(pick(page.model), (message) => Msg.AddProducts({ message })) : Opt.none()

export const openMenu = onHome(({ menu }) => menu._tag === 'Closed' ? Opt.some(menu.open) : Opt.none())

export const requestInfo = onHome(({ menu }) => menu._tag === 'Open' ? Opt.some(menu.requestInfo) : Opt.none())

/** About is reached from Home's side menu. */
export const openAbout = [openMenu, requestInfo]

/** The page that adds products is reached from Home's button. */
export const openAddProducts = onHome(({ add }) => Opt.some(add))

export const typeName = (name: string) =>
  onAddProducts((form) => form._tag === 'Editing' ? Opt.some(form.changeName(name)) : Opt.none())

/** Adds the product that never expires, before any digit is typed. */
export const addUndated = onAddProducts((form) => form._tag === 'Editing' ? form.maybeAddUndated : Opt.none())

/** Sends each message in turn, each from the model the previous one left. */
export const perform = Effect.fnUntraced(function*(user: User, choices: ReadonlyArray<Choice>) {
  for (const choice of choices) {
    yield* user.send(choice)
  }
})

/** The back button, heard by the shown page; the test fails when the page does not observe it. */
export const back = Effect.fnUntraced(function*(user: User) {
  const shown = Arr.lastNonEmpty((yield* user.state).stack)
  const pressed = Match.valueTags(shown, {
    Home: () => Msg.Home({ message: { _tag: 'BackPressed' } }),
    AddProducts: () => Msg.AddProducts({ message: { _tag: 'BackPressed' } }),
    About: () => Msg.About({ message: { _tag: 'BackPressed' } }),
  })
  yield* user.hear([shown._tag, 'back-button'], pressed)
})

/** The subscription under `key` sends its next message, the one it would send if it ran. */
export const hearNext = Effect.fnUntraced(function*(user: User, key: unknown) {
  const listening = Arr.fromIterable(Tea.subscriptionsOf(program)(yield* user.state))
  const found = Arr.findFirst(listening, ([k]) => Equal.equals(k, key))
  if (Opt.isNone(found)) {
    return yield* Effect.die(new Error('nothing listens under this key', { cause: key }))
  }
  const maybeMessage = yield* Channel.runHead(found.value[1])
  if (Opt.isNone(maybeMessage)) {
    return yield* Effect.die(new Error('the subscription under this key ended in silence', { cause: key }))
  }
  yield* user.hear(key, maybeMessage.value)
})

// The platform's back button is out of reach: it is heard through `back`.
const backButton = Layer.succeed(BackButton, { presses: Channel.never })

const layer = Layer.merge(App.layer.pipe(Layer.provide(SqliteMemory.layer)), backButton)

/** Rehearses the app from its start; fails when a command is still pending at the end. */
export const rehearsed = <A>(scenario: (user: User) => Effect.Effect<A, never, Deps>) =>
  Effect.runPromise(
    rehearse(program, scenario).pipe(
      Effect.provide(layer),
      // Every rehearsal builds a storage, which logs that it is ready: only warnings are worth showing.
      Effect.provideService(References.MinimumLogLevel, 'Warn'),
    ),
  )

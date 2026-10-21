// The root's tests act like a user: each action is a message the shown page's
// model offers, read from the offer as the program would receive it, never one
// built by hand.
import * as Tea from '@fgaudo/effect-tea'
import { applyAll, messageOf } from '@fgaudo/effect-tea/testing'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import type * as Home from './pages/home/program.ts'
import { type Command, type Message, program, type State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

const makeModel = Tea.modelOf(program)

/** A message sent in a state, as its frame would send it. */
export type Action = (state: State) => Message

const onHome = (pick: (model: Home.Model) => Tea.Offered<unknown> | undefined): Action => (state) => {
  const { page } = makeModel(state)
  const offered = page._tag === 'Home' ? pick(page.model) : undefined
  if (offered === undefined) {
    throw new Error('Home does not offer this action')
  }
  return messageOf<Message>(offered)
}

export const openMenu = onHome(({ menu }) => menu._tag === 'Closed' ? menu.open : undefined)

export const requestInfo = onHome(({ menu }) => menu._tag === 'Open' ? menu.requestInfo : undefined)

/** About is reached from Home's side menu. */
export const openAbout = [openMenu, requestInfo]

export const openForm = onHome(({ addProduct }) => addProduct._tag === 'Closed' ? addProduct.open : undefined)

export const typeName = (name: string) =>
  onHome(({ addProduct }) =>
    addProduct._tag === 'Incomplete' || addProduct._tag === 'Complete'
      ? addProduct.changeName(name)
      : undefined
  )

export const submit = onHome(({ addProduct }) => addProduct._tag === 'Complete' ? addProduct.submit : undefined)

/** Android's back button: the shell sends it whatever is shown. */
export const back: Action = () => Msg.BackRequested()

/** What the program listens to in `state`. */
export const subscriptionsOf = (state: State) => program.subscriptions?.(state) ?? HashMap.empty()

/**
 * The first message of the subscription that runs under `key` in `state`, as the program would hear it.
 * Fails the test when nothing listens under that key.
 */
export const heard = (state: State, key: unknown) =>
  Opt.match(Arr.findFirst(Array.from(subscriptionsOf(state)), ([k]) => Equal.equals(k, key)), {
    onNone: () => Effect.die(new Error(`nothing listens under ${JSON.stringify(key)}`)),
    onSome: ([, subscription]) =>
      Effect.flatMap(Channel.runHead(subscription), (maybeMessage) =>
        Opt.match(maybeMessage, {
          onNone: () => Effect.die(new Error(`${JSON.stringify(key)} ended in silence`)),
          onSome: Effect.succeed,
        })),
  })

/** Plays the actions from `from`, each in the state the previous one left, with the commands they started. */
export const play = (actions: ReadonlyArray<Action>, from = program.init.state) =>
  actions.reduce<Readonly<{ state: State; commands: ReadonlyArray<Command> }>>(
    ({ state, commands }, act) => {
      const step = applyAll(program.update)([act(state)], state)
      return { state: step.state, commands: [...commands, ...step.commands] }
    },
    { state: from, commands: [] },
  )

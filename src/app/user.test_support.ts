// The root's tests act like a user: each action is a message the shown page's
// model offers, wrapped as its view wraps it, never one built by hand.
import * as Tea from '@fgaudo/effect-tea'
import { applyAll } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as Home from './pages/home/program.ts'
import { type Command, fromHome, type Message, program, type State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

const makeModel = Tea.modelOf(program)

/** A message sent in a state, as its frame would send it. */
export type Action = (state: State) => Message

const onHome = (pick: (model: Home.Model) => Home.Message | undefined): Action => (state) => {
  const { page } = makeModel(state)
  const offered = page._tag === 'Home' ? pick(page.model) : undefined
  if (offered === undefined) {
    throw new Error('Home does not offer this action')
  }
  return fromHome(offered)
}

export const openMenu = onHome(({ menu }) => menu._tag === 'Closed' ? menu.open : undefined)

export const requestInfo = onHome(({ menu }) => menu._tag === 'Open' ? menu.requestInfo : undefined)

/** About is reached from Home's side menu. */
export const openAbout = [openMenu, requestInfo]

export const openForm = onHome(({ addProduct }) =>
  addProduct._tag === 'Closed' ? Home.fromAddProduct(addProduct.open) : undefined
)

export const typeName = (name: string) =>
  onHome(({ addProduct }) =>
    addProduct._tag === 'Incomplete' || addProduct._tag === 'Complete'
      ? Home.fromAddProduct(addProduct.changeName(name))
      : undefined
  )

export const submit = onHome(({ addProduct }) =>
  addProduct._tag === 'Complete' ? Home.fromAddProduct(addProduct.submit) : undefined
)

/** Android's back button: the shell sends it whatever is shown. */
export const back: Action = () => Msg.BackRequested()

/** Plays the actions from `from`, each in the state the previous one left, with the commands they started. */
export const play = (actions: ReadonlyArray<Action>, from = program.init.state) =>
  actions.reduce<Readonly<{ state: State; commands: ReadonlyArray<Command> }>>(
    ({ state, commands }, act) => {
      const step = applyAll(program.update)([act(state)], state)
      return { state: step.state, commands: [...commands, ...step.commands] }
    },
    { state: from, commands: [] },
  )

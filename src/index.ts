import * as Equal from 'effect/Equal'
import * as Newtype from 'effect/Newtype'

export type Message = Newtype.Newtype<'Message', { asd: number }>

const iso = Newtype.makeIso<Message>()

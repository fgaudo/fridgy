import * as Data from 'effect/Data'
import * as Match from 'effect/Match'
import * as Struct from 'effect/Struct'
import * as Tuple from 'effect/Tuple'

import type { UseCases } from '@/business/index.ts'
import type { Update } from '@/core/state-manager.ts'

import * as Home from './home/index.viewmodel.ts'

type Message = Data.TaggedEnum<{
	Home: { message: Home.MessageImpl }
}>

type State = {
	home: Home.State
}

export const update: Update<State, Message, UseCases.All> = Match.typeTags<
	Message,
	ReturnType<Update<State, Message, UseCases.All>>
>()({
	Home: m => state => {
		const ad = Home.update(m.message)(state.home)
	},
})
Tuple.make()

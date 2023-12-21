import { Log } from './commands/log'
import { OnceFlow } from './queries/flow'
import { Now } from './queries/now'
import { OnFoods } from './streams/foods'

type Divide<T> = {
	[K in keyof T]: { [P in K]: T[K] }
}

export type Interface = Divide<{
	onceNow: Now
	onFoods: OnFoods
	log: Log
	flow: OnceFlow
}>

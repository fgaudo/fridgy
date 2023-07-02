import { ObjectType } from 'simplytyped'

import { OnceNow } from './queries/now'
import { OnFoods } from './streams/foods'

type Divide<T> = {
	[K in keyof T]: { [P in K]: T[K] }
}

export type Interface = Divide<{ onceNow: OnceNow; onFoods: OnFoods }>

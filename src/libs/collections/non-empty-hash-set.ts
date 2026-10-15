import * as Brand from 'effect/Brand'
import * as HashSet from 'effect/HashSet'

export type NonEmptyHashSet<A> = Brand.Branded<HashSet.HashSet<A>, 'core.NonEmptyHashSet'>

const NonEmptyHashSet = <A>() => Brand.make<NonEmptyHashSet<A>>((set) => HashSet.size(set) > 0)

export const make = <A>(hashSet: HashSet.HashSet<A>) => NonEmptyHashSet<A>().option(hashSet)

export const makeUnsafe = <A>(hashSet: HashSet.HashSet<A>) => NonEmptyHashSet<A>()(hashSet)

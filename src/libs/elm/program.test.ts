import { describe, expect, test } from 'bun:test'
import * as HashMap from 'effect/HashMap'
import * as Opt from 'effect/Option'
import * as Stream from 'effect/Stream'
import * as Engine from './engine.ts'
import { embed, type Program } from './program.ts'

// A child counter with one subscription, embedded in a parent that holds it and says whether it is shown.
type Parent = Readonly<{ child: Opt.Option<number>; isShown: boolean }>

type Increment = 'Increment'

const child: Pick<Program<number, unknown, Increment, never>, 'update' | 'subscriptions'> = {
  update: () => (count) => ({ state: count + 1 }),
  subscriptions: () => HashMap.make(['ticks', Stream.make<[Increment]>('Increment')]),
}

const embedded = embed(child, {
  key: 'Child',
  wrap: (message: Increment) => message,
  get: (parent: Parent) => parent.child,
  getSubscribed: (parent: Parent) => (parent.isShown ? parent.child : Opt.none()),
  set: (parent: Parent, count: number) => ({ ...parent, child: Opt.some(count) }),
})

describe('embed', () => {
  test('getSubscribed decides whether the child listens', () => {
    expect(HashMap.size(embedded.subscriptions({ child: Opt.some(0), isShown: true }))).toBe(1)
    expect(HashMap.size(embedded.subscriptions({ child: Opt.some(0), isShown: false }))).toBe(0)
  })

  test('a child that does not listen still receives its messages', () => {
    const result = embedded.update('Increment')({ child: Opt.some(0), isShown: false })
    expect(Engine.isRejected(result) ? Opt.none() : result.state.child).toEqual(Opt.some(1))
  })

  test('a child that is not there rejects its messages', () => {
    expect(Engine.isRejected(embedded.update('Increment')({ child: Opt.none(), isShown: true }))).toBe(
      true,
    )
  })

  test('without getSubscribed, the child listens whenever it is there', () => {
    const always = embed(child, {
      key: 'Child',
      wrap: (message: Increment) => message,
      get: (parent: Parent) => parent.child,
      set: (parent: Parent, count: number) => ({ ...parent, child: Opt.some(count) }),
    })
    expect(HashMap.size(always.subscriptions({ child: Opt.some(0), isShown: false }))).toBe(1)
  })
})

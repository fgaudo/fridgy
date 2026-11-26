import { describe, test } from 'bun:test'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Schema from 'effect/Schema'
import * as fc from 'fast-check'
import { arbitrary as order } from '#libs/dates/date-order.test_arbitrary.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import { checkOnFreshLayer } from '#libs/testing/fresh-layer.test_support.ts'
import { DateOrderStore, KEY } from './date-order.ts'
import { readSetting, writeSetting } from './settings.test_support.ts'
import { SettingStore } from './settings.ts'
import * as SqliteMemory from './sqlite.memory.ts'

const decode = Schema.decodeUnknownOption(DateOrder.Schema)

const layer = () =>
  DateOrderStore.layer.pipe(
    Layer.provideMerge(SettingStore.layer),
    Layer.provideMerge(SqliteMemory.layer),
  )

/** The order kept, as the storage holds it. */
const stored = Effect.map(readSetting(KEY), Opt.flatMap(decode))

/** The order as it is now: `changes` emits it on subscription. */
const current = Effect.gen(function*() {
  const { changes } = yield* DateOrderStore
  // `changes` never ends: it is stopped once the first order has arrived.
  return yield* Effect.flatMap(Channel.runHead(changes), Effect.fromOption).pipe(Effect.orDie)
})

describe('DateOrderStore', () => {
  test('emits an order from the start, with nothing kept', () =>
    checkOnFreshLayer(
      layer,
      fc.constant(undefined),
      Effect.fnUntraced(function*() {
        return Arr.contains(DateOrder.all, yield* current)
      }),
    ))

  test('emits the order kept before it, from the start', () =>
    checkOnFreshLayer(
      layer,
      order,
      Effect.fnUntraced(function*(kept) {
        yield* writeSetting(KEY, kept)
        return (yield* current) === kept
      }),
    ))

  test('set keeps the order, the last one set, which an open subscription sees', () =>
    checkOnFreshLayer(
      layer,
      fc.tuple(order, order),
      Effect.fnUntraced(function*([first, last]) {
        const { changes, set } = yield* DateOrderStore
        const orders = yield* Queue.unbounded<DateOrder.DateOrder>()
        yield* Channel.runForEach(changes, (order) => Effect.asVoid(Queue.offer(orders, order))).pipe(
          Effect.forkScoped,
        )
        const waitFor = (expected: DateOrder.DateOrder): Effect.Effect<void> =>
          Queue.take(orders).pipe(Effect.flatMap((order) => order === expected ? Effect.void : waitFor(expected)))
        yield* Queue.take(orders)
        yield* Effect.orDie(set(first))
        yield* waitFor(first)
        yield* Effect.orDie(set(last))
        yield* waitFor(last)
        return Opt.contains(yield* stored, last)
      }, Effect.scoped),
    ))
})

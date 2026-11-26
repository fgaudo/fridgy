// What every adapter of `DateOrderSetting` must do. It holds no implementation: each adapter's
// `<service>.<backing>.test.ts` runs it with its own layer, and with its storage's own reads and writes of the
// order, which reach that adapter's storage without a service.
import { describe, test } from 'bun:test'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Effect from 'effect/Effect'
import type * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as fc from 'fast-check'
import { arbitrary as order } from '#libs/dates/date-order.test_arbitrary.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import { checkOnFreshLayer } from '#libs/testing/fresh-layer.test_support.ts'
import { DateOrderSetting } from './date-order-setting.ts'

/** The adapter's storage, reached without a service. */
export type Storage<R> = Readonly<{
  /** The order kept, as the storage holds it. */
  stored: Effect.Effect<Opt.Option<DateOrder.DateOrder>, never, R>
  /** Keeps an order, as the adapter would. */
  store: (order: DateOrder.DateOrder) => Effect.Effect<void, never, R>
}>

/** The order as it is now: `changes` emits it on subscription. */
const current = Effect.gen(function*() {
  const { changes } = yield* DateOrderSetting
  // `changes` never ends: it is stopped once the first order has arrived.
  return yield* Effect.flatMap(Channel.runHead(changes), Effect.fromOption).pipe(Effect.orDie)
})

export const dateOrderSettingContract = <R>(
  name: string,
  adapter: () => Layer.Layer<DateOrderSetting | R>,
  { stored, store }: Storage<R>,
) =>
  describe(`DateOrderSetting contract (${name})`, () => {
    test('emits an order from the start, with nothing kept', () =>
      checkOnFreshLayer(
        adapter,
        fc.constant(undefined),
        Effect.fnUntraced(function*() {
          return Arr.contains(DateOrder.all, yield* current)
        }),
      ))

    test('emits the order kept before it, from the start', () =>
      checkOnFreshLayer(
        adapter,
        order,
        Effect.fnUntraced(function*(kept) {
          yield* store(kept)
          return (yield* current) === kept
        }),
      ))

    test('set keeps the order, the last one set, which an open subscription sees', () =>
      checkOnFreshLayer(
        adapter,
        fc.tuple(order, order),
        Effect.fnUntraced(function*([first, last]) {
          const { changes, set } = yield* DateOrderSetting
          const orders = yield* Queue.unbounded<DateOrder.DateOrder>()
          yield* Channel.runForEach(changes, (order) => Effect.asVoid(Queue.offer(orders, order))).pipe(
            Effect.forkScoped,
          )
          const waitFor = (expected: DateOrder.DateOrder): Effect.Effect<void> =>
            Queue.take(orders).pipe(Effect.flatMap((order) => order === expected ? Effect.void : waitFor(expected)))
          yield* Queue.take(orders)
          yield* set(first)
          yield* waitFor(first)
          yield* set(last)
          yield* waitFor(last)
          return Opt.contains(yield* stored, last)
        }, Effect.scoped),
      ))
  })

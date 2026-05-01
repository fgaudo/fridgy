import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import * as ProductRead from '@/app/ports/outbound/product/product-read.ts'

const results = (currentDate: DateTime.Utc) =>
  [
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('1'),
      maybeName: Opt.some('Milk'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('2'),
      maybeName: Opt.some('Meat'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('3'),
      maybeName: Opt.some('Cheese'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('4'),
      maybeName: Opt.some('Whatever'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('5'),
      maybeName: Opt.some('Idk'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('6'),
      maybeName: Opt.some('Milk'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('7'),
      maybeName: Opt.some('Meat'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('8'),
      maybeName: Opt.some('Cheese'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('9'),
      maybeName: Opt.some('Whatever'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('10'),
      maybeName: Opt.some('Idk'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('11'),
      maybeName: Opt.some('Meat'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('12'),
      maybeName: Opt.some('Cheese'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('13'),
      maybeName: Opt.some('Whatever'),
    },
    {
      maybeCreationDate: Opt.some(currentDate),
      maybeExpirationDate: Opt.some(currentDate),
      maybeId: Opt.some('14'),
      maybeName: Opt.some('Idk'),
    },
  ] satisfies ProductRead.ProductsDTO

export const staticLayer = Layer.effect(
  ProductRead.ProductRead,
  Effect.gen(function*() {
    const currentDate = yield* DateTime.now
    return {
      get: Effect.succeed(results(currentDate)),
      change$: Stream.make(Result.succeed(results(currentDate))),
    }
  }),
)

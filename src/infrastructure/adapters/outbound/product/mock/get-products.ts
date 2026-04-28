import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'

import * as GetProducts from '@/app/ports/outbound/product/get-products.ts'
import * as Integer from '@/shared/integer/integer.ts'

export const staticLayer = Layer.succeed(
  GetProducts.GetProducts,
  Effect.succeed(
    [
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('1'),
        maybeName: Opt.some('Milk'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('2'),
        maybeName: Opt.some('Meat'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('3'),
        maybeName: Opt.some('Cheese'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('4'),
        maybeName: Opt.some('Whatever'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('5'),
        maybeName: Opt.some('Idk'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('6'),
        maybeName: Opt.some('Milk'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('7'),
        maybeName: Opt.some('Meat'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('8'),
        maybeName: Opt.some('Cheese'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('9'),
        maybeName: Opt.some('Whatever'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('10'),
        maybeName: Opt.some('Idk'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('11'),
        maybeName: Opt.some('Meat'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('12'),
        maybeName: Opt.some('Cheese'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('13'),
        maybeName: Opt.some('Whatever'),
      },
      {
        maybeCreationDate: Integer.fromNumber(3),
        maybeExpirationDate: Integer.fromNumber(4),
        maybeId: Opt.some('14'),
        maybeName: Opt.some('Idk'),
      },
    ] satisfies GetProducts.Result,
  ),
)

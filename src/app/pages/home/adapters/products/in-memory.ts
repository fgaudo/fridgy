import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as Result from 'effect/Result'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import * as Products from '../../ports/products.ts'

const seedNames = ['Milk', 'Meat', 'Cheese', 'Eggs', 'Butter', 'Yogurt', 'Bread']

export const layer = Layer.effect(
  Products.Products,
  Effect.gen(function*() {
    const now = yield* DateTime.now
    const productsRef = yield* SubscriptionRef.make<{
      nextId: number
      products: ReadonlyArray<Products.StoredProduct>
    }>({
      nextId: seedNames.length + 1,
      products: Arr.map(seedNames, (name, index) => ({
        maybeId: Opt.some((index + 1).toString(10)),
        maybeName: Opt.some(name),
        maybeCreationDate: Opt.some(now),
        maybeExpirationDate: Opt.some(DateTime.add(now, { days: index })),
      })),
    })

    const add = RequestResolver.make<Products.AddProduct>((entries) =>
      Effect.forEach(entries, (entry) =>
        SubscriptionRef.modify(productsRef, ({ nextId, products }) => {
          const id = nextId.toString(10)
          const { product } = entry.request
          return [id, {
            nextId: nextId + 1,
            products: Arr.append(products, {
              maybeId: Opt.some(id),
              maybeName: Opt.some(product.name),
              maybeCreationDate: Opt.some(product.creationDate),
              maybeExpirationDate: product.maybeExpirationDate,
            }),
          }]
        }).pipe(Effect.flatMap((id) => Request.succeed(entry, id))), { discard: true })
    )

    const deleteById = RequestResolver.make<Products.DeleteProductById>((entries) =>
      Effect.forEach(entries, (entry) =>
        SubscriptionRef.update(productsRef, (state) => ({
          ...state,
          products: Arr.filter(
            state.products,
            (product) => !Opt.contains(product.maybeId, entry.request.id),
          ),
        })).pipe(Effect.flatMap(() => Request.succeed(entry, undefined))), { discard: true })
    )

    const changes = SubscriptionRef.changes(productsRef).pipe(
      Stream.map(({ products }): Products.Snapshot => Result.succeed(products)),
    )

    return { add, deleteById, changes }
  }),
)

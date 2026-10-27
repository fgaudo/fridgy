---
name: add-service
description: How to add a service (a port) to a Fridgy program, its adapters, its contract test and the storage code adapters share, and how an entrypoint picks among alternative adapters. Use when a program needs something from outside (storage, the platform, a library), when adding or changing an adapter, or when adding a database migration.
---

# Add a service

A service is a requirement of its consumer: shaped for it, free to change with it, never shared. Two consumers
that need the same thing each have their own (the AddProducts page's `AddProducts`, Products' `DeleteProducts`):
what they share is the domain and the infrastructure. The examples to copy are
`src/app/children/home/children/products/services/product-list/` (a read, over time, on SQL) and
`src/app/children/add-products/services/scanner/` (the platform's camera).

## The folder

```
<program>/services/<service>/
├─ <service>.ts                 the service: a Context.Service, its requests and errors
├─ <service>.<backing>.ts       an adapter: the layer that provides it, named after what backs it (sql, browser, bundled)
├─ <service>.test_contract.ts   what every adapter must do
└─ <service>.<backing>.test.ts  runs the contract on that adapter
```

## The service

```ts
export class Scanner extends Context.Service<Scanner, {
  readonly isAvailable: Effect.Effect<boolean>
  readonly barcodes: Source<string, never, ScannerError>
}>()('18d5c486d206cb02') {}
```

- The key is hashed (the language service's `deterministicKeys` rule, `default-hashed` in `tsconfig.json`);
  the typecheck rejects any other.
- The type says how the data ends. One value is an `Effect<A, E>`. Values over time are a
  `Source<A, Done, E>` (`#libs/source`): `Done` is what it ends with, `never` for one that never ends
  (database changes, the back button). Only on-going observation is a `Source`: a one-off read is an `Effect`.
- Expected failures are typed errors (`Data.TaggedError`) in the error channel; a violated invariant is a
  defect, never an error.
- Write services have no read: a program learns about writes from the storage's changes. Persistence services
  take a domain `Snapshot` and return `UnvalidatedSnapshot`s, which the program validates with
  `Product.fromSnapshot`. Writes that batch are `Req.Request`s with a `RequestResolver` (`DeleteProducts`).
- Document each member: what it does, when it fails, what observing it turns on (the camera).

The program lists the service in its `Deps` (`services: Deps` in its program) and reads it in a command or a
subscription, never in `update` or the view.

## The adapter

`<service>.<backing>.ts` exports `layer`. It is a thin wrapper on the infrastructure: an adapter that repeats
how the storage is read or written is doing the infrastructure's work, and two of them will diverge.

- Every adapter of the storage is written on `SqlClient`, providing itself the helpers it builds on
  (`ProductStore` in `#infrastructure/storage/products.ts`, the schema in `schema.ts`). It never reads domain
  fields. What every storage adapter shares (the schema, the migrations, how a product is written and deleted, how
  each column is encoded and how a product joins its expiration: `ProductStore.withExpiration`) is in
  `src/infrastructure/storage`.
- What one consumer alone asks of the storage is its adapter's own query, written on those pieces: which
  columns, which products and in what order (`ProductList`'s `SELECT` and `ORDER BY`) is the list's view, not
  how a product is read. It moves up the day a second adapter asks the same.
- A library's stream becomes a `Source` with `Source.fromStream`, which keeps listening once the stream has
  ended.
- A platform call longer than a line moves to `src/infrastructure`.

## Where the adapter is provided

- No alternative: the program's `layer.ts` merges it.
- Alternatives (the `SqlClient`'s engine, the platform's `BackButton`): the layers leave it out and each
  entrypoint in `src/entrypoints/` imports the adapter's own module
  (`#infrastructure/back-button/back-button.browser.ts`,
  `#app/children/home/children/products/services/product-list/product-list.sql.ts`), never a module that would
  load the other alternatives too. A missing choice fails the typecheck; a bundle only contains what it uses.
  A service that gains a second adapter leaves its owner's `layer.ts` this way.
- Shared code never branches on `process.env.NODE_ENV`: environments exist only in the entrypoints.

## The infrastructure's services

A fact of the platform that no consumer could shape (`src/infrastructure/back-button`: a press is a `void`;
`src/infrastructure/notifications`: a toast is a text) is a service of the infrastructure, with its adapters,
listed directly in the `Deps` of the programs that need it. The day a consumer needs it shaped (a toast with
an action), that consumer gets a service of its own, written on the infrastructure's.

## The contract

`<service>.test_contract.ts` exports a function that takes the adapter's name, a function making its layer,
and what the contract needs beyond the service (reading back a write, storing products to list or delete),
and declares a `describe` of `checkOnFreshLayer` properties (`#libs/testing/fresh-layer.test_support.ts`):

```ts
export const deleteProductsContract = <R>(
  name: string,
  adapter: () => Layer.Layer<DeleteProducts | R>,
  { insert, readBack }: Storage<R>,
) => describe(`DeleteProducts contract (${name})`, () => { ... })
```

`<service>.<backing>.test.ts` runs it with the adapter's layer over `#infrastructure/storage/sqlite.memory.ts`,
and with the storage's own test support (`#infrastructure/storage/products.test_support.ts`): reads and writes that
only tests need never go into a service, nor into another program's. A second adapter passes the same contract.

## Migrations

`src/infrastructure/storage/migrations.ts` is append-only: a phone has already run the existing ones, so a fix is
a new migration. Table and column names come from `schema.ts`. The development database (in memory, new on
every start) gets its sample products from `src/infrastructure/storage/samples.ts`.

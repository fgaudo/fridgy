---
name: add-service
description: How to add a service of the infrastructure to Fridgy (a store on the storage, a fact of the platform, an external API), its adapters and its test, how an entrypoint and a test pick among alternative adapters, and how a database migration is added. Use when a program needs something from outside (storage, the platform, a library), when adding or changing an adapter, or when adding a database migration.
---

# Add a service

What a program needs from outside is in `src/infrastructure/`, and the program lists it as it is: `src/app/` holds
no service and no adapter. The examples to copy are `src/infrastructure/storage/date-order.ts` (a setting read
over time and written, on SQL), `src/infrastructure/barcode-camera/` (the platform's camera, with an adapter of
React Native's) and `src/infrastructure/product-lookup/` (an external API behind a cache).

## Which kind

- **A store** on the storage (`ProductStore`, `DateOrderStore`): a `Context.Service` with its `make` and its
  `layer` in one module of `src/infrastructure/storage/`, written on `SqlClient`. It has one implementation: what
  changes from the phone to a test is the engine, under it. `src/app/layer.ts` provides it.
- **A service with alternatives** (the platform's `BackButton`, `BarcodeCamera`, `Haptics`, `Keyboard` and `Links`;
  the `ProductLookup`, which a test answers itself): its folder holds the service and one adapter per backing.
  The entrypoint picks one, a test another.
- **What runs nothing** (a file of the build, a constant) is a module, not a service: the licenses
  (`#infrastructure/licenses/licenses.ts`), the version (`#package.json`). A service would only add an adapter, a
  command and a state that waits for it.

A service is shaped for the programs that use it. When one needs it shaped otherwise (a vibration of its own), it
gets a module of its own in the infrastructure, written on the existing one.

## The folder

```
src/infrastructure/<service>/
├─ <service>.ts                 the service: a Context.Service, its requests and errors
├─ <service>.<backing>.ts       an adapter: the layer that provides it, named after what backs it (react-native, open-food-facts)
└─ <service>.<backing>.test.ts  that adapter's test
```

A store is one module, `src/infrastructure/storage/<store>.ts`, with its test beside it.

## The service

```ts
export class BarcodeCamera extends Context.Service<BarcodeCamera, {
  readonly isAvailable: Effect.Effect<boolean>
  readonly barcodes: Source<string, never, BarcodeCameraError>
}>()('bb6cd6526e6fa91c') {}
```

- The key is hashed (the language service's `deterministicKeys` rule, `default-hashed` in `tsconfig.json`), from
  the module's path: the typecheck rejects any other, and gives the one it expects.
- The type says how the data ends. One value is an `Effect<A, E>`. Values over time are a
  `Source<A, Done, E>` (`#libs/source`): `Done` is what it ends with, `never` for one that never ends
  (database changes, the back button). Only on-going observation is a `Source`: a one-off read is an `Effect`.
- Expected failures are typed errors (`Data.TaggedError`) in the error channel; a violated invariant is a
  defect, never an error.
- A program learns about writes from the storage's changes, never from what a write answers. A store takes a
  domain `Snapshot` and returns `UnvalidatedSnapshot`s, which the program validates with `Product.fromSnapshot`.
  A write is a function that returns an `Effect` with tagged errors; one that touches several rows does so in one
  transaction, all or nothing (`ProductStore.deleteAll`).
- Document each member: what it does, when it fails, what observing it turns on (the camera).

The program reads the service in a command or a subscription, never in `update` or the view; its type infers it
from them. When every program uses it the same way (a platform's fact, heard or done the same by all), that use is
written once in the service's module, typed with `Source` or as a command's effect, and the programs take it:
`pressesAs` in `back-button.ts`, `vibrate` in `haptics.ts`.

## The adapter

`<service>.<backing>.ts` exports `layer`, a thin wrapper on what backs it.

- A store never reads domain fields. What the stores share (the schema, the migrations, how a setting, a text
  under a name, is read and written: `SettingStore` in `settings.ts`) is in `src/infrastructure/storage`. What a
  setting's text stands for is its store's own (`date-order.ts`: the setting's name, the order's `Schema`, the
  fall-back to the device's locale's).
- A library's stream becomes a `Source` with `Source.fromStream`, which keeps listening once the stream has
  ended.
- An external API's client is a module of its own, the only one that knows its shape (`OpenFoodFacts` in
  `#infrastructure/open-food-facts/open-food-facts.ts`: how a code is normalized, which fields are asked for, how
  the answer is decoded, its timeout), which the adapter (`product-lookup.open-food-facts.ts`) wraps with the
  cache. Such an adapter also exports its layer without the client (`layerOnClient`), so that its test gives it a
  fake one.

## Where the adapter is provided

- A store: `src/app/layer.ts` merges it.
- An adapter, of a service with alternatives: the layers leave it out. The entrypoint, `src/entrypoints/native.tsx`,
  imports the adapter's own module, never one that would load the other alternatives too, and
  `src/app/user.test_support.ts` gives its own. So does the `SqlClient`'s engine
  (`#infrastructure/storage/sqlite.op-sqlite.ts`) and the `HttpClient`. A missing choice fails the typecheck; a
  bundle only contains what it uses.
- Shared code never branches on `process.env.NODE_ENV` or `Platform.OS`: choices of the platform exist only in the
  entrypoint and in tests.

## The test

Each implementation's test checks it directly, with `checkOnFreshLayer` properties
(`#libs/testing/fresh-layer.test_support.ts`), over `#infrastructure/storage/sqlite.memory.test_support.ts` for what the
storage holds. What a test needs beyond the service (reading back a write, storing what the service reads, a row
no write of the app makes) comes from the storage's own test support (`settings.test_support.ts`,
`barcodes.test_support.ts`, `products.test_support.ts`): reads and writes that only tests need never go into a
service. An adapter of the platform, which `bun test` cannot load, is seen on the emulator (`docs/testing.md`);
what it builds on that the platform does not hold is tested apart (`observed`, in `back-button.test.ts`).

## Migrations

`src/infrastructure/storage/migrations.ts` is append-only: a phone has already run the existing ones, so a fix is
a new migration. Table and column names come from `schema.ts`.

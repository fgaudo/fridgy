import * as Effect from 'effect/Effect'
import type * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as fc from 'fast-check'

/** Runs `property` for generated values, each time on a fresh layer built by `make`: a contract's check. */
export const checkOnFreshLayer = <A, E, R>(
  make: () => Layer.Layer<R>,
  arbitrary: fc.Arbitrary<A>,
  property: (a: A) => Effect.Effect<boolean, E, R>,
) =>
  fc.assert(
    fc.asyncProperty(arbitrary, (a) =>
      Effect.runPromise(
        // A request that is never completed hangs whoever waits on it: the timeout turns that into a failure.
        property(a).pipe(
          Effect.timeout('5 seconds'),
          Effect.provide(make()),
          Effect.orDie,
          // Every run builds its services, which may log that they are ready: only warnings are worth showing.
          Effect.provideService(References.MinimumLogLevel, 'Warn'),
        ),
      )),
    { numRuns: 25 },
  )

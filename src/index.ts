import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

await Effect.runPromise(
	Effect.gen(function* () {
		yield* Stream.tick('1 second').pipe(
			Stream.onStart(Effect.log('lol')),
			Stream.map((_a, i) => i),
			Stream.flatMap(() =>
				Stream.fromEffect(
					Effect.delay(
						Effect.sync(() => 3),
						'6 seconds',
					),
				),
			),
			Stream.onStart(Effect.log('ciao')),
			Stream.runForEach(Effect.log),
			Effect.forkChild,
		)

		yield* Effect.log('Start')
	}),
)

import * as Effect from 'effect/Effect'

const resource = () => Effect.succeed(3)

const cancel = Effect.runCallback(
	Effect.scoped(
		Effect.gen(function* () {
			yield* resource()
			console.log(`Resource allocated`)

			yield* Effect.addFinalizer(() => {
				console.log(`Running finalizer`)
				return Effect.void
			})
			console.log(`Work done`)
		}),
	),
	{
		onExit: exit => {
			console.log(`Fiber exit:`, exit._op)
		},
	},
)

cancel()

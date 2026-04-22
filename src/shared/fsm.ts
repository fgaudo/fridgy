import * as Array from 'effect/Array'
import type * as Cause from 'effect/Cause'
import * as Context from 'effect/Context'
import type * as Data from 'effect/Data'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Equal from 'effect/Equal'
import * as Function from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Layer from 'effect/Layer'
import * as Newtype from 'effect/Newtype'
import * as Option from 'effect/Option'
import * as PubSub from 'effect/PubSub'
import * as Queue from 'effect/Queue'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'

export type Command<Message, R> = Effect.Effect<
	Array.NonEmptyReadonlyArray<Message>,
	never,
	R
>

export type Step<State, Message, R> = readonly [
	State,
	ReadonlyArray<Command<Message, R>>,
]

export type Transition<State, Message> = Data.TaggedEnum<{
	Initial: { state: State }
	Subsequent: { state: State; messages: Array.NonEmptyReadonlyArray<Message> }
}>

export type Update<State, Message, R> = (
	message: Message,
) => (state: State) => Step<State, Message, R>

export type Emitter<State, Message, R, K = unknown> = (
	s: State,
) => HashMap.HashMap<
	K,
	Stream.Stream<Array.NonEmptyReadonlyArray<Message>, never, R>
>

export type Engine<State, Message> = Newtype.Newtype<
	'#fgaudo/fsm/Engine',
	{
		messageQueue: Queue.Queue<Array.NonEmptyReadonlyArray<Message>>
		transitionStream: Stream.Stream<Transition<State, Message>, never, never>
	}
>

export const prepare = <State, Message, R, K>({
	update,
	handleDefect,
	emitter,
}: {
	update: Update<State, Message, R>
	handleDefect: (
		cause: Cause.Cause<unknown>,
	) => NoInfer<Array.NonEmptyReadonlyArray<Message>>
	emitter?: Emitter<State, Message, R, K>
}) => {
	const iso = Newtype.makeIso<Engine<State, Message>>()
	const maybeEmitter = Option.fromUndefinedOr(emitter)
	return Effect.fn(function* ([initState, initCommands]: Step<
		State,
		Message,
		R
	>) {
		const transitionRef = yield* Effect.acquireRelease(
			SubscriptionRef.make<Transition<State, Message>>({
				_tag: 'Initial',
				state: initState,
			}),
			ref => PubSub.shutdown(ref.pubsub),
		)
		const messageQueue = yield* Effect.acquireRelease(
			Queue.unbounded<Array.NonEmptyReadonlyArray<Message>>(),
			Queue.shutdown,
		)
		const update$ = Stream.fromQueue(messageQueue).pipe(
			Stream.onStart(Effect.logDebug('Update loop started')),
			Stream.flatMap(messages =>
				SubscriptionRef.modify(transitionRef, ({ state }) => {
					const [newState, commands] = Array.reduce(
						messages,
						[state, Array.empty<Command<Message, R>>()] as const,
						([s, commands], message) => {
							const [newState, newCommands] = update(message)(s)
							return [newState, Array.appendAll(commands, newCommands)] as const
						},
					)
					return [
						commands,
						{ _tag: 'Subsequent', messages, state: newState },
					] as const
				}).pipe(
					Stream.fromEffect,
					Stream.catchCause(
						Function.flow(
							cause => Queue.offer(messageQueue, handleDefect(cause)),
							Stream.fromEffect,
							Stream.flatMap(() => Stream.empty),
						),
					),
				),
			),
			Stream.flattenIterable,
			Stream.flattenIterable,
			Stream.merge(Stream.make(...initCommands)),
			Stream.flattenEffect({ concurrency: 'unbounded', unordered: true }),
		)
		const message$ = Option.isNone(maybeEmitter)
			? update$
			: Stream.unwrap(
					Effect.gen(function* () {
						const isReady = yield* Deferred.make()
						const subs$ = SubscriptionRef.changes(transitionRef).pipe(
							Stream.onStart(
								Effect.gen(function* () {
									yield* Effect.logDebug('Subs started')
									yield* Deferred.succeed(isReady, undefined)
								}),
							),
							Stream.flatMap(({ state }) =>
								Stream.sync(() => maybeEmitter.value(state)).pipe(
									Stream.catchCause(
										Function.flow(
											handleDefect,
											messages =>
												Stream.fromEffect(Queue.offer(messageQueue, messages)),
											Stream.flatMap(() => Stream.empty),
										),
									),
								),
							),
							Stream.map(
								map => [HashSet.fromIterable(HashMap.keys(map)), map] as const,
							),
							Stream.changesWith(([keys1], [keys2]) =>
								Equal.equals(keys1, keys2),
							),
							Stream.map(([, subs]) => subs),
							Stream.mapAccumEffect(
								HashMap.empty<K, Deferred.Deferred<void>>,
								Effect.fn(function* (activeSubscriptions, subscriptions) {
									const mutable = HashMap.beginMutation(activeSubscriptions)
									for (const [key, interruption] of activeSubscriptions) {
										if (HashMap.has(subscriptions, key)) {
											continue
										}
										HashMap.remove(mutable, key)
										yield* Deferred.succeed(interruption, undefined)
									}
									let streams =
										Array.empty<
											Stream.Stream<
												Array.NonEmptyReadonlyArray<Message>,
												never,
												R
											>
										>()
									for (const [key, stream] of subscriptions) {
										if (HashMap.has(mutable, key)) {
											continue
										}
										const interruption = yield* Deferred.make<void>()
										HashMap.set(mutable, key, interruption)
										streams = Array.append(
											streams,
											stream.pipe(
												Stream.onError(cause =>
													Queue.offer(messageQueue, handleDefect(cause)),
												),
												Stream.retry(Schedule.forever),
												Stream.interruptWhen(Deferred.await(interruption)),
											),
										)
									}
									return [HashMap.endMutation(mutable), streams] as const
								}, Effect.uninterruptible),
							),
							Stream.flatten({ concurrency: 'unbounded' }),
						)
						return subs$.pipe(
							Stream.merge(
								Stream.unwrap(
									Effect.gen(function* () {
										yield* Deferred.await(isReady)
										return update$
									}),
								),
							),
						)
					}),
				)
		const transition$ = yield* message$.pipe(
			Stream.tap(messages => Queue.offer(messageQueue, messages)),
			Stream.drain,
			Stream.merge(SubscriptionRef.changes(transitionRef)),
			Stream.broadcast({ capacity: 'unbounded', replay: 1 }),
		)
		return iso.set({
			messageQueue,
			transitionStream: transition$,
		})
	})
}

export const dispatch = Function.dual<
	<Message>(
		that: Array.NonEmptyReadonlyArray<Message>,
	) => <State>(self: Engine<State, Message>) => Effect.Effect<void>,
	<State, Message>(
		self: Engine<State, Message>,
		that: Array.NonEmptyReadonlyArray<Message>,
	) => Effect.Effect<void>
>(
	2,
	Effect.fn(function* (stateManager, messages) {
		const { messageQueue } = Newtype.value(stateManager)

		yield* Queue.offer(messageQueue, messages)
	}),
)

export const transitions = <State, Message>(
	stateManager: Engine<State, Message>,
) => {
	const { transitionStream } = Newtype.value(stateManager)
	return transitionStream
}

export const Engine = <S, M>() =>
	Context.Service<Engine<S, M>>('#fgaudo/fsm/Engine')

export const layer = <S, M, R, K>({
	update,
	emitter,
	handleDefect,
	init,
}: {
	handleDefect: (
		cause: Cause.Cause<unknown>,
	) => NoInfer<Array.NonEmptyReadonlyArray<M>>
	update: Update<S, M, R>
	emitter: Emitter<S, M, R, K>
	init: Step<S, M, R>
}) =>
	Layer.effect(Engine<S, M>(), prepare({ emitter, handleDefect, update })(init))

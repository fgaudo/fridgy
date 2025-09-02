import * as Duration from 'effect/Duration'
import { pipe } from 'effect/Function'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'

import { Message } from './update.svelte.ts'

const refreshTimeIntervalFrequency = Duration.seconds(20)

export const refreshTimeInterval = pipe(
	Stream.make(Message.StartRefreshTime()),
	Stream.repeat(Schedule.spaced(refreshTimeIntervalFrequency)),
)

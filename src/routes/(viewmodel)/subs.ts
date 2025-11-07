import * as Duration from 'effect/Duration'
import { pipe } from 'effect/Function'
import * as Schedule from 'effect/Schedule'
import * as Stream from 'effect/Stream'

import { InternalMessage } from './update.ts'

const refreshTimeIntervalFrequency = Duration.seconds(20)

export const refreshTimeInterval = pipe(
	Stream.make(InternalMessage.StartRefreshTime()),
	Stream.repeat(Schedule.spaced(refreshTimeIntervalFrequency)),
)

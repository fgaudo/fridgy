import * as Browser from '@effect/platform-browser'
import * as Effect from 'effect/Effect'

import { Main } from '@/app/main.ts'
import { AppLayer } from '@/infra/configuration/app.ts'

Browser.BrowserRuntime.runMain(
	Effect.provide(Main, AppLayer)
)

import { SplashScreen } from '@capacitor/splash-screen'
import { Toast } from '@capacitor/toast'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { SplashScreenService } from '@/app/ports/ui/splashscreen-service.ts'
import { ToastService } from '@/app/ports/ui/toast-service.ts'

export const layer = Layer.mergeAll(
	Layer.succeed(SplashScreenService, {
		hide: Effect.promise(() => SplashScreen.hide()),
	}),
	Layer.succeed(ToastService, {
		show: Effect.fn(function* (text: string) {
			return yield* Effect.promise(() => Toast.show({ text }))
		}),
	}),
)

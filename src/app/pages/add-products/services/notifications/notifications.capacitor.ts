import { Toast } from '@capacitor/toast'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { NotificationError, Notifications } from './notifications.ts'

/** Native toasts on Android; Capacitor falls back to a web implementation in the browser. */
export const layer = Layer.succeed(Notifications, {
  showToast: (text) =>
    Effect.tryPromise({
      try: () => Toast.show({ text }),
      catch: (cause) => new NotificationError({ cause }),
    }),
})

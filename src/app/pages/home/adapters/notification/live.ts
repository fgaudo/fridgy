import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { Notification } from '@/feature/home/application/outbound/notification.ts'

export const notificationLive = Layer.succeed(
  Notification,
  {
    showToast: (m) => Effect.void,
  },
)

import type { Message } from '@/app/core/messages.ts'
import * as Context from 'effect/Context'

export class Actions extends Context.Service<
  Actions,
  { dispatch: (m: Message) => void; hideSplashScreen: () => void; showToast: (text: string) => void }
>()(
  'e2a83524e46fb434',
) {}

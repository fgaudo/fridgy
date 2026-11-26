import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { Linking } from 'react-native'
import { Links, LinksError } from './links.ts'

/** Android's activity for a URL, through React Native: its promise rejects when no app takes the URL. */
export const layer = Layer.succeed(Links, {
  open: (url) =>
    Effect.tryPromise({
      try: () => Linking.openURL(url),
      catch: (cause) => new LinksError({ cause }),
    }),
})

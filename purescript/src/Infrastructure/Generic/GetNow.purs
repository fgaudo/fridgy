module Infrastructure.Generic.GetNow where

import Prelude

import Application.Query.GetNow (NowData, RetrievalError(..))
import Core.MonadError (modifyError)
import Effect.Class (class MonadEffect, liftEffect)
import Effect.Exception (Error)
import Effect.Now (now)

genericGetNow
  :: forall m. MonadEffect m => NowData m
genericGetNow =
  modifyError (\(e :: Error) -> RetrievalError $ show e) (liftEffect now)


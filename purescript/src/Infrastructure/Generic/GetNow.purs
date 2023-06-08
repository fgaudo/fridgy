module MyApp.Infrastructure.Generic.GetNow (genericGetNow) where

import Prelude

import Effect.Class (class MonadEffect, liftEffect)
import Effect.Exception (Error)
import Effect.Now (now)
import MyApp.Application.Query.GetNow (NowData, RetrievalError(..))
import MyApp.Core.MonadError (modifyError)

genericGetNow
  :: forall m. MonadEffect m => NowData m
genericGetNow =
  modifyError (\(e :: Error) -> RetrievalError $ show e) (liftEffect now)


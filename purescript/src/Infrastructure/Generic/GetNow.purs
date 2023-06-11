module MyApp.Infrastructure.Generic.GetNow (genericGetNow) where

import Prelude

import Control.Monad.Except (runExceptT)
import Effect.Aff.Class (class MonadAff)
import Effect.Class (liftEffect)
import Effect.Exception (Error)
import Effect.Now (now)
import MyApp.Application.Query.GetNow (NowData, RetrievalError(..))
import MyApp.Core.MonadError (modifyError)

genericGetNow
  :: forall m. MonadAff m => m NowData
genericGetNow = runExceptT $ modifyError
  (\(e :: Error) -> RetrievalError $ show e)
  (liftEffect now)


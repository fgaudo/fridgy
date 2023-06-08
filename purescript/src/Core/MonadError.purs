module MyApp.Core.MonadError (modifyError) where

import Prelude

import Control.Monad.Error.Class
  ( class MonadThrow
  , throwError
  )
import Control.Monad.Except (ExceptT, runExceptT)
import Data.Either (either)

-- Copied from haskell..
modifyError
  :: forall e' m e a. MonadThrow e' m => (e -> e') -> ExceptT e m a -> m a
modifyError f m = runExceptT m >>= either (throwError <<< f) pure
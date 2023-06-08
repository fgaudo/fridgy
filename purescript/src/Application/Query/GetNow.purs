module Application.Query.GetNow (RetrievalError(..), class GetNow, getNow) where

import Prelude

import Data.DateTime.Instant (Instant)
import Data.Either (Either)

data RetrievalError = RetrievalError String

class Monad m <= GetNow m where
  getNow :: m (Either RetrievalError Instant)
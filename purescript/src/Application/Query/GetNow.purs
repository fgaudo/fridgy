module MyApp.Application.Query.GetNow
  ( RetrievalError(..)
  , class GetNow
  , NowData
  , getNow
  ) where

import Data.DateTime.Instant (Instant)
import Data.Either (Either)

data RetrievalError = RetrievalError String

type NowData = Either RetrievalError Instant

class GetNow m where
  getNow :: m NowData
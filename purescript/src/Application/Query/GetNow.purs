module Application.Query.GetNow
  ( RetrievalError(..)
  , class GetNow
  , NowData
  , getNow
  ) where

import Control.Monad.Except (ExceptT)
import Data.DateTime.Instant (Instant)

data RetrievalError = RetrievalError String

type NowData m = ExceptT RetrievalError m Instant

class GetNow m where
  getNow :: NowData m
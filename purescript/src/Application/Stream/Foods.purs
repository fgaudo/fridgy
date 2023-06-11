module Application.Stream.Foods where

import Prelude

import Data.DateTime.Instant (Instant)
import Data.HashMap (HashMap)
import Pipes.Core (Producer)

data RetrievalError = RetrievalError String

type FoodData m = Producer
  ( HashMap String
      { name :: String
      , id :: String
      , expiration :: Instant
      }
  )
  m
  Unit

class Monad m <= Foods m where
  foods :: FoodData m
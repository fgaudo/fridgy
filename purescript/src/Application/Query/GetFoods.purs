module MyApp.Application.Query.GetFoods
  ( FoodData
  , RetrievalError(..)
  , class GetFoods
  , getFoods
  ) where

import Control.Monad (class Monad)
import Control.Monad.Except (ExceptT)
import Data.DateTime.Instant (Instant)
import Data.HashMap (HashMap)

data RetrievalError = RetrievalError String

type FoodData m = ExceptT RetrievalError m
  ( HashMap String
      { name :: String
      , id :: String
      , expiration :: Instant
      }
  )

class
  Monad m <=
  GetFoods m where
  getFoods
    :: FoodData m


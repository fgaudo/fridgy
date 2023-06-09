module MyApp.Application.Query.GetFoods
  ( FoodData
  , RetrievalError(..)
  , class GetFoods
  , getFoods
  ) where

import Control.Monad (class Monad)
import Data.DateTime.Instant (Instant)
import Data.Either (Either)
import Data.HashMap (HashMap)

data RetrievalError = RetrievalError String

type FoodData =
  Either RetrievalError
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
    :: m FoodData


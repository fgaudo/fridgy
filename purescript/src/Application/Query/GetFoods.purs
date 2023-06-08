module Application.Query.GetFoods where

import Control.Monad (class Monad)
import Data.Either (Either)
import Data.HashMap (HashMap)
import Domain.Food (Food)

data RetrievalError = RetrievalError String

class
  Monad m <=
  GetFoods m where
  getFoods :: m (Either RetrievalError (HashMap String Food))


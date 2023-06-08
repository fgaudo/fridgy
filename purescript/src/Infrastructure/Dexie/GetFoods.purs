module Infrastructure.Dexie.GetFoods
  ( dexieGetFoods
  ) where

import Prelude

import Application.Query.GetFoods (FoodData)
import Data.HashMap (empty)
import Effect.Aff.Class (class MonadAff)

dexieGetFoods
  :: forall m
   . MonadAff m
  => FoodData m
dexieGetFoods =
  do
    pure empty


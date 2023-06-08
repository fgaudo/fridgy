module MyApp.Infrastructure.Dexie.GetFoods
  ( dexieGetFoods
  ) where

import Prelude

import Data.HashMap (empty)
import Effect.Aff.Class (class MonadAff)
import MyApp.Application.Query.GetFoods (FoodData)

dexieGetFoods
  :: forall m
   . MonadAff m
  => FoodData m
dexieGetFoods =
  do
    pure empty


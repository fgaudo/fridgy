module MyApp.Infrastructure.Dexie.GetFoods
  ( dexieGetFoods
  ) where

import Prelude

import Data.Either (Either(..))
import Data.HashMap (empty)
import Effect.Aff.Class (class MonadAff)
import MyApp.Application.Query.GetFoods (FoodData)

dexieGetFoods
  :: forall m
   . MonadAff m
  => m FoodData
dexieGetFoods = pure $ Right empty


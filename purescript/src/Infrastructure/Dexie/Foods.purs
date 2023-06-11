module Infrastructure.Dexie.DexieFoods where

import Prelude

import Application.Stream.Foods (FoodData)
import Data.HashMap (empty)
import Pipes (yield)

foods :: forall m. Monad m => FoodData m
foods = do
  yield empty
  pure unit
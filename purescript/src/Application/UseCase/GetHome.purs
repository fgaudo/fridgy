module MyApp.Application.UseCase.GetHome
  ( getHomeModel
  , FoodModel
  , HomeModel
  , Sort
  , Expiration
  ) where

import Prelude

import Application.Stream.Foods (class Foods, foods)
import Control.Monad.Rec.Class (forever)
import Control.Parallel (class Parallel, parallel, sequential)
import Data.Either (Either(..))
import Data.HashMap (HashMap, empty)
import Data.Tuple (Tuple(..))
import MyApp.Application.Query.GetFoods (class GetFoods, getFoods)
import MyApp.Application.Query.GetNow (class GetNow, getNow)
import Pipes (await, for, yield)
import Pipes.Core (Pipe)

data Expiration = Expired | NotExpired

type FoodModel =
  { name :: String
  , id :: String
  , state :: Expiration
  }

type HomeModel =
  { foods :: HashMap String FoodModel
  }

data Sort = Name | Type

getHomeModel
  :: forall m
   . Foods m
  => Pipe Sort HomeModel m Unit
getHomeModel = forever do
  x <- await
  case x of
    Name -> pure unit
    Type -> pure unit
  pure unit

homeDataToModel :: HomeModel
homeDataToModel =
  { foods: empty
  }

foodDataToModel :: FoodModel
foodDataToModel =

  { id: "Food.id food"
  , name: "Food.name food"
  , state: Expired
  }

retrievalErrorToModel :: forall m. Monad m => String -> m HomeModel
retrievalErrorToModel _ = pure $ { foods: empty }


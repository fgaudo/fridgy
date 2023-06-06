module Application.GetHome
  ( getHomeModel
  , makeRetrievalError
  , RetrievalError
  , HomeData
  , FoodData
  , FoodModel
  , HomeModel
  , Expiration
  , class GetNow
  , getNow
  , class GetHomeData
  , getHomeData
  ) where

import Prelude

import Control.Monad.Except.Checked (ExceptV, handleErrors)
import Control.Monad.Reader (class MonadAsk, ask)
import Data.DateTime.Instant (Instant)
import Data.HashMap (HashMap, empty)
import Data.Traversable (sequence, traverse)
import Data.Tuple (Tuple(..), curry, uncurry)
import Data.Variant (Variant, inj)
import Domain.Food as Food
import Pipes.Prelude (mapM)
import Type.Prelude (Proxy(..))
import Type.Row (type (+))

type FoodData =
  { name :: String
  , id :: String
  , expiration :: Instant
  }

type HomeData =
  { foods :: HashMap String FoodData
  }

data Expiration = Expired | NotExpired

type FoodModel =
  { name :: String
  , id :: String
  , state :: Expiration
  }

type HomeModel =
  { foods :: HashMap String FoodModel
  }

type RetrievalError r = (retrievalError :: String | r)

makeRetrievalError :: forall r. String -> Variant (RetrievalError + r)
makeRetrievalError = inj (Proxy :: Proxy "retrievalError")

{-- Class which defines a generic way to get HomeData.
    It may possibly fail, throwing an error in the Error Monad 
--}
class Monad m <= GetHomeData m where
  getHomeData :: forall r. ExceptV (RetrievalError + r) m HomeData

class Monad m <= GetNow m where
  getNow :: forall r. ExceptV (RetrievalError + r) m Instant

{-- Returns the HomeModel --}
getHomeModel :: forall m. GetHomeData m => GetNow m => m HomeModel
getHomeModel = handleErrors
  { retrievalError:
      retrievalErrorToModel
  }
  getHomeModel'
  where
  getHomeModel' = do
    data' <- Tuple <$> getNow <*> getHomeData
    pure $ uncurry homeDataToModel data'

homeDataToModel :: Instant -> HomeData -> HomeModel
homeDataToModel now { foods } =
  { foods: foodDataToModel now <$> foods
  }

foodDataToModel :: Instant -> FoodData -> FoodModel
foodDataToModel now foodData =
  let
    food = Food.makeFood foodData
  in
    { id: Food.id food
    , name: Food.name food
    , state:
        case
          Food.isExpired now food
          of
          Food.Expired -> Expired
          Food.NotExpired -> NotExpired
          Food.Check -> NotExpired
    }

retrievalErrorToModel :: forall m. Monad m => String -> m HomeModel
retrievalErrorToModel _ = pure $ { foods: empty }


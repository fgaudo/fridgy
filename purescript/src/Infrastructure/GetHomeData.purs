module Infrastructure.GetHomeData (GetHomeDataProd(..), Env) where

import Prelude

import Application.GetHome (class GetHomeData, retrievalError)
import Control.Monad.Error.Class (throwError)
import Control.Monad.Reader (class MonadAsk, ReaderT, ask)
import Data.Newtype (class Newtype)
import Effect.Aff (Aff)
import Effect.Aff.Class (class MonadAff)
import Effect.Class (class MonadEffect)

type Env =
  { param :: String
  }

newtype GetHomeDataProd a = GetHomeDataProd (ReaderT Env Aff a)

derive newtype instance Functor (GetHomeDataProd)
derive newtype instance Apply (GetHomeDataProd)
derive newtype instance Applicative (GetHomeDataProd)
derive newtype instance Bind (GetHomeDataProd)
derive newtype instance Monad (GetHomeDataProd)
derive newtype instance MonadAsk Env (GetHomeDataProd)
derive newtype instance MonadAff (GetHomeDataProd)
derive newtype instance MonadEffect (GetHomeDataProd)
derive instance Newtype (GetHomeDataProd a) _

instance GetHomeData GetHomeDataProd where
  getHomeData = do
    { param } <- ask
    throwError $ retrievalError param

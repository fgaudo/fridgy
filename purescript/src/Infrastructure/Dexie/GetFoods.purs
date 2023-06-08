module Infrastructure.Dexie.GetFoods
  ( DexieGetFoodsT(..)
  , Env
  ) where

import Prelude

import Application.Query.GetFoods (class GetFoods)
import Control.Monad.Reader (class MonadAsk, ReaderT, ask)
import Data.Either (Either(..))
import Data.HashMap (empty)
import Effect.Aff.Class (class MonadAff)
import Effect.Class (class MonadEffect)

type Env =
  { param :: String
  }

newtype DexieGetFoodsT :: forall k. (k -> Type) -> k -> Type
newtype DexieGetFoodsT m a = DexieGetFoodsT (ReaderT Env m a)

derive newtype instance Functor m => Functor (DexieGetFoodsT m)
derive newtype instance Apply m => Apply (DexieGetFoodsT m)
derive newtype instance Applicative m => Applicative (DexieGetFoodsT m)
derive newtype instance Bind m => Bind (DexieGetFoodsT m)
derive newtype instance Monad m => Monad (DexieGetFoodsT m)
derive newtype instance MonadEffect m => MonadEffect (DexieGetFoodsT m)
derive newtype instance MonadAsk Env m => MonadAsk Env (DexieGetFoodsT m)
derive newtype instance MonadAff m => MonadAff (DexieGetFoodsT m)

instance
  ( MonadAff m
  , MonadAsk Env m
  ) =>
  GetFoods (DexieGetFoodsT m) where
  getFoods = do
    _ <- ask
    pure $ Right empty


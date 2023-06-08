module Infrastructure.Generic.GetNow where

import Prelude

import Application.Query.GetNow (class GetNow)
import Data.Either (Either(..))
import Effect.Class (class MonadEffect, liftEffect)
import Effect.Now (now)

newtype GenericGetNowT :: forall k. (k -> Type) -> k -> Type
newtype GenericGetNowT m a = GenericGetNowT (m a)

derive newtype instance Functor m => Functor (GenericGetNowT m)
derive newtype instance Apply m => Apply (GenericGetNowT m)
derive newtype instance Applicative m => Applicative (GenericGetNowT m)
derive newtype instance Bind m => Bind (GenericGetNowT m)
derive newtype instance Monad m => Monad (GenericGetNowT m)
derive newtype instance MonadEffect m => MonadEffect (GenericGetNowT m)

instance
  ( MonadEffect m
  ) =>
  GetNow (GenericGetNowT m) where
  getNow = liftEffect $ map Right now

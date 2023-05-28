{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE Safe #-}
{-# LANGUAGE StandaloneKindSignatures #-}

module Domain
  ( PostEvent (..),
    AccountId (..),
    PostBody (..),
    createPost,
    removePost,
  )
where

import Control.Monad.Except (MonadError (..))
import Data.Foldable (foldl')
import Data.Kind (Type)
import Data.List.NonEmpty (NonEmpty)
import Data.Text (Text)
import Prelude hiding (id)

type AccountId :: Type
newtype AccountId = AccountId Text
  deriving stock (Eq)

newtype PostBody = PostBody Text

type AccountStatus :: Type
data AccountStatus = Active | Inactive

type AccountType :: Type
data AccountType = Mod | Normal

type Account :: Type
data Account = Account
  { status :: AccountStatus,
    id :: AccountId,
    accountType :: AccountType
  }

type PostBody :: Type

type AccountEvent :: Type
data AccountEvent
  = AccountCreated
      { accountId :: AccountId,
        accountType :: AccountType
      }
  | AccountDisabled {accountId :: AccountId}

type PostEvent :: Type
data PostEvent
  = PostCreated AccountId PostBody
  | PostRemoved AccountId

type CreatePostError :: Type
data CreatePostError = AccountHasInvalidState

createPost ::
  MonadError CreatePostError m =>
  NonEmpty AccountEvent ->
  PostBody ->
  m PostEvent
createPost events text =
  let id' = id account
      status' = status account
   in return $ PostCreated id' text
  where
    account = foldAccountState events

type RemovePostError :: Type
data RemovePostError = Unauthorized

removePost ::
  MonadError RemovePostError m =>
  Account ->
  NonEmpty PostEvent ->
  m (Maybe PostEvent)
removePost Account {accountType = Mod, id, status = Active} _ =
  return $ Just $ PostRemoved id
removePost Account {accountType = Normal, id, status = Active} postEvents =
  do
    folded <- return $ foldPostState postEvents
    case folded of
      ActivePost id' _
        | id == id' -> return $ Just $ PostRemoved id
        | otherwise -> throwError Unauthorized
      _ -> return Nothing
removePost Account {status = Inactive} _ = throwError Unauthorized

type PostFoldedState :: Type
data PostFoldedState
  = InitialPost
  | ActivePost AccountId PostBody
  | RemovedPost AccountId AccountId PostBody

foldPostState :: Foldable m => m PostEvent -> PostFoldedState
foldPostState = foldl' reduce InitialPost
  where
    reduce InitialPost (PostCreated uid text) = ActivePost uid text
    reduce (ActivePost creator text) (PostRemoved remover) = RemovedPost creator remover text
    reduce state _ = state

foldAccountState :: Foldable m => m AccountEvent -> Account
foldAccountState = undefined
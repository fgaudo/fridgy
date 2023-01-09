{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE Safe #-}
{-# LANGUAGE StandaloneKindSignatures #-}

module Domain
  ( AccountEvent (..),
    AccountId (..),
    Email (..),
    FirstName (..),
    LastName (..),
    HashedPassword (..),
    DoesAccountEmailExist (..),
    createAccount,
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

type Email :: Type
newtype Email = Email Text
  deriving stock (Eq)

type FirstName :: Type
newtype FirstName = FirstName Text

type LastName :: Type
newtype LastName = LastName Text

type HashedPassword :: Type
newtype HashedPassword = HashedPassword Text
  deriving stock (Eq)

type AccountEvent :: Type
data AccountEvent
  = AccountCreated
      AccountId
      Email
      FirstName
      LastName
      HashedPassword
  | AccountVerified
  | AccountDeleted

loginAccount ::
  MonadError String m =>
  Email ->
  HashedPassword ->
  NonEmpty AccountEvent ->
  m ()
loginAccount email password accountEvents =
  do
    state <- return $ foldAccountState accountEvents
    case state of
      ActiveAccount _ email' _ _ password'
        | email == email' && password == password' -> return ()
        | otherwise -> throwError "ciao"
      DeletedAccount _ _ _ _ _ -> throwError "ciao"
      InactiveAccount _ _ _ _ _ -> throwError "ciao"
      _ -> throwError "ciao"

type CreateAccountError :: Type
data CreateAccountError = AccountAlreadyExists

type DoesAccountEmailExist :: Type
newtype DoesAccountEmailExist = DoesAccountEmailExist Bool

createAccount ::
  MonadError CreateAccountError m =>
  AccountId ->
  Email ->
  FirstName ->
  LastName ->
  HashedPassword ->
  DoesAccountEmailExist ->
  m AccountEvent
createAccount id' email' firstName' lastName' hashedPassword' (DoesAccountEmailExist emailExists)
  | emailExists = throwError AccountAlreadyExists
  | otherwise =
      return $
        AccountCreated
          id'
          email'
          firstName'
          lastName'
          hashedPassword'

type AccountFoldedState :: Type
data AccountFoldedState
  = InitialAccount
  | InactiveAccount AccountId Email FirstName LastName HashedPassword
  | ActiveAccount AccountId Email FirstName LastName HashedPassword
  | DeletedAccount AccountId Email FirstName LastName HashedPassword

foldAccountState :: Foldable m => m AccountEvent -> AccountFoldedState
foldAccountState = foldl' reduce InitialAccount
  where
    reduce
      InitialAccount
      (AccountCreated id email firstName lastName hashedPassword) =
        InactiveAccount id email firstName lastName hashedPassword
    reduce
      (InactiveAccount id email firstName lastName hashedPassword)
      AccountVerified =
        ActiveAccount id email firstName lastName hashedPassword
    reduce
      (ActiveAccount id email firstName lastName hashedPassword)
      AccountDeleted =
        DeletedAccount id email firstName lastName hashedPassword
    reduce state' _ = state'

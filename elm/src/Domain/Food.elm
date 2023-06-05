module Domain.Food exposing (Food, expirationStatus)

import Time


type Result
    = Ok
    | Expired


type FoodId
    = FoodId String


type Food
    = Food
        { name : String
        , id : FoodId
        , expDate : Time.Posix
        }


expirationStatus : Time.Posix -> Food -> Result
expirationStatus expDate (Food food) =
    if (Time.posixToMillis expDate - Time.posixToMillis food.expDate) >= 0 then
        Ok

    else
        Expired

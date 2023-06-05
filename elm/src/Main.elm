module Main exposing (main)

import Presentation.App exposing (view)
import Reader exposing (run)


main : Program () Int Int
main =
    run view ()

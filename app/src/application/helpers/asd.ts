/* eslint-disable functional/no-throw-statements */
import { Apply2, sequenceT } from "fp-ts/lib/Apply";
import { delay } from "fp-ts/lib/Task";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";

const ApplyPar: Apply2<'TaskEither'> = {
  URI: 'TaskEither',
  map: (fa, f) => pipe(fa, TE.map(f)),
  ap: (fab, fa) => pipe(fab, 
    TE.fold((e: E) => {throw e}, (a) => TE.right(a)), 
    TE.ap(
      pipe(
        fa, 
        TE.fold((e) => {throw e}, (a) => TE.right(a))
      )
    ),
    (te) => TE.tryCatch(te, (e) => e as E)
  )
}


const te = sequenceT(ApplyPar)(
  TE.left<string, string>(""),
  pipe(
    TE.right<string, string>(""),
    delay(4000),
  )
)

te().catch(() => {})